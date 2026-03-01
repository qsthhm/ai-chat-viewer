'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface PlazaChat { id:string; title:string; description:string; source:string; userNickname:string; createdAt:string; type:'chat'; }
interface PlazaCol { id:string; shareId:string; name:string; description:string; userNickname:string; chatCount:number; createdAt:string; type:'collection'; }
type PlazaItem = PlazaChat | PlazaCol;

const srcIcon: Record<string,string> = { claude:'🤖', gemini:'✨', chatgpt:'💬', unknown:'📝' };

export default function PlazaPage() {
  const [items, setItems] = useState<PlazaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plaza').then(r=>r.json()).then(d => {
      const all: PlazaItem[] = [
        ...(d.chats||[]).map((c:any)=>({...c,type:'chat'})),
        ...(d.collections||[]).map((c:any)=>({...c,type:'collection'})),
      ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(all);
    }).finally(()=>setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <div className="text-center mb-10"><h1 className="font-serif text-2xl sm:text-3xl font-semibold mb-2">广场</h1><p className="text-sm text-surface-400">来自社区的精彩 AI 对话</p></div>
        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div> :
          items.length===0 ? <div className="text-center py-20 text-surface-400 text-sm">广场还没有内容</div> : (
            <div className="grid sm:grid-cols-2 gap-3">{items.map(item => {
              if (item.type === 'chat') {
                const c = item as PlazaChat;
                return (
                  <Link key={c.id} href={`/c/${c.id}`} className="block p-4 rounded-xl border border-surface-200 bg-white hover:border-brand-300 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-2"><span className="text-lg">{srcIcon[c.source]||'📝'}</span><span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">对话</span></div>
                    <h3 className="font-semibold text-sm text-surface-800 group-hover:text-brand-600 line-clamp-2 mb-1">{c.title}</h3>
                    {c.description && <p className="text-xs text-surface-400 line-clamp-2 mb-2">{c.description}</p>}
                    <div className="text-xs text-surface-400"><span>{c.userNickname}</span> · <span>{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span></div>
                  </Link>
                );
              } else {
                const c = item as PlazaCol;
                return (
                  <Link key={c.id} href={`/s/${c.shareId}`} className="block p-4 rounded-xl border border-surface-200 bg-white hover:border-purple-300 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-2"><span className="text-lg">📚</span><span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">集 · {c.chatCount} 篇</span></div>
                    <h3 className="font-semibold text-sm text-surface-800 group-hover:text-purple-600 line-clamp-2 mb-1">{c.name}</h3>
                    {c.description && <p className="text-xs text-surface-400 line-clamp-2 mb-2">{c.description}</p>}
                    <div className="text-xs text-surface-400"><span>{c.userNickname}</span> · <span>{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span></div>
                  </Link>
                );
              }
            })}</div>
          )
        }
      </div>
    </div>
  );
}
