'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';

interface ColChat { id:string; title:string; source:string; createdAt:string; }
interface ColData {
  id:string; userId:string; name:string; description:string;
  userNickname:string; chats:ColChat[]; hasPasscode:boolean;
  chatIds?:string[];
}

export default function SharedCollectionPage() {
  const params = useParams();
  const shareId = params.id as string;
  const { user } = useAuth();
  const { show: toast } = useToast();
  const [data, setData] = useState<ColData|null>(null);
  const [notFound, setNotFound] = useState(false);
  const [needPasscode, setNeedPasscode] = useState(false);
  const [passName, setPassName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');
  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [myChats, setMyChats] = useState<{id:string;title:string}[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchCol = (code?: string) => {
    const url = code ? `/api/collections/public/${shareId}?passcode=${code}` : `/api/collections/public/${shareId}`;
    fetch(url).then(async r => {
      const d = await r.json();
      if (r.status === 404) { setNotFound(true); return; }
      if (d.needPasscode) { setNeedPasscode(true); setPassName(d.collection?.name||''); return; }
      if (!r.ok && code) { setPassError('口令不正确'); return; }
      if (!r.ok) { setNotFound(true); return; }
      setNeedPasscode(false);
      setData(d.collection);
      setEditName(d.collection.name);
      setEditDesc(d.collection.description || '');
    }).catch(() => setNotFound(true));
  };

  useEffect(() => { fetchCol(); }, [shareId]);

  const isOwner = user && data && (user.id === data.userId || user.role === 'admin');

  // Load owner's chats for editing
  const startEdit = async () => {
    const r = await fetch('/api/chats/my'); const d = await r.json();
    setMyChats(d.chats || []);
    // Get full collection data with chatIds
    const r2 = await fetch(`/api/collections/${data!.id}`); const d2 = await r2.json();
    if (d2.collection) setSelectedIds(d2.collection.chatIds || []);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await fetch(`/api/collections/${data!.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDesc, chatIds: selectedIds }),
    });
    toast('已保存'); setEditing(false); setSaving(false);
    fetchCol();
  };

  // Passcode screen
  if (needPasscode) return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-surface-50">
      <div className="max-w-xs w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="font-serif font-semibold text-lg mb-1">{passName || '受保护的集'}</h2>
        <p className="text-sm text-surface-400 mb-6">请输入4位口令查看</p>
        <input value={passcode} onChange={e=>setPasscode(e.target.value.replace(/[^a-zA-Z0-9]/g,'').slice(0,4))} placeholder="输入口令" maxLength={4}
          className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-center text-lg font-mono tracking-[0.3em] mb-3"
          onKeyDown={e=>{if(e.key==='Enter'&&passcode.length===4){setPassError('');fetchCol(passcode);}}}/>
        {passError && <p className="text-red-500 text-xs mb-3">{passError}</p>}
        <button onClick={()=>{setPassError('');fetchCol(passcode);}} disabled={passcode.length!==4}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 shadow-sm">确认</button>
        <Link href="/" className="block mt-4 text-sm text-surface-400 hover:text-brand-500">返回首页</Link>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-dvh flex items-center justify-center p-4"><div className="text-center"><h1 className="font-serif text-2xl font-semibold mb-2">集不存在</h1><p className="text-surface-400 text-sm mb-5">该链接可能已失效</p><Link href="/" className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">返回首页</Link></div></div>
  );
  if (!data) return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">

        {editing ? (
          /* ===== Edit Mode (owner only) ===== */
          <div>
            <button onClick={()=>setEditing(false)} className="text-sm text-surface-400 hover:text-brand-500 mb-4 inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 取消编辑
            </button>
            <div className="space-y-4">
              <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm font-semibold" placeholder="集名称"/>
              <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm resize-none h-20" placeholder="描述"/>
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
                <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">{saving?'保存中...':'保存'}</button>
              </div>
            </div>
          </div>
        ) : (
          /* ===== View Mode ===== */
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-surface-400">由 <strong className="text-surface-600">{data.userNickname}</strong> 分享</div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <button onClick={()=>{navigator.clipboard.writeText(location.href);toast('链接已复制');}} className="px-3 py-1.5 rounded-lg border border-surface-200 text-surface-400 hover:border-brand-300 hover:text-brand-500 text-xs font-medium transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    复制链接
                  </button>
                  <button onClick={startEdit} className="px-3 py-1.5 rounded-lg border border-surface-200 text-surface-500 hover:border-brand-400 hover:text-brand-500 text-xs font-medium transition-colors">编辑</button>
                </div>
              )}
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold mb-2">{data.name}</h1>
            {data.description && <p className="text-sm text-surface-500 mb-8">{data.description}</p>}

            {data.chats.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-surface-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p className="text-surface-400 text-sm">这个集还没有添加对话</p>
                {isOwner && <button onClick={startEdit} className="mt-3 text-sm text-brand-500 font-semibold hover:underline">添加对话</button>}
              </div>
            ) : (
              <div className="space-y-2">
                {data.chats.map(c=>(
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
