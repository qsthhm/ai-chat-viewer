'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await register(nickname, email, password);
    if (res.error) { setError(res.error); setLoading(false); return; }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-dvh"><Navbar/>
      <div className="max-w-sm mx-auto px-4 pt-20">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-semibold mb-1">注册</h1>
          <p className="text-sm text-surface-400">创建账号，开始分享 AI 对话</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">昵称</label>
            <input type="text" value={nickname} onChange={e=>setNickname(e.target.value)} required placeholder="你的昵称" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all bg-white"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">邮箱</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="your@email.com" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all bg-white"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">密码</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="至少6位" minLength={6} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all bg-white"/>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">{loading?'注册中...':'注册'}</button>
        </form>
        <p className="text-center text-sm text-surface-400 mt-6">已有账号？<Link href="/login" className="text-brand-500 font-medium hover:underline">登录</Link></p>
      </div>
    </div>
  );
}
