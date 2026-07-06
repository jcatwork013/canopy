import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@canopy/shared';
import { AlertTriangle, ArrowRight, Check, Copy, ImagePlus, Sparkles, X } from '@/components/icons';
import { Button, cn } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { api } from '@/lib/api';
import { fileToResizedBase64 } from '@/lib/image';

type Health = 'ok' | 'warning' | 'disease' | 'none';
type Msg = { role: 'user' | 'assistant'; content: string; image?: string; health?: Health; at?: number };

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

const fmtTime = (at?: number) =>
  at ? new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

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
  memory,
  seedQuestions = [],
  intro = `Hỏi ${AI_NAME} về tình trạng cây, cách chữa trị và chăm sóc.`,
  heightClass = 'max-h-96',
}: {
  storageKey: string;
  imageBase64?: string;
  mimeType?: string;
  /** Name of the plant being discussed — shown in the context bar. */
  plantName?: string;
  /** Prior check-in history for this exact plant, injected as AI context so the
   *  assistant "remembers" past checks. Built via journal.buildMemory(). */
  memory?: string;
  seedQuestions?: string[];
  intro?: string;
  /** Scroll region height (Tailwind class). Larger for full-screen chat. */
  heightClass?: string;
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
  const [copied, setCopied] = useState<number | null>(null);
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

  const copy = async (text: string, i: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const send = async (text: string) => {
    const q = text.trim();
    if ((!q && !attach) || pending) return;

    // Image to send this turn: the explicit attachment, else the seed (scan) image once.
    let img: { base64: string; mime: string } | null = attach;
    const display = attach?.dataUrl;
    if (!img && imageBase64 && !seedImageUsed.current) {
      img = { base64: imageBase64, mime: mimeType || 'image/jpeg' };
    }

    const userMsg: Msg = { role: 'user', content: q || '(đã gửi ảnh)', image: display, at: Date.now() };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setAttach(null);
    setPending(true);
    setError('');
    try {
      // Prepend the plant's history as a leading context turn (not shown in the
      // UI) so the model answers with memory of past check-ins.
      const convo = next.map(({ role, content }) => ({ role, content }));
      const payloadMsgs = memory
        ? [{ role: 'user' as const, content: memory }, ...convo]
        : convo;
      const res = await api.ai.chat({
        messages: payloadMsgs,
        ...(img ? { image_base64: img.base64, mime_type: img.mime } : {}),
      });
      if (imageBase64 && img?.base64 === imageBase64) seedImageUsed.current = true;
      const { health, content } = parseReply(res.reply);
      setMessages([...next, { role: 'assistant', content, health, at: Date.now() }]);
    } catch (e) {
      setMessages(messages); // roll back on failure
      setError(e instanceof ApiError ? e.message : 'Không gửi được, thử lại.');
    } finally {
      setPending(false);
    }
  };

  const showSuggestions = seedQuestions.length > 0 && messages.length === 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
      {/* Header — brand gradient with a live status dot. */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundImage: 'var(--grad-brand)' }}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-none">
            {AI_NAME}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Trực tuyến · gửi ảnh bất cứ lúc nào
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/25"
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

      <div ref={scrollRef} className={cn('space-y-3 overflow-y-auto px-4 py-4', heightClass)}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-2xl">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="max-w-xs text-sm text-content-secondary">{intro}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('group flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('flex max-w-[86%] flex-col gap-1', m.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                  m.role === 'user'
                    ? 'rounded-br-md bg-brand-600 text-white'
                    : 'rounded-bl-md border border-border-subtle bg-surface text-content',
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
              <div
                className={cn(
                  'flex items-center gap-2 px-1 text-[10px] text-content-tertiary',
                  m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {m.at && <span>{fmtTime(m.at)}</span>}
                {m.role === 'assistant' && (
                  <button
                    onClick={() => copy(m.content, i)}
                    className="flex items-center gap-1 opacity-0 transition-opacity hover:text-content-secondary group-hover:opacity-100"
                    aria-label="Sao chép"
                  >
                    {copied === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === i ? 'Đã chép' : 'Chép'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border-subtle bg-surface px-4 py-3 shadow-sm">
              <span className="dot-typing" />
              <span className="dot-typing" style={{ animationDelay: '0.15s' }} />
              <span className="dot-typing" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* Persistent suggestion chips (before the conversation starts). */}
      {showSuggestions && (
        <div className="flex gap-2 overflow-x-auto border-t border-border-subtle px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {seedQuestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="shrink-0 whitespace-nowrap rounded-full border border-border-subtle bg-subtle/60 px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-content-secondary transition-colors hover:bg-subtle hover:text-content"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          className="h-11 flex-1 rounded-lg border border-border-subtle bg-input px-3 text-base text-content placeholder:text-content-tertiary focus-visible:border-brand-500 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
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
