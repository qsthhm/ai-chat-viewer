'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';

type Tab = 'pending' | 'users' | 'chats';
interface PendingChat { id:string; title:string; source:string; userNickname:string; createdAt:string; }
interface AdminUser { id:string; nickname:string; email:string; role:string; createdAt:string; lastLoginAt:string|null; lastLoginIp:string|null; }
interface AdminChat { id:string; title:string; source:string; userNickname:string; plazaStatus:string; createdAt:string; }

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { show: toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<PendingChat[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [loading, setLoading] = useState(true);
  // Edit user modal (#3 admin)
  const [editUser, setEditUser] = useState<AdminUser|null>(null);
  const [euNickname, setEuNickname] = useState('');
  const [euEmail, setEuEmail] = useState('');
  const [euNewPass, setEuNewPass] = useState('');
  const [euSaving, setEuSaving] = useState(false);
  const [euError, setEuError] = useState('');

  useEffect(() => { if(!authLoading && (!user || user.role !== 'admin')) router.push('/'); }, [user, authLoading, router]);

  const loadPending = () => fetch('/api/admin/plaza/pending').then(r=>r.json()).then(d=>setPending(d.chats||[]));
  const loadUsers = () => fetch('/api/admin/users').then(r=>r.json()).then(d=>setUsers(d.users||[]));
  const loadChats = () => fetch('/api/admin/chats').then(r=>r.json()).then(d=>setChats(d.chats||[]));
  useEffect(() => { if(user?.role==='admin') Promise.all([loadPending(),loadUsers(),loadChats()]).finally(()=>setLoading(false)); }, [user]);

  const approve = async (id: string) => { await fetch('/api/admin/plaza/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:id})}); toast('已通过'); loadPending(); loadChats(); };
  const reject = async (id: string) => { await fetch('/api/admin/plaza/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:id})}); toast('已拒绝'); loadPending(); loadChats(); };
  const delUser = async (id: string) => { if(!confirm('确定删除？'))return; await fetch('/api/admin/users',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})}); toast('已删除'); loadUsers(); };
  const delChat = async (id: string) => { if(!confirm('确定删除？'))return; await fetch('/api/admin/chats',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:id})}); toast('已删除'); loadChats(); loadPending(); };

  const openEditUser = (u: AdminUser) => { setEditUser(u); setEuNickname(u.nickname); setEuEmail(u.email); setEuNewPass(''); setEuError(''); };
  const saveEditUser = async () => {
    if(!editUser) return; setEuSaving(true); setEuError('');
    const body: Record<string,string> = { userId: editUser.id };
    if (euNickname !== editUser.nickname) body.nickname = euNickname;
    if (euEmail !== editUser.email) body.email = euEmail;
    if (euNewPass) body.newPassword = euNewPass;
    const res = await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    if(!res.ok){ setEuError(d.error); setEuSaving(false); return; }
    toast('已更新'); setEditUser(null); setEuSaving(false); loadUsers();
  };

  if(authLoading || !user || user.role!=='admin') return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>;

  const stLabel: Record<string,string> = { none:'私有', pending:'待审核', approved:'已通过', rejected:'已拒绝' };
  const stColor: Record<string,string> = { none:'text-surface-400', pending:'text-yellow-600', approved:'text-green-600', rejected:'text-red-500' };

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <div className="mb-8"><h1 className="font-serif text-xl font-semibold">管理后台</h1><p className="text-sm text-surface-400">管理用户、对话和广场</p></div>

        <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6 max-w-md">
          {([['pending','待审核',pending.length],['users','用户',users.length],['chats','所有对话',chats.length]] as [Tab,string,number][]).map(([k,l,n])=>(
            <button key={k} onClick={()=>setTab(k)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${tab===k?'bg-white text-surface-900 shadow-sm':'text-surface-500 hover:text-surface-700'}`}>
              {l}{k==='pending'&&n>0&&<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[0.6rem] rounded-full flex items-center justify-center">{n}</span>}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div> : (<>
          {tab==='pending' && (pending.length===0 ? <p className="text-center py-16 text-surface-400 text-sm">没有待审核</p> : (
            <div className="space-y-2">{pending.map(c=>(<div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white"><div className="flex-1 min-w-0"><Link href={`/c/${c.id}`} target="_blank" className="font-semibold text-sm text-surface-800 hover:text-brand-600 truncate block">{c.title}</Link><p className="text-xs text-surface-400 mt-0.5">by {c.userNickname} · {new Date(c.createdAt).toLocaleDateString('zh-CN')}</p></div><div className="flex gap-1.5"><button onClick={()=>approve(c.id)} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600">通过</button><button onClick={()=>reject(c.id)} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600">拒绝</button></div></div>))}</div>
          ))}

          {tab==='users' && (
            <div className="space-y-2">{users.map(u=>(<div key={u.id} className="p-4 rounded-xl border border-surface-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{u.nickname[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{u.nickname} {u.role==='admin'&&<span className="text-xs text-brand-500 font-normal ml-1">管理员</span>}</p>
                  <p className="text-xs text-surface-400">{u.email}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>openEditUser(u)} className="px-2.5 py-1 rounded-lg text-xs text-surface-500 hover:bg-surface-100">编辑</button>
                  {u.role!=='admin'&&<button onClick={()=>delUser(u.id)} className="px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50">删除</button>}
                </div>
              </div>
              {/* Login info (#5) */}
              <div className="mt-2 pl-11 text-[0.68rem] text-surface-400 space-x-3">
                <span>注册：{new Date(u.createdAt).toLocaleString('zh-CN')}</span>
                {u.lastLoginAt && <span>最后登录：{new Date(u.lastLoginAt).toLocaleString('zh-CN')}</span>}
                {u.lastLoginIp && <span>IP：{u.lastLoginIp}</span>}
              </div>
            </div>))}</div>
          )}

          {tab==='chats' && (chats.length===0 ? <p className="text-center py-16 text-surface-400 text-sm">没有对话</p> : (
            <div className="space-y-2">{chats.map(c=>(<div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white"><div className="flex-1 min-w-0"><Link href={`/c/${c.id}`} target="_blank" className="font-semibold text-sm text-surface-800 hover:text-brand-600 truncate block">{c.title}</Link><p className="text-xs text-surface-400 mt-0.5">by {c.userNickname} · <span className={stColor[c.plazaStatus]||''}>{stLabel[c.plazaStatus]||''}</span></p></div><button onClick={()=>delChat(c.id)} className="px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50">删除</button></div>))}</div>
          ))}
        </>)}
      </div>

      {/* Edit user modal */}
      <Modal open={!!editUser} onClose={()=>setEditUser(null)} maxWidth="max-w-sm">
        <div className="p-6">
          <h3 className="font-serif font-semibold text-lg mb-4">编辑用户</h3>
          <div className="space-y-3 mb-4">
            <div><label className="block text-xs font-medium text-surface-600 mb-1">昵称</label><input value={euNickname} onChange={e=>setEuNickname(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div>
            <div><label className="block text-xs font-medium text-surface-600 mb-1">邮箱</label><input type="email" value={euEmail} onChange={e=>setEuEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div>
            <div><label className="block text-xs font-medium text-surface-600 mb-1">重置密码（留空不改）</label><input type="password" value={euNewPass} onChange={e=>setEuNewPass(e.target.value)} placeholder="新密码" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div>
          </div>
          {euError && <p className="text-red-500 text-xs mb-3">{euError}</p>}
          <div className="flex gap-3">
            <button onClick={()=>setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600">取消</button>
            <button onClick={saveEditUser} disabled={euSaving} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">{euSaving?'保存中...':'保存'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
