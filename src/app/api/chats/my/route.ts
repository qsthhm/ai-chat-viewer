import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getChatsByUser } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const chats = await getChatsByUser(user.userId);
    return NextResponse.json({ success: true, chats: chats.map(c => ({
      id: c.id, title: c.title, source: c.source, plazaStatus: c.plazaStatus, createdAt: c.createdAt,
    })) });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
