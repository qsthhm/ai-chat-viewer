import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validatePasscode } from '@/lib/auth';
import { createChat, getUserById } from '@/lib/store';
import { SharedChat } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    const user = await getUserById(payload.userId);
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    const { markdown, title, source, description, publishToPlaza, passcode } = await req.json();
    if (!markdown?.trim()) return NextResponse.json({ error: '缺少对话内容' }, { status: 400 });
    if (passcode && !validatePasscode(passcode)) {
      return NextResponse.json({ error: '口令必须是4位字母或数字' }, { status: 400 });
    }
    const chat = await createChat({
      userId: user.id, userNickname: user.nickname,
      title: title || '对话', description: description || '',
      markdown, source: source || 'unknown',
      plazaStatus: publishToPlaza ? 'pending' : 'none',
      passcode: passcode || '',
    } as Omit<SharedChat, 'id' | 'createdAt' | 'updatedAt'>);
    return NextResponse.json({ success: true, chat: { id: chat.id, title: chat.title, plazaStatus: chat.plazaStatus } });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
