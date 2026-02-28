'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface UserInfo {
  id: string;
  nickname: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthCtx {
  user: UserInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (nickname: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const d = await res.json();
        setUser(d.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json();
    if (!res.ok) return { error: d.error };
    setUser(d.user);
    return {};
  };

  const register = async (nickname: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, email, password }),
    });
    const d = await res.json();
    if (!res.ok) return { error: d.error };
    setUser(d.user);
    return {};
  };

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
