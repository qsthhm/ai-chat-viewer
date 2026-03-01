/**
 * Lightweight Markdown → HTML renderer.
 * Runs client-side only.
 */

function esc(t: string): string {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function imgTag(url: string, alt: string = ''): string {
  const isGoogle = /lh[0-9]*\.googleusercontent\.com\/gg\//.test(url);

  if (isGoogle) {
    // Gemini /gg/ images require Google login — browser can't load them cross-site
    // (third-party cookies blocked). Render a clickable card that opens the original.
    const safeUrl = esc(url);
    return [
      `<a href="${safeUrl}" target="_blank" rel="noopener" class="gimg-card" title="${alt || '点击查看原图'}">`,
        `<span class="gimg-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></span>`,
        `<span class="gimg-text">`,
          `<span class="gimg-title">Gemini 图片 — 点击查看</span>`,
          `<span class="gimg-sub">需登录 Google 账号，将在新标签页打开</span>`,
        `</span>`,
        `<span class="gimg-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>`,
      `</a>`,
    ].join('');
  }

  // Non-Google images: render normally
  return `<img src="${esc(url)}" alt="${esc(alt)}" class="chat-img" loading="lazy" referrerpolicy="no-referrer">`;
}

function inline(t: string): string {
  if (!t) return '';
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Images - support both markdown images and plain image URLs
  t = t.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) => imgTag(url, alt)
  );
  // Bare image URLs (common in Gemini exports)
  t = t.replace(
    /(?<![("=])(https?:\/\/[^\s<>"]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"]*)?)/gi,
    (_, url) => imgTag(url)
  );
  // Google generated content URLs (Gemini images) - not ending in image extension
  t = t.replace(
    /(?<![("=<])(https?:\/\/lh[0-9]*\.googleusercontent\.com\/[^\s<>"]+)/g,
    (match) => {
      if (match.includes('<img') || match.includes('src=')) return match;
      return imgTag(match);
    }
  );
  // Links
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

  // Standalone image blocks (line is just an image URL or markdown image)
  rest = rest.replace(
    /^(!\[[^\]]*\]\([^)]+\))$/gm,
    (match) => {
      const id = `__TOK${tokens.length}__`;
      tokens.push(`<div class="img-block">${inline(match)}</div>`);
      return id;
    }
  );

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
