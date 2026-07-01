import type { ReactNode } from 'react';
import { cn } from '@/components/ui';

/**
 * Tiny, dependency-free Markdown renderer for AI replies. Handles the subset the
 * model actually emits: headings (#, ##, ###), unordered/ordered lists, block-
 * quotes, paragraphs, and inline **bold** / *italic* / `code`. Output is plain
 * React nodes (no dangerouslySetInnerHTML), so there is no HTML-injection risk.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isSpecial = (t: string) =>
    t === '' ||
    /^#{1,3}\s+/.test(t) ||
    /^[-*•]\s+/.test(t) ||
    /^\d+[.)]\s+/.test(t) ||
    /^>\s?/.test(t);

  while (i < lines.length) {
    const t = lines[i]!.trim();
    if (t === '') {
      i++;
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      const lvl = h[1]!.length;
      blocks.push(
        <p
          key={key++}
          className={cn(
            'mt-1 first:mt-0',
            lvl === 1 ? 'text-base font-bold' : lvl === 2 ? 'text-sm font-bold' : 'text-sm font-semibold',
          )}
        >
          {renderInline(h[2] ?? '')}
        </p>,
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(t)) {
      blocks.push(
        <p key={key++} className="border-l-2 border-current/30 pl-2.5 text-xs italic opacity-80">
          {renderInline(t.replace(/^>\s?/, ''))}
        </p>,
      );
      i++;
      continue;
    }

    if (/^[-*•]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i]!.trim())) {
        items.push(lines[i]!.trim().replace(/^[-*•]\s+/, ''));
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

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<strong key={k++}>{m[3]}</strong>);
    else if (m[4] !== undefined) nodes.push(<em key={k++}>{m[4]}</em>);
    else if (m[5] !== undefined)
      nodes.push(
        <code key={k++} className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10">
          {m[5]}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
