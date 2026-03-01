'use client';

import { ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, children, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); onClose(); }
    };
    // capture phase: ESC closes modal FIRST before page-level ESC handlers
    document.addEventListener('keydown', onKey, true);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey, true); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-surface-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full animate-scale-in overflow-hidden`} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        {children}
      </div>
    </div>
  );
}
