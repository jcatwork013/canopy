import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminAIProvider, AIProviderType } from '@canopy/shared';
import { useMutation } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  cn,
} from '@/components/ui';
import { Sparkles, X } from '@/components/icons';
import { api } from '@/lib/api';
import { AI_PROVIDERS, PROVIDER_TYPES, modelOptions, pickBestModel } from '../aiCatalog';
import { useAdminConfig, useAdminRefresh } from '../useAdmin';

export function AISection() {
  const cfg = useAdminConfig();
  const refresh = useAdminRefresh();
  const providers = cfg.data?.providers ?? [];

  const [provider, setProvider] = useState<AIProviderType>('gemini');
  const meta = AI_PROVIDERS[provider];

  const existing = providers.find((p) => p.type === provider);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(meta.defaultModel);
  const [enabled, setEnabled] = useState(true);
  const [liveModels, setLiveModels] = useState<string[]>([]);

  // Seed the form from the saved provider once config loads (so saving an
  // already-configured provider never silently downgrades its model).
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (existing && seededRef.current !== existing.id) {
      seededRef.current = existing.id;
      setModel(existing.model || meta.defaultModel);
      setEnabled(existing.enabled);
    }
  }, [existing, meta.defaultModel]);

  const switchProvider = (next: AIProviderType) => {
    setProvider(next);
    const ex = providers.find((p) => p.type === next);
    seededRef.current = ex?.id ?? null;
    setApiKey('');
    setModel(ex?.model || AI_PROVIDERS[next].defaultModel);
    setEnabled(ex ? ex.enabled : true);
    setLiveModels([]);
    verify.reset();
  };

  const verify = useMutation({
    mutationFn: () => api.admin.verifyAI({ provider, api_key: apiKey || undefined }),
    onSuccess: (res) => {
      if (res.ok) setLiveModels(res.models);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (existing) {
        await api.admin.updateProvider(existing.id, {
          model,
          enabled,
          api_key: apiKey || undefined,
        });
        await api.admin.setDefaultProvider(existing.id);
      } else {
        const { id } = await api.admin.createProvider({
          name: meta.providerName,
          type: provider,
          api_key: apiKey,
          model,
          enabled,
        });
        await api.admin.setDefaultProvider(id);
      }
    },
    onSuccess: () => {
      setApiKey('');
      refresh();
    },
  });

  const options = useMemo(() => modelOptions(meta, liveModels, model), [meta, liveModels, model]);
  const best = useMemo(() => pickBestModel(meta, liveModels), [meta, liveModels]);
  const keyAlreadySet = existing?.key_set && !apiKey;
  const canSave = (apiKey.length > 0 || keyAlreadySet) && model.length > 0;
  const verified = verify.data?.ok && liveModels.length > 0;

  return (
    <div className="space-y-6">
      {providers.length > 0 && <ProviderList providers={providers} refresh={refresh} />}

      <Card>
        <CardHeader>
          <CardTitle>Cấu hình nhà cung cấp AI</CardTitle>
          <CardDescription>
            Kiểm tra API key, chọn model mới nhất key của bạn hỗ trợ, rồi đặt làm mặc định.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider segmented control */}
          <div>
            <Label className="mb-1.5">Nhà cung cấp</Label>
            <div className="inline-flex rounded-lg border border-border-subtle bg-subtle p-1">
              {PROVIDER_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchProvider(t)}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                    provider === t
                      ? 'bg-surface text-content shadow-sm'
                      : 'text-content-secondary hover:text-content',
                  )}
                >
                  {AI_PROVIDERS[t].label}
                  {providers.some((p) => p.type === t) && (
                    <span className="ml-1.5 text-xs text-brand-600">●</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API key + verify */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="ai-key"
                type="password"
                autoComplete="off"
                placeholder={keyAlreadySet ? existing!.key_masked : meta.keyPlaceholder}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => verify.mutate()}
                disabled={verify.isPending || (!apiKey && !existing?.key_set)}
              >
                {verify.isPending ? 'Đang kiểm tra…' : 'Kiểm tra key'}
              </Button>
            </div>
            <p className="text-xs text-content-tertiary">
              {meta.keyHint}{' '}
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 underline-offset-2 hover:underline"
              >
                Lấy key
              </a>
            </p>
            {verify.data && !verify.data.ok && (
              <p className="flex items-center gap-1.5 text-sm text-danger">
                <X className="h-4 w-4" />
                {verify.data.detail || 'Key không hợp lệ'}
              </p>
            )}
          </div>

          {/* Model recommendation — clarifies which model the key actually unlocks */}
          {verified && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-1.5 text-brand-700">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Model đề xuất</span>
              </div>
              <p className="mt-1.5 text-sm text-content">
                Key của bạn truy cập được <b>{liveModels.length}</b> model. Mới &amp; mạnh nhất:{' '}
                <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-brand-700">{best}</code>
              </p>
              {existing && existing.model !== best && (
                <p className="mt-1 text-xs text-content-secondary">
                  Bạn đang lưu <code className="font-mono">{existing.model}</code> — nên nâng cấp.
                </p>
              )}
              {model !== best && (
                <Button size="sm" className="mt-3" onClick={() => setModel(best)}>
                  <Sparkles className="h-4 w-4" />
                  Dùng {best}
                </Button>
              )}
            </div>
          )}

          {/* Model picker */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>Model đang chọn</Label>
              <code className="font-mono text-sm font-semibold text-content">{model || '—'}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.slice(0, 10).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    m === model
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-border-subtle text-content-secondary hover:border-border-strong hover:text-content',
                  )}
                >
                  {m === best && verified && <Sparkles className="h-3 w-3" />}
                  {m}
                </button>
              ))}
            </div>
            <Input
              aria-label="Model ID tùy chỉnh"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Hoặc nhập model ID"
            />
            {!verified && (
              <p className="text-xs text-content-tertiary">
                Nhấn “Kiểm tra key” để tải danh sách model thật và chọn bản mới nhất.
              </p>
            )}
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between rounded-lg border border-border-subtle px-4 py-3">
            <div>
              <p className="text-sm font-medium text-content">Kích hoạt</p>
              <p className="text-xs text-content-tertiary">Cho phép hệ thống gọi nhà cung cấp này.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Kích hoạt provider" />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
              {save.isPending
                ? 'Đang lưu…'
                : save.isSuccess
                  ? 'Đã lưu ✓'
                  : existing
                    ? 'Cập nhật & đặt mặc định'
                    : 'Lưu & đặt mặc định'}
            </Button>
            {save.isError && <p className="text-sm text-danger">Lưu thất bại, thử lại.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderList({
  providers,
  refresh,
}: {
  providers: AdminAIProvider[];
  refresh: () => void;
}) {
  const setDefault = useMutation({
    mutationFn: (id: string) => api.admin.setDefaultProvider(id),
    onSuccess: refresh,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhà cung cấp đã cấu hình</CardTitle>
        <CardDescription>Mặc định là nhà cung cấp được dùng cho mọi tính năng AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-content">{p.name}</span>
                {p.is_default && <Badge variant="brand">Mặc định</Badge>}
                <Badge variant={p.enabled ? 'success' : 'muted'}>
                  {p.enabled ? 'Đang bật' : 'Tắt'}
                </Badge>
              </div>
              <p className="truncate text-xs text-content-tertiary">
                <code className="font-mono">{p.model}</code> · key {p.key_set ? p.key_masked : 'chưa đặt'}
              </p>
            </div>
            {!p.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDefault.mutate(p.id)}
                disabled={setDefault.isPending}
              >
                Đặt mặc định
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
