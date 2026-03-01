import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCollectionById, updateCollection } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { collectionId } = await req.json();
    if (!collectionId) return NextResponse.json({ error: '缺少collectionId' }, { status: 400 });
    const col = await getCollectionById(collectionId);
    if (!col) return NextResponse.json({ error: '集不存在' }, { status: 404 });
    if (col.userId !== user.userId && user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

    // Generate share ID if not exists
    let shareId = col.shareId;
    if (!shareId) {
      shareId = 's' + Math.random().toString(36).slice(2, 10);
      await updateCollection(collectionId, { shareId, isPublic: true });
    }
    return NextResponse.json({ success: true, shareId });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
