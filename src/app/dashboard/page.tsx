'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';

interface MyChat { id:string; title:string; source:string; plazaStatus:string; rejectReason:string; createdAt:string; }
interface MyCol { id:string; name:string; description:string; chatIds:string[]; shareId:string; createdAt:string; }
const statusLabel: Record<string,string> = { none:'私有', pending:'上广场请求审核中', approved:'已上广场', rejected:'未通过' };
const statusColor: Record<string,string> = { none:'text-surface-400', pending:'text-amber-600', approved:'text-green-600', rejected:'text-red-500' };

export default function DashboardPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { show: toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<'chats'|'collections'|'profile'>('chats');
  const [chats, setChats] = useState<MyChat[]>([]);
  const [cols, setCols] = useState<MyCol[]>([]);
  const [loading, setLoading] = useState(true);
  const [colModal, setColModal] = useState(false);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colChats, setColChats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  // Profile
  const [pNickname, setPNickname] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pCurPass, setPCurPass] = useState('');
  const [pNewPass, setPNewPass] = useState('');
  const [pSaving, setPSaving] = useState(false);
  const [pError, setPError] = useState('');

  useEffect(() => { if(!authLoading && !user) router.push('/login'); }, [user,authLoading,router]);
  useEffect(() => { if(user){ setPNickname(user.nickname); setPEmail(user.email); }}, [user]);

  const loadChats = () => fetch('/api/chats/my').then(r=>r.json()).then(d=>setChats(d.chats||[]));
  const loadCols = () => fetch('/api/collections/my').then(r=>r.json()).then(d=>setCols(d.collections||[]));
  useEffect(() => { if(user){ Promise.all([loadChats(),loadCols()]).finally(()=>setLoading(false)); } }, [user]);

  const deleteChat = async (id: string) => { if(!confirm('确定删除？'))return; await fetch(`/api/chats/${id}`,{method:'DELETE'}); toast('已删除'); loadChats(); };
  const openEdit = (c: MyChat) => { setEditId(c.id); setEditTitle(c.title); setEditModal(true); };
  const saveEdit = async () => { await fetch(`/api/chats/${editId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:editTitle})}); toast('已更新'); setEditModal(false); loadChats(); };
  const createCol = async () => { if(!colName.trim())return; setSaving(true); await fetch('/api/collections/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:colName,description:colDesc,chatIds:colChats,isPublic:false,shareId:''})}); toast('集已创建'); setColModal(false); setColName(''); setColDesc(''); setColChats([]); setSaving(false); loadCols(); };
  const deleteCol = async (id: string) => { if(!confirm('确定删除？'))return; await fetch(`/api/collections/${id}`,{method:'DELETE'}); toast('已删除'); loadCols(); };

  // Reapply to plaza (#6)
  const reapply = async (chatId: string) => {
    const res = await fetch('/api/chats/reapply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId})});
    if(res.ok){ toast('已重新申请'); loadChats(); } else { const d = await res.json(); toast(d.error||'失败'); }
  };

  // Share collection (#8)
  const shareCol = async (colId: string) => {
    const res = await fetch('/api/collections/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({collectionId:colId})});
    const d = await res.json();
    if(res.ok && d.shareId){
      const url = `${location.origin}/s/${d.shareId}`;
      try{ await navigator.clipboard.writeText(url); } catch{}
      toast('分享链接已复制');
      loadCols();
    } else { toast(d.error||'分享失败'); }
  };

  // Profile save
  const saveProfile = async () => {
    setPError(''); setPSaving(true);
    const body: Record<string,string> = {};
    if (pNickname !== user?.nickname) body.nickname = pNickname;
    if (pEmail !== user?.email) body.email = pEmail;
    if (pNewPass) { body.currentPassword = pCurPass; body.newPassword = pNewPass; }
    if (Object.keys(body).length === 0) { setPError('没有修改'); setPSaving(false); return; }
    const res = await fetch('/api/auth/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const d = await res.json();
    if (!res.ok) { setPError(d.error); setPSaving(false); return; }
    toast('资料已更新'); setPCurPass(''); setPNewPass(''); setPSaving(false); refresh();
  };

  if(authLoading || !user) return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <div className="mb-8"><h1 className="font-serif text-xl font-semibold mb-1">个人中心</h1><p className="text-sm text-surface-400">管理你的对话、集和账号</p></div>

        <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6">
          {(['chats','collections','profile'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-white text-surface-900 shadow-sm':'text-surface-500 hover:text-surface-700'}`}>
              {{chats:'我的对话',collections:'我的集',profile:'账号设置'}[t]}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div> :
        tab==='chats' ? (
          <div>
            {chats.length===0 ? <div className="text-center py-16 text-surface-400 text-sm">还没有分享的对话<br/><Link href="/" className="text-brand-500 font-medium mt-2 inline-block">去上传</Link></div> : (
              <div className="space-y-2">{chats.map(c=>(
                <div key={c.id} className="p-4 rounded-xl border border-surface-200 bg-white hover:border-brand-200 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/c/${c.id}`} className="font-semibold text-sm text-surface-800 hover:text-brand-600 truncate block">{c.title}</Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                        <span>{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
                        <span className={statusColor[c.plazaStatus]||''}>{statusLabel[c.plazaStatus]||''}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>openEdit(c)} className="px-2.5 py-1 rounded-lg text-xs text-surface-500 hover:bg-surface-100">编辑</button>
                      <button onClick={()=>deleteChat(c.id)} className="px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50">删除</button>
                    </div>
                  </div>
                  {/* Rejection reason & reapply (#6) */}
                  {c.plazaStatus==='rejected' && (
                    <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-xs text-red-600">拒绝原因：{c.rejectReason || '未说明'}</p>
                      <button onClick={()=>reapply(c.id)} className="mt-1.5 text-xs text-brand-500 font-semibold hover:underline">重新申请上广场</button>
                    </div>
                  )}
                </div>
              ))}</div>
            )}
          </div>
        ) : tab==='collections' ? (
          <div>
            <button onClick={()=>setColModal(true)} className="mb-4 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-sm">+ 新建集</button>
            {cols.length===0 ? <div className="text-center py-16 text-surface-400 text-sm">还没有集</div> : (
              <div className="space-y-2">{cols.map(c=>(
                <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white hover:border-brand-200 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/collections/${c.id}`} className="font-semibold text-sm text-surface-800 hover:text-brand-600 truncate block">{c.name}</Link>
                    <p className="text-xs text-surface-400 mt-0.5 truncate">{c.description || `${c.chatIds.length} 个对话`}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>shareCol(c.id)} className="px-2.5 py-1 rounded-lg text-xs text-brand-500 hover:bg-brand-50 font-medium">{c.shareId?'复制链接':'分享'}</button>
                    <Link href={`/dashboard/collections/${c.id}`} className="px-2.5 py-1 rounded-lg text-xs text-surface-500 hover:bg-surface-100">编辑</Link>
                    <button onClick={()=>deleteCol(c.id)} className="px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50">删除</button>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        ) : (
          <div className="max-w-md">
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-surface-600 mb-1.5">昵称</label><input value={pNickname} onChange={e=>setPNickname(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/><p className="text-[0.68rem] text-surface-400 mt-1">2-16字符，中文/字母/数字/下划线/短横线</p></div>
              <div><label className="block text-xs font-medium text-surface-600 mb-1.5">邮箱</label><input type="email" value={pEmail} onChange={e=>setPEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div>
              <div className="border-t border-surface-100 pt-4"><p className="text-xs font-medium text-surface-600 mb-3">修改密码（不改可留空）</p><div className="space-y-3"><input type="password" value={pCurPass} onChange={e=>setPCurPass(e.target.value)} placeholder="当前密码" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/><input type="password" value={pNewPass} onChange={e=>setPNewPass(e.target.value)} placeholder="新密码（至少6位）" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div></div>
              {pError && <p className="text-red-500 text-xs">{pError}</p>}
              <button onClick={saveProfile} disabled={pSaving} className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-sm">{pSaving?'保存中...':'保存修改'}</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={editModal} onClose={()=>setEditModal(false)} maxWidth="max-w-sm">
        <div className="p-6"><h3 className="font-serif font-semibold text-lg mb-4">编辑对话</h3><input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm mb-4" placeholder="对话标题"/><div className="flex gap-3"><button onClick={()=>setEditModal(false)} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600">取消</button><button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">保存</button></div></div>
      </Modal>
      <Modal open={colModal} onClose={()=>setColModal(false)}>
        <div className="p-6"><h3 className="font-serif font-semibold text-lg mb-4">新建集</h3><div className="space-y-3 mb-4"><input value={colName} onChange={e=>setColName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm" placeholder="集名称"/><textarea value={colDesc} onChange={e=>setColDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm resize-none h-20" placeholder="描述（可选）"/></div>{chats.length>0&&(<div className="mb-4"><p className="text-xs font-medium text-surface-600 mb-2">选择对话</p><div className="max-h-40 overflow-y-auto space-y-1 border border-surface-200 rounded-xl p-2">{chats.map(c=>(<label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 cursor-pointer text-sm"><input type="checkbox" checked={colChats.includes(c.id)} onChange={e=>{if(e.target.checked)setColChats([...colChats,c.id]);else setColChats(colChats.filter(x=>x!==c.id));}} className="accent-brand-500"/><span className="truncate">{c.title}</span></label>))}</div></div>)}<div className="flex gap-3"><button onClick={()=>setColModal(false)} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600">取消</button><button onClick={createCol} disabled={saving||!colName.trim()} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">{saving?'创建中...':'创建'}</button></div></div>
      </Modal>
    </div>
  );
}
