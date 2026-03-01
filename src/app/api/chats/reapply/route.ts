import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getChatById, updateChat, getCollectionById, updateCollection } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { chatId, collectionId } = await req.json();
    if (chatId) {
      const chat = await getChatById(chatId);
      if (!chat) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
      if (chat.userId !== user.userId) return NextResponse.json({ error: '无权限' }, { status: 403 });
      if (chat.plazaStatus !== 'rejected' && chat.plazaStatus !== 'none')
        return NextResponse.json({ error: '当前状态不可重新申请' }, { status: 400 });
      await updateChat(chatId, { plazaStatus: 'pending', rejectReason: '' });
    } else if (collectionId) {
      const col = await getCollectionById(collectionId);
      if (!col) return NextResponse.json({ error: '集不存在' }, { status: 404 });
      if (col.userId !== user.userId) return NextResponse.json({ error: '无权限' }, { status: 403 });
      if (col.plazaStatus !== 'rejected' && col.plazaStatus !== 'none')
        return NextResponse.json({ error: '当前状态不可重新申请' }, { status: 400 });
      await updateCollection(collectionId, { plazaStatus: 'pending', rejectReason: '' });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
