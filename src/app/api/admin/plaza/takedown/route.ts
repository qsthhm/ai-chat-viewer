import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateChat, updateCollection } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const { chatId, collectionId, reason } = await req.json();
    const r = reason || '已从广场下架';
    if (chatId) {
      await updateChat(chatId, { plazaStatus: 'rejected', rejectReason: r });
    } else if (collectionId) {
      await updateCollection(collectionId, { plazaStatus: 'rejected', rejectReason: r });
    } else {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
