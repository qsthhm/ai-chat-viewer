'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ChatRenderer from '@/components/ChatRenderer';
import { ParsedChat } from '@/types';

// Minimal client parser (same logic)
function detectAndParse(raw: string): ParsedChat {
  if (/^\*\*You:\*\*/.test(raw.trim())) {
    const turns: ParsedChat['turns'] = [];
    raw.split(/(?=\*\*(?:You|ChatGPT):\*\*)/).forEach(b => {
      const u = b.match(/^\*\*You:\*\*\s*([\s\S]*)/); const g = b.match(/^\*\*ChatGPT:\*\*\s*([\s\S]*)/);
      if (u) turns.push({ role:'user', ts:'', content:u[1].trim() });
      else if (g) turns.push({ role:'assistant', ts:'', content:g[1].trim() });
    });
    return { title: turns[0]?.content?.slice(0,40)||'对话', created:'', link:'', source:'chatgpt', turns };
  }
  if (/^## Prompt:/m.test(raw)) {
    const titleM = raw.match(/^#\s+(.+)$/m);
    const linkM = raw.match(/\*\*Link:\*\*\s+\[.+?\]\((.+?)\)/);
    const link = linkM?linkM[1]:'';
    let source: ParsedChat['source'] = link.includes('gemini')?'gemini':'claude';
    const turns: ParsedChat['turns'] = [];
    const parts = raw.split(/^## (Prompt|Response):/m);
    let i = 1;
    while(i<parts.length){
      const type=parts[i]; const c=(parts[i+1]||'').trim(); const lines=c.split('\n');
      const tsM=lines[0]?.match(/^\d{4}\/\d+\/\d+\s+\d+:\d+:\d+/); const ts=tsM?tsM[0]:'';
      if(type==='Prompt'){const body:string[]=[];let si=tsM?1:0;for(let j=si;j<lines.length;j++){const l=lines[j];if(l.startsWith('> '))body.push(l.slice(2));else if(l==='>')body.push('');else body.push(l);}turns.push({role:'user',ts,content:body.join('\n').trim()});}
      else{let si=tsM?1:0;turns.push({role:'assistant',ts,content:lines.slice(si).join('\n').trim().replace(/\n+---\s*\nPowered by.*/s,'').trim()});}
      i+=2;
    }
    return { title:titleM?titleM[1].trim():'对话', created:'', link, source, turns };
  }
  try{const j=JSON.parse(raw);const m=j.metadata||{};return{title:m.title||'对话',created:'',link:'',source:'gemini',turns:(j.messages||[]).map((msg:any)=>({role:msg.role==='Prompt'?'user' as const:'assistant' as const,ts:'',content:(msg.say||'').trim()}))};}catch{}
  return { title:'对话', created:'', link:'', source:'unknown', turns:[{role:'assistant',ts:'',content:raw}] };
}

export default function SharedChatPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<ParsedChat|null>(null);
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    fetch(`/api/chats/${slug}`).then(async r => {
      if (!r.ok) { setNotFound(true); return; }
      const d = await r.json();
      setData(detectAndParse(d.chat.markdown));
      setNickname(d.chat.userNickname || '');
    }).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold mb-2">对话不存在</h1>
        <p className="text-surface-400 text-sm mb-5">该链接可能已失效</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">返回首页</Link>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-dvh bg-white">
      <div className="bg-gradient-to-r from-brand-50/50 to-brand-100/20 border-b border-surface-200/60 text-center py-2.5 px-4 text-xs text-surface-500">
        {nickname && <span>由 <strong className="text-surface-700">{nickname}</strong> 分享 · </span>}
        <Link href="/" className="text-brand-500 font-semibold hover:underline">AI Chat Viewer</Link>
      </div>
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-200/60">
        <div className="max-w-[780px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h2 className="font-serif font-semibold text-[0.92rem] truncate">{data.title}</h2>
          </div>
          <Link href="/" className="px-3 py-1.5 rounded-lg border border-surface-200 text-surface-500 hover:border-brand-400 hover:text-brand-500 text-xs font-medium transition-colors">首页</Link>
        </div>
      </div>
      <ChatRenderer data={data}/>
    </div>
  );
}
