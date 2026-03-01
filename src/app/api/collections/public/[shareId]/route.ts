import { NextRequest, NextResponse } from 'next/server';
import { getCollectionByShareId, getChatById } from '@/lib/store';

export async function GET(req: NextRequest, { params }: { params: { shareId: string } }) {
  const col = await getCollectionByShareId(params.shareId);
  if (!col || !col.shareId) return NextResponse.json({ error: '集不存在' }, { status: 404 });
  const chats = [];
  for (const cid of col.chatIds) {
    const c = await getChatById(cid);
    if (c) chats.push({ id: c.id, title: c.title, source: c.source, createdAt: c.createdAt });
  }
  return NextResponse.json({ success: true, collection: {
    name: col.name, description: col.description, userNickname: col.userNickname, chats,
  }});
}
