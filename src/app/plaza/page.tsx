'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface PlazaChat { id: string; title: string; source: string; userNickname: string; createdAt: string; }
const sourceLabel: Record<string,string> = { claude:'Claude', gemini:'Gemini', chatgpt:'ChatGPT', unknown:'AI' };
const sourceColor: Record<string,string> = { claude:'bg-brand-100 text-brand-600', gemini:'bg-blue-100 text-blue-600', chatgpt:'bg-emerald-100 text-emerald-600', unknown:'bg-gray-100 text-gray-600' };

export default function PlazaPage() {
  const [chats, setChats] = useState<PlazaChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plaza').then(r=>r.json()).then(d=>{ setChats(d.chats||[]); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <div className="text-center mb-10">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold mb-2">广场</h1>
          <p className="text-sm text-surface-400">浏览社区分享的精彩 AI 对话</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>
        ) : chats.length === 0 ? (
          <div className="text-center py-20 text-surface-400"><p className="text-lg mb-2">🏖️</p><p className="text-sm">广场暂时还没有内容</p></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chats.map(c => (
              <Link key={c.id} href={`/c/${c.id}`} className="group block p-5 rounded-2xl border border-surface-200 bg-white hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-md ${sourceColor[c.source]||sourceColor.unknown}`}>{sourceLabel[c.source]||'AI'}</span>
                  <span className="text-[0.68rem] text-surface-400">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <h3 className="font-semibold text-sm text-surface-800 group-hover:text-brand-600 transition-colors line-clamp-2 mb-2">{c.title}</h3>
                <p className="text-xs text-surface-400">by {c.userNickname}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
