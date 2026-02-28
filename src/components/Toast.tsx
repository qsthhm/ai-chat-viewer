'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ToastCtx {
  show: (msg: string) => void;
}

const ToastContext = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  const show = useCallback((m: string) => {
    setMsg(m);
    setVisible(true);
    setTimeout(() => setVisible(false), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[9999] transition-all duration-300 pointer-events-none max-w-[90vw] text-center ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
