'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import ChatRenderer from '@/components/ChatRenderer';
import { ParsedChat } from '@/types';

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
    const titleM = raw.match(/^#\s+(.+)$/m); const linkM = raw.match(/\*\*Link:\*\*\s+\[.+?\]\((.+?)\)/);
    const link = linkM?linkM[1]:''; let source: ParsedChat['source'] = link.includes('gemini')?'gemini':'claude';
    const turns: ParsedChat['turns'] = []; const parts = raw.split(/^## (Prompt|Response):/m);
    let i = 1;
    while(i<parts.length){
      const type=parts[i]; const c=(parts[i+1]||'').trim(); const lines=c.split('\n');
      const tsM=lines[0]?.match(/^\d{4}\/\d+\/\d+\s+\d+:\d+:\d+/); const ts=tsM?tsM[0]:'';
      if(type==='Prompt'){const body:string[]=[];let si=tsM?1:0;for(let j=si;j<lines.length;j++){const l=lines[j];if(l.startsWith('> '))body.push(l.slice(2));else if(l==='>')body.push('');else body.push(l);}turns.push({role:'user',ts,content:body.join('\n').trim()});}
      else{let si=tsM?1:0;turns.push({role:'assistant',ts,content:lines.slice(si).join('\n').trim().replace(/\n+---\s*\nPowered by.*/s,'').replace(/^Gemini 说\s*\n-{2,}\s*\n?/,'').trim()});}
      i+=2;
    }
    return { title:titleM?titleM[1].trim():'对话', created:'', link, source, turns };
  }
  try{const j=JSON.parse(raw);const m=j.metadata||{};return{title:m.title||'对话',created:'',link:'',source:'gemini',turns:(j.messages||[]).map((msg:any)=>({role:msg.role==='Prompt'?'user' as const:'assistant' as const,ts:'',content:(msg.say||'').replace(/^Gemini 说\s*/,'').trim()}))};}catch{}
  return { title:'对话', created:'', link:'', source:'unknown', turns:[{role:'assistant',ts:'',content:raw}] };
}

export default function SharedChatPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { show: toast } = useToast();
  const [data, setData] = useState<ParsedChat|null>(null);
  const [rawMd, setRawMd] = useState('');
  const [chatUserId, setChatUserId] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState('');
  const [description, setDescription] = useState('');
  const [needPasscode, setNeedPasscode] = useState(false);
  const [passTitle, setPassTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const fetchChat = (code?: string) => {
    const url = code ? `/api/chats/${slug}?passcode=${code}` : `/api/chats/${slug}`;
    fetch(url).then(async r => {
      const d = await r.json();
      if (r.status === 404) { setNotFound(true); return; }
      if (d.needPasscode) { setNeedPasscode(true); setPassTitle(d.chat?.title||''); return; }
      if (!r.ok && code) { setPassError('口令不正确'); return; }
      if (!r.ok) { setNotFound(true); return; }
      setNeedPasscode(false);
      setData(detectAndParse(d.chat.markdown));
      setRawMd(d.chat.markdown || '');
      setNickname(d.chat.userNickname || '');
      setDescription(d.chat.description || '');
      setChatUserId(d.chat.userId || '');
    }).catch(() => setNotFound(true));
  };

  useEffect(() => { fetchChat(); }, [slug]);

  const isOwner = user && (user.id === chatUserId || user.role === 'admin');

  const handleDelete = async () => {
    if (!confirm('确定删除这个对话？')) return;
    const res = await fetch(`/api/chats/${slug}`, { method: 'DELETE' });
    if (res.ok) { toast('已删除'); router.push('/dashboard'); }
    else toast('删除失败');
  };

  const handleExport = () => {
    if (!rawMd) return;
    const b = new Blob([rawMd], { type: 'text/markdown' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = (data?.title || 'chat') + '.md'; a.click();
    URL.revokeObjectURL(u); toast('已导出');
  };

  if (needPasscode) return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-surface-50">
      <div className="max-w-xs w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="font-serif font-semibold text-lg mb-1">{passTitle || '受保护的对话'}</h2>
        <p className="text-sm text-surface-400 mb-6">请输入4位口令查看</p>
        <input value={passcode} onChange={e=>setPasscode(e.target.value.replace(/[^a-zA-Z0-9]/g,'').slice(0,4))} placeholder="输入口令" maxLength={4}
          className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-center text-lg font-mono tracking-[0.3em] mb-3"
          onKeyDown={e=>{if(e.key==='Enter'&&passcode.length===4){setPassError('');fetchChat(passcode);}}}/>
        {passError && <p className="text-red-500 text-xs mb-3">{passError}</p>}
        <button onClick={()=>{setPassError('');fetchChat(passcode);}} disabled={passcode.length!==4}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 shadow-sm">确认</button>
        <Link href="/" className="block mt-4 text-sm text-surface-400 hover:text-brand-500">返回首页</Link>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-dvh flex items-center justify-center p-4"><div className="text-center"><h1 className="font-serif text-2xl font-semibold mb-2">对话不存在</h1><p className="text-surface-400 text-sm mb-5">该链接可能已失效</p><Link href="/" className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">返回首页</Link></div></div>
  );

  if (!data) return (<div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>);

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
            <div className="min-w-0">
              <h2 className="font-serif font-semibold text-[0.92rem] truncate">{data.title}</h2>
              {description && <p className="text-[0.68rem] text-surface-400 truncate">{description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExport} className="px-2.5 py-1.5 rounded-lg border border-surface-200 text-surface-500 hover:border-brand-400 hover:text-brand-500 text-xs font-medium transition-colors">导出</button>
            {isOwner && <button onClick={handleDelete} className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium transition-colors">删除</button>}
            <Link href="/" className="px-2.5 py-1.5 rounded-lg border border-surface-200 text-surface-500 hover:border-brand-400 hover:text-brand-500 text-xs font-medium transition-colors">首页</Link>
          </div>
        </div>
      </div>
      <ChatRenderer data={data}/>
    </div>
  );
}
