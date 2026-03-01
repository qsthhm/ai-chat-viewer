import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validatePasscode } from '@/lib/auth';
import { getCollectionById, updateCollection, getSettings } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { collectionId, publishToPlaza, passcode } = await req.json();
    if (!collectionId) return NextResponse.json({ error: '缺少collectionId' }, { status: 400 });
    const col = await getCollectionById(collectionId);
    if (!col) return NextResponse.json({ error: '集不存在' }, { status: 404 });
    if (col.userId !== user.userId && user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
    if (passcode && !validatePasscode(passcode)) {
      return NextResponse.json({ error: '口令必须是4位字母或数字' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { isPublic: true };

    // Generate share ID if not exists
    if (!col.shareId) {
      updates.shareId = 's' + Math.random().toString(36).slice(2, 10);
    }
    if (passcode !== undefined) updates.passcode = passcode;

    if (publishToPlaza) {
      const settings = await getSettings();
      updates.plazaStatus = settings.reviewCollections ? 'pending' : 'approved';
    }

    await updateCollection(collectionId, updates);
    return NextResponse.json({ success: true, shareId: updates.shareId || col.shareId });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
