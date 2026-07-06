import type { ReactNode } from 'react';
import { cn } from '@/components/ui';

/**
 * Tiny, dependency-free Markdown renderer for AI replies. It handles the subset
 * the model actually emits — headings (# … ######), unordered/ordered lists,
 * blockquotes, horizontal rules, paragraphs, and inline ***bold-italic***,
 * **bold**, *italic*, `code` — and, crucially, NEVER leaks raw markers: any
 * stray `**`, `__`, `###` a model drops mid-sentence is stripped rather than
 * shown. Output is plain React nodes (no dangerouslySetInnerHTML), so there is
 * no HTML-injection risk.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isSpecial = (t: string) =>
    t === '' ||
    /^#{1,6}\s+/.test(t) ||
    /^[-*•+]\s+/.test(t) ||
    /^\d+[.)]\s+/.test(t) ||
    /^>\s?/.test(t) ||
    isHr(t);

  while (i < lines.length) {
    const t = lines[i]!.trim();
    if (t === '') {
      i++;
      continue;
    }

    // Horizontal rule (---, ***, ___) → a light divider.
    if (isHr(t)) {
      blocks.push(<hr key={key++} className="my-1 border-t border-current/15" />);
      i++;
      continue;
    }

    // Headings — up to 6 hashes. Everything is rendered small (chat-scale); the
    // point is hierarchy, not giant text.
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      const lvl = h[1]!.length;
      blocks.push(
        <p
          key={key++}
          className={cn(
            'mt-1.5 first:mt-0',
            lvl <= 1 ? 'text-base font-bold' : lvl === 2 ? 'text-sm font-bold' : 'text-sm font-semibold',
          )}
        >
          {renderInline(h[2] ?? '')}
        </p>,
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(t)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!.trim())) {
        quote.push(lines[i]!.trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <p key={key++} className="border-l-2 border-current/30 pl-2.5 text-xs italic opacity-80">
          {renderInline(quote.join(' '))}
        </p>,
      );
      continue;
    }

    if (/^[-*•+]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•+]\s+/.test(lines[i]!.trim())) {
        items.push(lines[i]!.trim().replace(/^[-*•+]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(t)) {
      const nums: string[] = [];
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i]!.trim())) {
        const mm = /^(\d+)[.)]\s+(.*)$/.exec(lines[i]!.trim())!;
        nums.push(mm[1] ?? '');
        items.push(mm[2] ?? '');
        i++;
      }
      blocks.push(
        <ol key={key++} className="space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="shrink-0 font-semibold opacity-70">{nums[idx]}.</span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // paragraph — join wrapped lines until a blank/special line.
    const para: string[] = [];
    while (i < lines.length && !isSpecial(lines[i]!.trim())) {
      para.push(lines[i]!.trim());
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(para.join(' '))}
      </p>,
    );
  }

  return <div className={cn('space-y-2', className)}>{blocks}</div>;
}

/** A line that is only ---, ***, ___ (3+), optionally spaced. */
function isHr(t: string): boolean {
  return /^\s*([-*_])(\s*\1){2,}\s*$/.test(t);
}

/**
 * Strip markdown noise from a plain text run: orphaned bold/italic markers
 * (doubled or tripled asterisks / underscores) and stray leading hashes the
 * block parser didn't consume. A legit single `*` (e.g. "3*4") is left alone.
 */
function stripStray(s: string): string {
  return s
    .replace(/\*{2,}|_{2,}/g, '') // orphaned **, ***, __
    .replace(/(^|\s)#{1,6}(?=\s)/g, '$1'); // stray hashes mid-text
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: triple (bold+italic) before double before single.
  const re =
    /(\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_|`([^`]+)`)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  const pushText = (raw: string) => {
    const clean = stripStray(raw);
    if (clean) nodes.push(clean);
  };
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) pushText(text.slice(last, m.index));
    if (m[2] !== undefined)
      nodes.push(
        <strong key={k++} className="italic">
          {m[2]}
        </strong>,
      );
    else if (m[3] !== undefined)
      nodes.push(
        <strong key={k++} className="italic">
          {m[3]}
        </strong>,
      );
    else if (m[4] !== undefined) nodes.push(<strong key={k++}>{m[4]}</strong>);
    else if (m[5] !== undefined) nodes.push(<strong key={k++}>{m[5]}</strong>);
    else if (m[6] !== undefined) nodes.push(<em key={k++}>{m[6]}</em>);
    else if (m[7] !== undefined) nodes.push(<em key={k++}>{m[7]}</em>);
    else if (m[8] !== undefined)
      nodes.push(
        <code key={k++} className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10">
          {m[8]}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) pushText(text.slice(last));
  return nodes;
}
