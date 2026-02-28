'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface-50/80 backdrop-blur-xl border-b border-surface-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="font-serif font-semibold text-surface-900 text-[0.95rem]">AI Chat Viewer</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/plaza" className="text-[0.82rem] text-surface-600 hover:text-brand-500 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium">
            广场
          </Link>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 text-[0.82rem] text-surface-600 hover:text-brand-500 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold">
                  {user.nickname[0]}
                </div>
                <span className="hidden sm:inline">{user.nickname}</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-surface-200 rounded-xl shadow-lg z-50 overflow-hidden animate-scale-in">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-surface-700 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                      个人中心
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-surface-700 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                        管理后台
                      </Link>
                    )}
                    <div className="border-t border-surface-100" />
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-surface-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="text-[0.82rem] bg-brand-500 text-white px-3.5 py-1.5 rounded-lg hover:bg-brand-600 transition-colors font-medium shadow-sm">
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
