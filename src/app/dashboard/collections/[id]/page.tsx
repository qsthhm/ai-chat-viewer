'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';

interface ColChat { id:string; title:string; source:string; createdAt:string; }
interface ColData { id:string; name:string; description:string; chatIds:string[]; chats:ColChat[]; userId:string; }

export default function CollectionDetailPage() {
  const { user } = useAuth();
  const { show: toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [col, setCol] = useState<ColData|null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [myChats, setMyChats] = useState<{id:string;title:string}[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/collections/${id}`).then(r=>r.json()).then(d=>{
      if(d.collection){
        // If already shared, redirect to unified URL
        if(d.collection.shareId) { router.replace(`/s/${d.collection.shareId}`); return; }
        setCol(d.collection); setName(d.collection.name); setDesc(d.collection.description); setSelectedIds(d.collection.chatIds);
      }
    });
    fetch('/api/chats/my').then(r=>r.json()).then(d=>setMyChats(d.chats||[]));
  }, [id, router]);

  const save = async () => {
    await fetch(`/api/collections/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ name, description:desc, chatIds:selectedIds }) });
    toast('已保存'); setEditing(false);
    // reload
    const r = await fetch(`/api/collections/${id}`); const d = await r.json(); setCol(d.collection);
  };

  if(!col) return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>;

  const isOwner = user?.id === col.userId;

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <Link href="/dashboard" className="text-sm text-surface-400 hover:text-brand-500 mb-4 inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 返回
        </Link>

        {editing ? (
          <div className="mt-4 space-y-4">
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm font-semibold" placeholder="集名称"/>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm resize-none h-20" placeholder="描述"/>
            <div>
              <p className="text-xs font-medium text-surface-600 mb-2">选择对话</p>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-surface-200 rounded-xl p-2">
                {myChats.map(c=>(
                  <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={e=>{if(e.target.checked)setSelectedIds([...selectedIds,c.id]);else setSelectedIds(selectedIds.filter(x=>x!==c.id));}} className="accent-brand-500"/>
                    <span className="truncate">{c.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setEditing(false)} className="px-4 py-2 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600">取消</button>
              <button onClick={save} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">保存</button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-serif text-xl font-semibold">{col.name}</h1>
                {col.description && <p className="text-sm text-surface-500 mt-1">{col.description}</p>}
              </div>
              {isOwner && <button onClick={()=>setEditing(true)} className="px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-medium text-surface-500 hover:border-brand-400 hover:text-brand-500">编辑</button>}
            </div>
            {col.chats.length===0 ? <p className="text-sm text-surface-400 text-center py-10">这个集还没有对话</p> : (
              <div className="space-y-2">
                {col.chats.map(c=>(
                  <Link key={c.id} href={`/c/${c.id}`} className="block p-4 rounded-xl border border-surface-200 bg-white hover:border-brand-300 hover:shadow-sm transition-all">
                    <p className="font-semibold text-sm text-surface-800">{c.title}</p>
                    <p className="text-xs text-surface-400 mt-1">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
