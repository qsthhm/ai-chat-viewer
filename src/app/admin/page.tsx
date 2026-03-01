'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';

type Tab = 'pending' | 'plaza' | 'users' | 'chats' | 'settings';
interface PendingItem { id:string; title?:string; name?:string; source?:string; userNickname:string; createdAt:string; type:'chat'|'collection'; chatCount?:number; }
interface AdminUser { id:string; nickname:string; email:string; role:string; createdAt:string; lastLoginAt:string|null; lastLoginIp:string|null; }
interface AdminChat { id:string; title:string; source:string; userNickname:string; plazaStatus:string; createdAt:string; }

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { show: toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [plazaItems, setPlazaItems] = useState<PendingItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [loading, setLoading] = useState(true);
  // Settings
  const [regOpen, setRegOpen] = useState(true);
  const [revChats, setRevChats] = useState(true);
  const [revCols, setRevCols] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  // Edit user
  const [editUser, setEditUser] = useState<AdminUser|null>(null);
  const [euNickname, setEuNickname] = useState('');
  const [euEmail, setEuEmail] = useState('');
  const [euNewPass, setEuNewPass] = useState('');
  const [euSaving, setEuSaving] = useState(false);
  const [euError, setEuError] = useState('');
  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<{id:string;type:'chat'|'collection';action:'reject'|'takedown'}|null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { if(!authLoading && (!user || user.role !== 'admin')) router.push('/'); }, [user, authLoading, router]);

  const loadPending = () => fetch('/api/admin/plaza/pending').then(r=>r.json()).then(d => {
    const items: PendingItem[] = [...(d.chats||[]).map((c:any)=>({...c,title:c.title,type:'chat'})),...(d.collections||[]).map((c:any)=>({...c,title:c.name,type:'collection'}))];
    setPending(items);
  });
  const loadPlaza = () => fetch('/api/plaza').then(r=>r.json()).then(d => {
    const items: PendingItem[] = [...(d.chats||[]).map((c:any)=>({...c,title:c.title,type:'chat'})),...(d.collections||[]).map((c:any)=>({...c,title:c.name,id:c.id,type:'collection'}))];
    setPlazaItems(items);
  });
  const loadUsers = () => fetch('/api/admin/users').then(r=>r.json()).then(d=>setUsers(d.users||[]));
  const loadChats = () => fetch('/api/admin/chats').then(r=>r.json()).then(d=>setChats(d.chats||[]));
  const loadSettings = () => fetch('/api/admin/settings').then(r=>r.json()).then(d => {
    if(d.settings){setRegOpen(d.settings.registrationOpen);setRevChats(d.settings.reviewChats);setRevCols(d.settings.reviewCollections);setSettingsLoaded(true);}
  });
  useEffect(() => { if(user?.role==='admin') Promise.all([loadPending(),loadPlaza(),loadUsers(),loadChats(),loadSettings()]).finally(()=>setLoading(false)); }, [user]);

  const approve = async (id:string,type:'chat'|'collection') => {
    const body = type==='chat'?{chatId:id}:{collectionId:id};
    await fetch('/api/admin/plaza/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    toast('已通过'); loadPending(); loadPlaza(); loadChats();
  };
  const doReject = async () => {
    if(!rejectTarget) return;
    const url = rejectTarget.action==='takedown' ? '/api/admin/plaza/takedown' : '/api/admin/plaza/reject';
    const body = rejectTarget.type==='chat'?{chatId:rejectTarget.id,reason:rejectReason}:{collectionId:rejectTarget.id,reason:rejectReason};
    await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    toast(rejectTarget.action==='takedown'?'已下架':'已拒绝'); setRejectTarget(null); setRejectReason('');
    loadPending(); loadPlaza(); loadChats();
  };
  const delUser = async (id:string) => { if(!confirm('确定删除？'))return; await fetch('/api/admin/users',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})}); toast('已删除'); loadUsers(); };
  const delChat = async (id:string) => { if(!confirm('确定删除？'))return; await fetch('/api/admin/chats',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:id})}); toast('已删除'); loadChats(); loadPending(); loadPlaza(); };
  const openEditUser = (u:AdminUser) => { setEditUser(u); setEuNickname(u.nickname); setEuEmail(u.email); setEuNewPass(''); setEuError(''); };
  const saveEditUser = async () => {
    if(!editUser)return; setEuSaving(true); setEuError('');
    const body: Record<string,string> = { userId: editUser.id };
    if(euNickname!==editUser.nickname) body.nickname = euNickname;
    if(euEmail!==editUser.email) body.email = euEmail;
    if(euNewPass) body.newPassword = euNewPass;
    const res = await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json(); if(!res.ok){setEuError(d.error);setEuSaving(false);return;}
    toast('已更新'); setEditUser(null); setEuSaving(false); loadUsers();
  };
  const saveSetting = async (key:string, val:boolean) => {
    await fetch('/api/admin/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:val})});
    toast('设置已保存');
  };

  if(authLoading || !user || user.role!=='admin') return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div>;

  const stLabel: Record<string,string> = { none:'私有', pending:'待审核', approved:'已通过', rejected:'已拒绝' };
  const stColor: Record<string,string> = { none:'text-surface-400', pending:'text-yellow-600', approved:'text-green-600', rejected:'text-red-500' };

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <div className="mb-8"><h1 className="font-serif text-xl font-semibold">管理后台</h1></div>
        <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6 overflow-x-auto">
          {([['pending','待审核',pending.length],['plaza','广场管理',plazaItems.length],['users','用户',users.length],['chats','对话',chats.length],['settings','设置',0]] as [Tab,string,number][]).map(([k,l,n])=>(
            <button key={k} onClick={()=>setTab(k)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${tab===k?'bg-white text-surface-900 shadow-sm':'text-surface-500 hover:text-surface-700'}`}>
              {l}{k==='pending'&&n>0&&<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[0.6rem] rounded-full flex items-center justify-center">{n}</span>}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"/></div> : (<>
          {tab==='pending' && (pending.length===0 ? <p className="text-center py-16 text-surface-400 text-sm">没有待审核</p> : (
            <div className="space-y-2">{pending.map(c=>(<div key={c.id+c.type} className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className={`text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium ${c.type==='chat'?'bg-blue-50 text-blue-600':'bg-purple-50 text-purple-600'}`}>{c.type==='chat'?'对话':'集'}</span><span className="font-semibold text-sm text-surface-800 truncate">{c.title||c.name}</span></div>
                <p className="text-xs text-surface-400 mt-0.5">by {c.userNickname} · {new Date(c.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={()=>approve(c.id,c.type)} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600">通过</button>
                <button onClick={()=>{setRejectTarget({id:c.id,type:c.type,action:'reject'});setRejectReason('');}} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600">拒绝</button>
              </div>
            </div>))}</div>
          ))}

          {tab==='plaza' && (plazaItems.length===0 ? <p className="text-center py-16 text-surface-400 text-sm">广场暂无内容</p> : (
            <div className="space-y-2">{plazaItems.map(c=>(<div key={c.id+c.type} className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className={`text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium ${c.type==='chat'?'bg-blue-50 text-blue-600':'bg-purple-50 text-purple-600'}`}>{c.type==='chat'?'对话':'集'}</span><span className="font-semibold text-sm text-surface-800 truncate">{c.title||c.name}</span></div>
                <p className="text-xs text-surface-400 mt-0.5">by {c.userNickname}</p>
              </div>
              <button onClick={()=>{setRejectTarget({id:c.id,type:c.type,action:'takedown'});setRejectReason('');}} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-500 text-xs font-semibold hover:bg-red-50">下架</button>
            </div>))}</div>
          ))}

          {tab==='users' && (<div className="space-y-2">{users.map(u=>(<div key={u.id} className="p-4 rounded-xl border border-surface-200 bg-white"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{u.nickname[0]}</div><div className="flex-1 min-w-0"><p className="font-semibold text-sm">{u.nickname} {u.role==='admin'&&<span className="text-xs text-brand-500 font-normal ml-1">管理员</span>}</p><p className="text-xs text-surface-400">{u.email}</p></div><div className="flex gap-1"><button onClick={()=>openEditUser(u)} className="px-2.5 py-1 rounded-lg text-xs text-surface-500 hover:bg-surface-100">编辑</button>{u.role!=='admin'&&<button onClick={()=>delUser(u.id)} className="px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50">删除</button>}</div></div><div className="mt-2 pl-11 text-[0.68rem] text-surface-400 flex flex-wrap gap-x-3"><span>注册：{new Date(u.createdAt).toLocaleString('zh-CN')}</span>{u.lastLoginAt&&<span>最后登录：{new Date(u.lastLoginAt).toLocaleString('zh-CN')}</span>}{u.lastLoginIp&&<span>IP：{u.lastLoginIp}</span>}</div></div>))}</div>)}

          {tab==='chats' && (chats.length===0 ? <p className="text-center py-16 text-surface-400 text-sm">没有对话</p> : (<div className="space-y-2">{chats.map(c=>(<div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white"><div className="flex-1 min-w-0"><Link href={`/c/${c.id}`} target="_blank" className="font-semibold text-sm text-surface-800 hover:text-brand-600 truncate block">{c.title}</Link><p className="text-xs text-surface-400 mt-0.5">by {c.userNickname} · <span className={stColor[c.plazaStatus]||''}>{stLabel[c.plazaStatus]||''}</span></p></div><button onClick={()=>delChat(c.id)} className="px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50">删除</button></div>))}</div>))}

          {tab==='settings' && settingsLoaded && (
            <div className="max-w-md space-y-6">
              <div className="p-5 rounded-xl border border-surface-200 bg-white">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-sm">开放注册</p><p className="text-xs text-surface-400 mt-0.5">关闭后新用户无法注册</p></div>
                  <button onClick={()=>{setRegOpen(!regOpen);saveSetting('registrationOpen',!regOpen);}} className={`relative w-11 h-6 rounded-full transition-colors ${regOpen?'bg-brand-500':'bg-surface-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${regOpen?'left-[22px]':'left-0.5'}`}/>
                  </button>
                </div>
              </div>
              <div className="p-5 rounded-xl border border-surface-200 bg-white">
                <p className="font-semibold text-sm mb-3">发布到广场需要审核</p>
                <p className="text-xs text-surface-400 mb-4">关闭审核后，对应类型的内容发布到广场时将自动通过</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={revChats} onChange={e=>{setRevChats(e.target.checked);saveSetting('reviewChats',e.target.checked);}} className="w-4 h-4 accent-brand-500"/>
                    <div><p className="text-sm font-medium">对话</p><p className="text-xs text-surface-400">用户分享的单个对话</p></div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={revCols} onChange={e=>{setRevCols(e.target.checked);saveSetting('reviewCollections',e.target.checked);}} className="w-4 h-4 accent-brand-500"/>
                    <div><p className="text-sm font-medium">集</p><p className="text-xs text-surface-400">用户分享的对话集合</p></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </>)}
      </div>

      <Modal open={!!rejectTarget} onClose={()=>setRejectTarget(null)} maxWidth="max-w-sm">
        <div className="p-6">
          <h3 className="font-serif font-semibold text-lg mb-2">{rejectTarget?.action==='takedown'?'下架':'拒绝'}</h3>
          <p className="text-sm text-surface-400 mb-4">用户可以看到原因{rejectTarget?.action==='reject'?'，并可重新申请':''}</p>
          <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="原因（可选）" className="w-full px-3 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm resize-none h-20 mb-4"/>
          <div className="flex gap-3"><button onClick={()=>setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600">取消</button><button onClick={doReject} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">{rejectTarget?.action==='takedown'?'确认下架':'确认拒绝'}</button></div>
        </div>
      </Modal>
      <Modal open={!!editUser} onClose={()=>setEditUser(null)} maxWidth="max-w-sm">
        <div className="p-6"><h3 className="font-serif font-semibold text-lg mb-4">编辑用户</h3><div className="space-y-3 mb-4"><div><label className="block text-xs font-medium text-surface-600 mb-1">昵称</label><input value={euNickname} onChange={e=>setEuNickname(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div><div><label className="block text-xs font-medium text-surface-600 mb-1">邮箱</label><input type="email" value={euEmail} onChange={e=>setEuEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div><div><label className="block text-xs font-medium text-surface-600 mb-1">重置密码（留空不改）</label><input type="password" value={euNewPass} onChange={e=>setEuNewPass(e.target.value)} placeholder="新密码" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/></div></div>{euError&&<p className="text-red-500 text-xs mb-3">{euError}</p>}<div className="flex gap-3"><button onClick={()=>setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600">取消</button><button onClick={saveEditUser} disabled={euSaving} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">{euSaving?'保存中...':'保存'}</button></div></div>
      </Modal>
    </div>
  );
}
