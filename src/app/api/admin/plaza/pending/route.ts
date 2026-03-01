import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPlazaChats, getPlazaCollections } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const chats = await getPlazaChats('pending');
    const collections = await getPlazaCollections('pending');
    return NextResponse.json({
      success: true,
      chats: chats.map(c => ({
        id: c.id, title: c.title, source: c.source, userNickname: c.userNickname,
        createdAt: c.createdAt, type: 'chat',
      })),
      collections: collections.map(c => ({
        id: c.id, name: c.name, userNickname: c.userNickname,
        chatCount: c.chatIds.length, createdAt: c.createdAt, type: 'collection',
      })),
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
