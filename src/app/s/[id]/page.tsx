'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface ColChat { id:string; title:string; source:string; createdAt:string; }
interface ColData { name:string; description:string; userNickname:string; chats:ColChat[]; }

export default function SharedCollectionPage() {
  const params = useParams();
  const shareId = params.id as string;
  const [data, setData] = useState<ColData|null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/public/${shareId}`).then(async r => {
      if (!r.ok) { setNotFound(true); return; }
      const d = await r.json();
      setData(d.collection);
    }).catch(() => setNotFound(true));
  }, [shareId]);

  if (notFound) return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="text-center"><h1 className="font-serif text-2xl font-semibold mb-2">集不存在</h1><p className="text-surface-400 text-sm mb-5">该链接可能已失效</p><Link href="/" className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">返回首页</Link></div>
    </div>
  );
  if (!data) return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <div className="text-center mb-2 text-xs text-surface-400">由 <strong className="text-surface-600">{data.userNickname}</strong> 分享</div>
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-center mb-2">{data.name}</h1>
        {data.description && <p className="text-sm text-surface-500 text-center mb-8">{data.description}</p>}
        <div className="space-y-2">
          {data.chats.map(c=>(
            <Link key={c.id} href={`/c/${c.id}`} className="block p-4 rounded-xl border border-surface-200 bg-white hover:border-brand-300 hover:shadow-sm transition-all">
              <p className="font-semibold text-sm text-surface-800">{c.title}</p>
              <p className="text-xs text-surface-400 mt-1">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
