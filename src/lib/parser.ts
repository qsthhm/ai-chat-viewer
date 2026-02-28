import { ParsedChat, ChatTurn } from '@/types';

export function detectAndParse(raw: string, filename?: string): ParsedChat {
  // Try JSON first
  if (filename?.endsWith('.json') || raw.trim().startsWith('{')) {
    try {
      const j = JSON.parse(raw);
      return parseGeminiJson(j);
    } catch { /* not json */ }
  }
  // ChatGPT MD format
  if (/^\*\*You:\*\*/.test(raw.trim()) || /^\*\*ChatGPT:\*\*/.test(raw.trim())) {
    return parseChatGptMd(raw);
  }
  // Claude/Gemini MD format
  if (/^## Prompt:/m.test(raw)) {
    return parseClaudeGeminiMd(raw);
  }
  // Fallback
  return {
    title: '对话',
    created: '',
    link: '',
    source: 'unknown',
    turns: [{ role: 'assistant', ts: '', content: raw }],
  };
}

function parseGeminiJson(j: Record<string, unknown>): ParsedChat {
  const m = (j.metadata || {}) as Record<string, unknown>;
  const dates = (m.dates || {}) as Record<string, string>;
  const title = (m.title as string) || '对话';
  const created = dates.exported || '';
  const link = (m.link as string) || '';
  const messages = (j.messages || []) as Array<{ role: string; say?: string }>;
  const turns: ChatTurn[] = messages.map((msg) => {
    const role = msg.role === 'Prompt' ? 'user' : 'assistant';
    let content = (msg.say || '').replace(/^Gemini 说\s*/, '');
    return { role, ts: '', content: content.trim() };
  });
  return { title, created, link, source: 'gemini', turns };
}

function parseChatGptMd(md: string): ParsedChat {
  const turns: ChatTurn[] = [];
  const blocks = md.split(/(?=\*\*(?:You|ChatGPT):\*\*)/);
  for (const block of blocks) {
    const userM = block.match(/^\*\*You:\*\*\s*([\s\S]*)/);
    const gptM = block.match(/^\*\*ChatGPT:\*\*\s*([\s\S]*)/);
    if (userM) {
      let body = userM[1]
        .replace(/^[\s\n]*\*\s*\*\s*\*[\s\n]*/, '')
        .replace(/^[\s\n]*---[\s\n]*/, '')
        .trim();
      turns.push({ role: 'user', ts: '', content: body });
    } else if (gptM) {
      let body = gptM[1]
        .replace(/^[\s\n]*\*\s*\*\s*\*[\s\n]*/, '')
        .replace(/^[\s\n]*---[\s\n]*/, '')
        .replace(/[\s\n]*\*\s*\*\s*\*\s*$/, '')
        .replace(/[\s\n]*---\s*$/, '')
        .trim();
      turns.push({ role: 'assistant', ts: '', content: body });
    }
  }
  return {
    title: turns[0]?.content?.slice(0, 40) || '对话',
    created: '',
    link: '',
    source: 'chatgpt',
    turns,
  };
}

function parseClaudeGeminiMd(md: string): ParsedChat {
  const titleM = md.match(/^#\s+(.+)$/m);
  const createdM = md.match(/\*\*Created:\*\*\s+(.+)/);
  const exportedM = md.match(/\*\*Exported:\*\*\s+(.+)/);
  const linkM = md.match(/\*\*Link:\*\*\s+\[.+?\]\((.+?)\)/);
  const title = titleM ? titleM[1].trim() : '对话';
  const created = createdM ? createdM[1].trim() : exportedM ? exportedM[1].trim() : '';
  const link = linkM ? linkM[1] : '';

  let source: ParsedChat['source'] = 'claude';
  if (link.includes('gemini.google.com') || /Gemini Exporter/i.test(md)) source = 'gemini';

  const turns: ChatTurn[] = [];
  const parts = md.split(/^## (Prompt|Response):/m);
  let i = 1;
  while (i < parts.length) {
    const type = parts[i];
    const content = (parts[i + 1] || '').trim();
    const lines = content.split('\n');
    let ts = '';
    const tsM = lines[0]?.match(/^\d{4}\/\d+\/\d+\s+\d+:\d+:\d+/);
    if (tsM) ts = tsM[0];

    if (type === 'Prompt') {
      let file: string | null = null;
      const bodyLines: string[] = [];
      let startIdx = tsM ? 1 : 0;
      if (!tsM && lines[0]?.trim() === '') startIdx = 1;
      for (let j = startIdx; j < lines.length; j++) {
        const l = lines[j];
        const fm = l.match(/^>\s*File:\s*(.+)/);
        if (fm) { file = fm[1].trim(); continue; }
        if (l.startsWith('> ')) bodyLines.push(l.slice(2));
        else if (l === '>') bodyLines.push('');
        else bodyLines.push(l);
      }
      turns.push({ role: 'user', ts, content: bodyLines.join('\n').trim(), file });
    } else if (type === 'Response') {
      let startIdx = tsM ? 1 : 0;
      if (!tsM && lines[0]?.trim() === '') startIdx = 1;
      let body = lines.slice(startIdx).join('\n').trim()
        .replace(/\n+---\s*\nPowered by.*/s, '').trim();
      body = body.replace(/^Gemini 说\s*\n-{2,}\s*\n?/, '').trim();
      turns.push({ role: 'assistant', ts, content: body });
    }
    i += 2;
  }
  return { title, created, link, source, turns };
}
