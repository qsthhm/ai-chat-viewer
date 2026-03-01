import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createCollection, getUserById } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const u = await getUserById(user.userId);
    if (!u) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    const { name, description, chatIds, isPublic } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: '请输入集名称' }, { status: 400 });
    const col = await createCollection({
      userId: u.id, userNickname: u.nickname, name: name.trim(),
      description: description?.trim() || '', chatIds: chatIds || [], isPublic: isPublic || false, shareId: '',
    });
    return NextResponse.json({ success: true, collection: col });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
