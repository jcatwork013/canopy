import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@canopy/shared';
import { AlertTriangle, ArrowRight, Check, ImagePlus, Sparkles, X } from '@/components/icons';
import { Button, cn } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { api } from '@/lib/api';
import { fileToResizedBase64 } from '@/lib/image';

type Health = 'ok' | 'warning' | 'disease' | 'none';
type Msg = { role: 'user' | 'assistant'; content: string; image?: string; health?: Health };

const AI_NAME = 'SynapX Pro AI';

/** The model prefixes condition-related replies with a [[health:..]] marker.
 *  Pull it out so we can render a coloured status badge and a clean body. */
function parseReply(raw: string): { health?: Health; content: string } {
  const m = /^\s*\[\[health:(ok|warning|disease|none)\]\]\s*/i.exec(raw);
  if (!m) return { content: raw.trim() };
  return { health: m[1]!.toLowerCase() as Health, content: raw.slice(m[0].length).trim() };
}

const HEALTH_BADGE: Record<Exclude<Health, 'none'>, { label: string; cls: string; icon: typeof Check }> = {
  ok: { label: 'Cây ổn', cls: 'border-brand-300 bg-brand-50 text-brand-700', icon: Check },
  warning: {
    label: 'Chưa ổn — cần điều chỉnh',
    cls: 'border-amber-300 bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
  disease: {
    label: 'Có dấu hiệu bệnh',
    cls: 'border-red-300 bg-red-50 text-red-700',
    icon: AlertTriangle,
  },
};

/**
 * Chat with the AI about a plant/situation. The user can attach NEW images at
 * any point in the conversation (follow-up photos), which the AI analyses.
 * Persists the conversation to localStorage (per storageKey).
 */
export function ChatPanel({
  storageKey,
  imageBase64,
  mimeType,
  plantName,
  seedQuestions = [],
  intro = `Hỏi ${AI_NAME} về tình trạng cây, cách chữa trị và chăm sóc.`,
}: {
  storageKey: string;
  imageBase64?: string;
  mimeType?: string;
  /** Name of the plant being discussed — shown in the context bar. */
  plantName?: string;
  seedQuestions?: string[];
  intro?: string;
}) {
  // Persistent context so an attached photo reads as "the plant we're discussing"
  // rather than a bare, ambiguous image.
  const plantImage = imageBase64 ? `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` : null;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [attach, setAttach] = useState<{ base64: string; mime: string; dataUrl: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seedImageUsed = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* quota */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, storageKey]);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAttach(await fileToResizedBase64(file));
    } catch {
      /* ignore */
    }
  };

  const send = async (text: string) => {
    const q = text.trim();
    if ((!q && !attach) || pending) return;

    // Image to send this turn: the explicit attachment, else the seed (scan) image once.
    let img: { base64: string; mime: string } | null = attach;
    let display = attach?.dataUrl;
    if (!img && imageBase64 && !seedImageUsed.current) {
      img = { base64: imageBase64, mime: mimeType || 'image/jpeg' };
    }

    const userMsg: Msg = { role: 'user', content: q || '(đã gửi ảnh)', image: display };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setAttach(null);
    setPending(true);
    setError('');
    try {
      const res = await api.ai.chat({
        messages: next.map(({ role, content }) => ({ role, content })),
        ...(img ? { image_base64: img.base64, mime_type: img.mime } : {}),
      });
      if (imageBase64 && img?.base64 === imageBase64) seedImageUsed.current = true;
      const { health, content } = parseReply(res.reply);
      setMessages([...next, { role: 'assistant', content, health }]);
    } catch (e) {
      setMessages(messages); // roll back on failure
      setError(e instanceof ApiError ? e.message : 'Không gửi được, thử lại.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <span className="icon-tile flex h-8 w-8 items-center justify-center rounded-lg">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-none">{AI_NAME}</p>
          <p className="mt-0.5 text-xs text-content-tertiary">Gửi thêm ảnh bất cứ lúc nào</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-xs text-content-tertiary hover:text-danger"
          >
            Xoá
          </button>
        )}
      </div>

      {plantImage && (
        <div className="flex items-center gap-2.5 border-b border-border-subtle bg-subtle/60 px-4 py-2">
          <img src={plantImage} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-content">Đang trao đổi về cây này</p>
            <p className="truncate text-xs text-content-tertiary">
              {plantName ? plantName : 'Cây vừa quét — câu hỏi của bạn sẽ áp cho cây này'}
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="max-h-96 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-content-secondary">{intro}</p>
            {seedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {seedQuestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border-subtle px-3 py-1 text-xs text-content-secondary transition-colors hover:border-brand-400 hover:text-brand-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-subtle text-content',
              )}
            >
              {m.image && (
                <img src={m.image} alt="" className="max-h-44 w-full rounded-lg object-cover" />
              )}
              {m.role === 'assistant' && m.health && m.health !== 'none' && (
                <HealthBadge health={m.health} />
              )}
              {m.role === 'assistant' ? (
                <Markdown text={m.content} />
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-subtle px-3.5 py-2 text-sm text-content-tertiary">
              {AI_NAME} đang phân tích…
            </div>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* attachment preview */}
      {attach && (
        <div className="flex items-center gap-2 border-t border-border-subtle px-3 pt-2">
          <div className="relative">
            <img src={attach.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <button
              onClick={() => setAttach(null)}
              aria-label="Bỏ ảnh"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="text-xs text-content-tertiary">Ảnh sẽ gửi kèm câu hỏi</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border-subtle p-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Đính ảnh"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-content-secondary hover:bg-subtle hover:text-content"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          className="h-10 flex-1 rounded-lg border border-border-subtle bg-input px-3 text-sm text-content placeholder:text-content-tertiary focus-visible:border-brand-500 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        />
        <Button type="submit" size="icon" disabled={pending || (!input.trim() && !attach)} aria-label="Gửi">
          <ArrowRight className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}

function HealthBadge({ health }: { health: Exclude<Health, 'none'> }) {
  const b = HEALTH_BADGE[health];
  const Icon = b.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', b.cls)}>
      <Icon className="h-3.5 w-3.5" />
      {b.label}
    </span>
  );
}
