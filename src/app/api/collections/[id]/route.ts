import { NextRequest, NextResponse } from 'next/server';
import { getCollectionById, updateCollection, deleteCollection, getChatById } from '@/lib/store';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const col = await getCollectionById(params.id);
  if (!col) return NextResponse.json({ error: '集不存在' }, { status: 404 });
  const chats = [];
  for (const cid of col.chatIds) {
    const c = await getChatById(cid);
    if (c) chats.push({ id: c.id, title: c.title, source: c.source, createdAt: c.createdAt });
  }
  return NextResponse.json({ success: true, collection: { ...col, chats } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const col = await getCollectionById(params.id);
    if (!col) return NextResponse.json({ error: '集不存在' }, { status: 404 });
    if (col.userId !== user.userId && user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.chatIds !== undefined) updates.chatIds = body.chatIds;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    const updated = await updateCollection(params.id, updates);
    return NextResponse.json({ success: true, collection: updated });
  } catch { return NextResponse.json({ error: '服务器错误' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const col = await getCollectionById(params.id);
    if (!col) return NextResponse.json({ error: '集不存在' }, { status: 404 });
    if (col.userId !== user.userId && user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
    await deleteCollection(params.id);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: '服务器错误' }, { status: 500 }); }
}
