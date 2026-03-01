'use client';

import { useEffect, useRef } from 'react';
import { ParsedChat } from '@/types';
import { mdToHtml } from '@/lib/markdown';

const avatarSvg: Record<string, string> = {
  claude: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  gemini: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 2c3 3.5 3 14.5 0 20"/><path d="M12 2c-3 3.5-3 14.5 0 20"/><path d="M2 12h20"/></svg>',
  chatgpt: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>',
  unknown: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
};

const avatarBg: Record<string, string> = {
  claude: 'bg-gradient-to-br from-brand-500 to-brand-300',
  gemini: 'bg-gradient-to-br from-blue-500 to-green-400',
  chatgpt: 'bg-gradient-to-br from-emerald-500 to-emerald-300',
  unknown: 'bg-gradient-to-br from-gray-500 to-gray-400',
};

function escHtml(t: string): string {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

export default function ChatRenderer({ data }: { data: ParsedChat }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    const container = bodyRef.current;
    container.innerHTML = '';

    const src = data.source || 'claude';

    data.turns.forEach((t, idx) => {
      const el = document.createElement('div');
      el.className = `msg ${t.role === 'user' ? 'msg-user' : 'msg-assistant'}`;
      el.style.animationDelay = `${Math.min(idx * 0.03, 0.5)}s`;

      if (t.role === 'user') {
        let fh = '';
        if (t.file) {
          fh = `<div class="file-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>${escHtml(t.file)}</div>`;
        }
        el.innerHTML = `<div class="bub bub-user">${fh}${mdToHtml(t.content)}</div>${t.ts ? `<div class="ts">${t.ts}</div>` : ''}`;
      } else {
        el.innerHTML = `<div class="av ${avatarBg[src]}">${avatarSvg[src]}</div><div class="bub-wrap"><div class="bub bub-assistant">${mdToHtml(t.content)}</div>${t.ts ? `<div class="ts">${t.ts}</div>` : ''}</div>`;
      }

      container.appendChild(el);
    });
  }, [data]);

  return (
    <>
      <style jsx global>{`
        .msg { margin-bottom: 1.75rem; animation: msgIn 0.35s ease both; }
        @keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .msg-user { display: flex; flex-direction: column; align-items: flex-end; }
        .msg-assistant { display: flex; gap: 0.65rem; align-items: flex-start; }
        .bub { font-size: 0.9rem; line-height: 1.75; word-break: break-word; }
        .bub-user { background: #EDE9E3; border-radius: 16px 16px 4px 16px; padding: 0.75rem 1.1rem; max-width: 82%; box-shadow: 0 1px 2px rgba(28,25,23,0.04); }
        .bub-assistant { font-size: 0.9rem; line-height: 1.75; }
        .bub p { margin-bottom: 0.7rem; } .bub p:last-child { margin-bottom: 0; }
        .bub strong { font-weight: 600; } .bub em { font-style: italic; color: #57534E; }
        .bub a { color: #D4603A; text-decoration: underline; text-underline-offset: 2px; }
        .bub h1,.bub h2,.bub h3,.bub h4 { font-family: 'Newsreader', Georgia, serif; margin: 1.1rem 0 0.45rem; letter-spacing: -0.01em; line-height: 1.35; }
        .bub h1 { font-size: 1.2rem; font-weight: 600; } .bub h2 { font-size: 1.08rem; font-weight: 600; }
        .bub h3 { font-size: 0.98rem; font-weight: 600; } .bub h4 { font-size: 0.92rem; font-weight: 600; }
        .bub ul,.bub ol { padding-left: 1.4rem; margin-bottom: 0.7rem; }
        .bub li { margin-bottom: 0.25rem; }
        .bub code { font-family: 'JetBrains Mono', monospace; font-size: 0.82em; background: #EDE9E3; padding: 0.12em 0.35em; border-radius: 4px; color: #D4603A; }
        .bub pre, .code-block { background: #1E1B18; color: #E8E0D6; padding: 0.85rem 1rem; border-radius: 8px; overflow-x: auto; margin: 0.7rem 0; font-size: 0.82rem; line-height: 1.55; }
        .bub pre code { background: none; padding: 0; color: inherit; font-size: inherit; }
        .bub blockquote { border-left: 3px solid #E8A88A; padding: 0.5rem 0 0.5rem 1rem; margin: 0.7rem 0; color: #57534E; font-style: italic; }
        .bub hr { border: none; border-top: 1px solid #F0EEEC; margin: 1rem 0; }
        .tbl-wrap { overflow-x: auto; margin: 0.7rem 0; border-radius: 8px; border: 1px solid #E7E5E4; }
        .bub table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
        .bub th { background: #F5F3F0; font-weight: 600; text-align: left; padding: 0.5rem 0.7rem; border-bottom: 1px solid #E7E5E4; }
        .bub td { padding: 0.45rem 0.7rem; border-bottom: 1px solid #F0EEEC; }
        .bub tr:last-child td { border-bottom: none; }
        .tool-block { background: #F5F3F0; border: 1px solid #E0DDD8; border-radius: 8px; padding: 0.5rem 0.75rem; margin: 0.5rem 0; font-size: 0.8rem; color: #57534E; display: flex; align-items: center; gap: 0.45rem; }
        .file-badge { display: inline-flex; align-items: center; gap: 0.3rem; background: rgba(212,96,58,0.06); color: #D4603A; font-size: 0.78rem; font-weight: 500; padding: 0.2rem 0.55rem; border-radius: 6px; margin-bottom: 0.45rem; }
        .av { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .av svg { width: 13px; height: 13px; }
        .bub-wrap { flex: 1; min-width: 0; }
        .ts { font-size: 0.68rem; color: #A8A29E; margin-top: 0.25rem; padding: 0 0.15rem; }
        /* Image styles */
        .chat-img { max-width: 100%; border-radius: 8px; margin: 0.5rem 0; display: block; }
        .img-block { margin: 0.5rem 0; }
        .img-block .chat-img { max-width: min(100%, 520px); }
        .bub-user .chat-img { max-width: min(100%, 300px); border-radius: 12px; }
      `}</style>
      <div ref={bodyRef} className="max-w-[780px] mx-auto px-4 sm:px-6 py-5 pb-16" />
    </>
  );
}
