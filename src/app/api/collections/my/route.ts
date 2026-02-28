import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCollectionsByUser } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const collections = await getCollectionsByUser(user.userId);
    return NextResponse.json({ success: true, collections });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
