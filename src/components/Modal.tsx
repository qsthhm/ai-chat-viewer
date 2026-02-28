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
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-surface-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl ${maxWidth} w-full animate-scale-in overflow-hidden`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
