import { NextRequest, NextResponse } from 'next/server';
import { getChatById, updateChat, deleteChat } from '@/lib/store';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const chat = await getChatById(params.id);
  if (!chat) return NextResponse.json({ error: '对话不存在' }, { status: 404 });

  // Check passcode
  const user = getUserFromRequest(req);
  const isOwner = user && (user.userId === chat.userId || user.role === 'admin');
  if (chat.passcode && !isOwner) {
    const passcode = req.nextUrl.searchParams.get('passcode');
    if (passcode !== chat.passcode) {
      return NextResponse.json({
        success: false,
        needPasscode: true,
        chat: { id: chat.id, title: chat.title, userNickname: chat.userNickname, hasPasscode: true },
      }, { status: 403 });
    }
  }

  return NextResponse.json({ success: true, chat: {
    id: chat.id, title: chat.title, description: chat.description,
    markdown: chat.markdown, source: chat.source,
    userNickname: chat.userNickname, plazaStatus: chat.plazaStatus, createdAt: chat.createdAt,
    hasPasscode: !!chat.passcode,
  }});
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const chat = await getChatById(params.id);
    if (!chat) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    if (chat.userId !== user.userId && user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.passcode !== undefined) updates.passcode = body.passcode;
    if (body.plazaStatus !== undefined) {
      if (user.role === 'admin' || ['pending','none'].includes(body.plazaStatus)) updates.plazaStatus = body.plazaStatus;
    }
    const updated = await updateChat(params.id, updates);
    return NextResponse.json({ success: true, chat: updated });
  } catch { return NextResponse.json({ error: '服务器错误' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const chat = await getChatById(params.id);
    if (!chat) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    if (chat.userId !== user.userId && user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
    await deleteChat(params.id);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: '服务器错误' }, { status: 500 }); }
}
