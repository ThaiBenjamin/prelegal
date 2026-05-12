/**
 * Tiny markdown renderer specialized for the Common Paper templates.
 *
 * The templates use a constrained subset:
 *   - "# Title" on the first line
 *   - Outer numbered list (`N. ...`)
 *   - Nested numbered list, indented 4 spaces (`    N. ...`)
 *   - Alpha sub-list, indented 8 spaces (`        a. ...`)
 *   - Inline `<span class="...">text</span>` for fillable terms (we strip
 *     the span but keep the text and italicize it)
 *   - **bold** runs and link-like `<https://...>` tokens
 *
 * We don't need a full CommonMark parser; this gets us readable output for
 * all 12 templates without adding a dependency.
 */

import type { ReactNode } from "react";

type ParsedLine =
  | { kind: "h1"; text: string }
  | { kind: "item"; depth: 0 | 1 | 2; marker: string; text: string }
  | { kind: "blank" };

const ITEM_RE = /^(\s*)([0-9]+|[a-z])\.\s+(.*)$/;
const HEADING_RE = /^#\s+(.*)$/;

function parseLine(line: string): ParsedLine {
  if (line.trim() === "") return { kind: "blank" };
  const h = line.match(HEADING_RE);
  if (h) return { kind: "h1", text: h[1] };
  const m = line.match(ITEM_RE);
  if (m) {
    const indent = m[1].length;
    const depth = (indent >= 8 ? 2 : indent >= 4 ? 1 : 0) as 0 | 1 | 2;
    return { kind: "item", depth, marker: m[2], text: m[3] };
  }
  // Loose paragraph; treat as a depth-0 item without a marker so we don't
  // lose content that doesn't fit the standard structure.
  return { kind: "item", depth: 0, marker: "", text: line.trim() };
}

// Strip <span ...>inner</span> wrappers, replacing with a plain marker that
// we can convert to a React element later. We keep the inner text.
const SPAN_RE = /<span[^>]*>([\s\S]*?)<\/span>/g;

// Parse `**bold**` and the residual text into React children.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // First, strip span wrappers but keep the text inside.
  const stripped = text.replace(SPAN_RE, (_, inner: string) => inner);

  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < stripped.length) {
    const start = stripped.indexOf("**", i);
    if (start === -1) {
      parts.push(stripped.slice(i));
      break;
    }
    if (start > i) parts.push(stripped.slice(i, start));
    const end = stripped.indexOf("**", start + 2);
    if (end === -1) {
      parts.push(stripped.slice(start));
      break;
    }
    const inner = stripped.slice(start + 2, end);
    parts.push(<strong key={`${keyPrefix}-${key++}`}>{inner}</strong>);
    i = end + 2;
  }
  return parts;
}

export function renderStandardTermsMarkdown(md: string): ReactNode {
  const lines = md.split(/\r?\n/);
  const parsed = lines.map(parseLine);

  const output: ReactNode[] = [];
  let title: string | null = null;
  let pending: { depth: 0 | 1 | 2; marker: string; text: string }[] = [];

  const flushPending = () => {
    if (pending.length === 0) return;
    const items = pending.map((p, idx) => {
      const indent = p.depth === 0 ? "0" : p.depth === 1 ? "1.5rem" : "3rem";
      return (
        <div
          key={`item-${output.length}-${idx}`}
          style={{ marginLeft: indent, marginBottom: "0.4rem" }}
        >
          {p.marker && (
            <span style={{ fontWeight: 600 }}>{p.marker}. </span>
          )}
          {renderInline(p.text, `inline-${output.length}-${idx}`)}
        </div>
      );
    });
    output.push(
      <div key={`group-${output.length}`} style={{ marginBottom: "0.6rem" }}>
        {items}
      </div>,
    );
    pending = [];
  };

  for (const line of parsed) {
    if (line.kind === "h1") {
      flushPending();
      title = line.text;
      continue;
    }
    if (line.kind === "blank") {
      flushPending();
      continue;
    }
    pending.push(line);
  }
  flushPending();

  return (
    <div className="space-y-2 text-[10pt] leading-snug">
      {title && (
        <h1 className="text-center text-lg font-bold">{title}</h1>
      )}
      {output}
    </div>
  );
}
