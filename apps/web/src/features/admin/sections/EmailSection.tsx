import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui';
import { Check, X } from '@/components/icons';
import { api } from '@/lib/api';
import { useAdminConfig, useAdminRefresh } from '../useAdmin';

export function EmailSection() {
  const cfg = useAdminConfig();
  const refresh = useAdminRefresh();
  const email = cfg.data?.email;

  const [key, setKey] = useState('');
  const [from, setFrom] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.admin.putConfig({
        ...(key ? { resend_api_key: key } : {}),
        ...(from ? { resend_from: from } : {}),
      }),
    onSuccess: () => {
      setKey('');
      refresh();
    },
  });

  const test = useMutation({
    mutationFn: () => api.admin.testConnection('email', { api_key: key || undefined }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email — Resend</CardTitle>
        <CardDescription>Dùng để gửi email xác minh, đặt lại mật khẩu và thông báo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          <Label htmlFor="resend-key">Resend API Key</Label>
          <div className="flex gap-2">
            <Input
              id="resend-key"
              type="password"
              autoComplete="off"
              placeholder={email?.resend_api_key.set ? email.resend_api_key.masked : 're_…'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => test.mutate()}
              disabled={test.isPending || (!key && !email?.resend_api_key.set)}
            >
              {test.isPending ? 'Đang test…' : 'Test'}
            </Button>
          </div>
          {test.data && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                test.data.ok ? 'text-brand-700' : 'text-danger'
              }`}
            >
              {test.data.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {test.data.ok ? 'Kết nối thành công' : test.data.detail || 'Thất bại'}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resend-from">Người gửi (From)</Label>
          <Input
            id="resend-from"
            placeholder={email?.resend_from || 'Canopy <no-reply@domain>'}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          onClick={() => save.mutate()}
          disabled={(!key && !from) || save.isPending}
        >
          {save.isPending ? 'Đang lưu…' : save.isSuccess ? 'Đã lưu ✓' : 'Lưu'}
        </Button>
      </CardContent>
    </Card>
  );
}
