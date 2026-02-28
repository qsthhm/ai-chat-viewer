/**
 * Lightweight Markdown → HTML renderer.
 * Runs client-side only.
 */

function esc(t: string): string {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function inline(t: string): string {
  if (!t) return '';
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
  t = t.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:0.3rem 0;display:block" loading="lazy">'
  );
  t = t.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  return t;
}

export function mdToHtml(src: string): string {
  if (!src) return '';

  const tokens: string[] = [];
  let rest = src;

  // Code blocks
  rest = rest.replace(/(`{3,})(\w*)\n([\s\S]*?)\1/g, (_, _ticks, lang, code) => {
    const trimmed = code.trim();
    const toolPats = ['Tool:', 'Searching project', 'View:', 'Bash Tool:', 'Create File:', 'Edit:', 'Bash:', 'Search:', 'Run:'];
    const isTool = (lang === 'plaintext' || lang === '') && toolPats.some(p => trimmed.startsWith(p) || trimmed.includes(p));
    if (isTool) {
      const id = `__TOK${tokens.length}__`;
      tokens.push(
        `<div class="tool-block"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 flex-shrink-0 text-surface-500"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg><span>${esc(trimmed)}</span></div>`
      );
      return id;
    }
    const id = `__TOK${tokens.length}__`;
    tokens.push(`<pre class="code-block"><code>${esc(code.trimEnd())}</code></pre>`);
    return id;
  });

  // Tables
  rest = rest.replace(
    /((?:^|\n)\|.+\|[ \t]*\n\|[\s\-:|]+\|[ \t]*\n(?:\|.+\|[ \t]*\n?)*)/g,
    (block) => {
      const rows = block.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return block;
      if (!/^\|[\s\-:|]+\|$/.test(rows[1].trim())) return block;
      const parseRow = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());
      const headers = parseRow(rows[0]);
      const bodyRows = rows.slice(2);
      let h = '<div class="tbl-wrap"><table><thead><tr>';
      headers.forEach(c => (h += `<th>${inline(c)}</th>`));
      h += '</tr></thead><tbody>';
      bodyRows.forEach(r => {
        const cells = parseRow(r);
        h += '<tr>';
        cells.forEach(c => (h += `<td>${inline(c)}</td>`));
        h += '</tr>';
      });
      h += '</tbody></table></div>';
      const id = `__TOK${tokens.length}__`;
      tokens.push(h);
      return '\n' + id + '\n';
    }
  );

  const lines = rest.split('\n');
  const out: string[] = [];
  const listStack: string[] = [];
  let bqBuf: string[] = [];

  function flushBq() {
    if (!bqBuf.length) return;
    out.push('<blockquote>' + bqBuf.map(l => `<p>${inline(l)}</p>`).join('') + '</blockquote>');
    bqBuf = [];
  }

  function closeListsTo(d: number) {
    while (listStack.length > d) out.push(listStack.pop() === 'ul' ? '</ul>' : '</ol>');
  }

  function closeAllLists() { closeListsTo(0); }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/__TOK\d+__/.test(line)) {
      flushBq(); closeAllLists();
      line = line.replace(/__TOK(\d+)__/g, (_, idx) => tokens[+idx]);
      out.push(line);
      continue;
    }

    if (/^-{3,}$/.test(line.trim())) { flushBq(); closeAllLists(); out.push('<hr>'); continue; }

    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) { flushBq(); closeAllLists(); out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); continue; }

    if (/^>\s?/.test(line)) { closeAllLists(); bqBuf.push(line.replace(/^>\s?/, '')); continue; }
    else if (bqBuf.length) flushBq();

    const ulm = line.match(/^(\s*)([-*+])\s+(.+)/);
    const olm = !ulm ? line.match(/^(\s*)(\d+)\.\s+(.+)/) : null;

    if (ulm || olm) {
      flushBq();
      const match = (ulm || olm)!;
      const indent = match[1].length;
      const depth = Math.floor(indent / 2) + 1;
      const type = ulm ? 'ul' : 'ol';
      const content = match[3];
      while (listStack.length < depth) { out.push(type === 'ul' ? '<ul>' : '<ol>'); listStack.push(type); }
      if (listStack.length > depth) closeListsTo(depth);
      out.push(`<li>${inline(content)}</li>`);
      continue;
    }

    if (!line.trim()) {
      if (listStack.length) {
        const next = lines[i + 1] || '';
        if (!next.match(/^\s*[-*+]\s/) && !next.match(/^\s*\d+\.\s/)) closeAllLists();
      }
      continue;
    }

    closeAllLists();
    out.push(`<p>${inline(line)}</p>`);
  }

  flushBq();
  closeAllLists();
  return out.join('\n');
}
