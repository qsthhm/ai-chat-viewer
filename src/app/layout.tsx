import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'AI Chat Viewer',
  description: '上传 AI 对话导出文件，以对话界面查看和分享你的 AI 对话',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans bg-surface-50 text-surface-900 min-h-dvh">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
