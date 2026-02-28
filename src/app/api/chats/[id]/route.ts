import { NextRequest, NextResponse } from 'next/server';
import { getChatById, updateChat, deleteChat } from '@/lib/store';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const chat = getChatById(params.id);
  if (!chat) {
    return NextResponse.json({ error: '对话不存在' }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    chat: {
      id: chat.id,
      title: chat.title,
      markdown: chat.markdown,
      source: chat.source,
      userNickname: chat.userNickname,
      plazaStatus: chat.plazaStatus,
      createdAt: chat.createdAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const chat = getChatById(params.id);
    if (!chat) return NextResponse.json({ error: '对话不存在' }, { status: 404 });

    // Only owner or admin can edit
    if (chat.userId !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await req.json();
    const allowed: Record<string, boolean> = { title: true, plazaStatus: true };
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (allowed[key]) updates[key] = body[key];
    }

    // Only admin can change plazaStatus
    if ('plazaStatus' in updates && user.role !== 'admin') {
      // Users can only set to pending or none
      if (!['pending', 'none'].includes(updates.plazaStatus as string)) {
        delete updates.plazaStatus;
      }
    }

    const updated = updateChat(params.id, updates);
    return NextResponse.json({ success: true, chat: updated });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const chat = getChatById(params.id);
    if (!chat) return NextResponse.json({ error: '对话不存在' }, { status: 404 });

    if (chat.userId !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    deleteChat(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
