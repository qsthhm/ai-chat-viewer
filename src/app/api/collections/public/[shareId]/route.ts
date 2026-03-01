import { NextRequest, NextResponse } from 'next/server';
import { getCollectionByShareId, getChatById } from '@/lib/store';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { shareId: string } }) {
  const col = await getCollectionByShareId(params.shareId);
  if (!col || !col.shareId) return NextResponse.json({ error: '集不存在' }, { status: 404 });

  // Check passcode
  const user = getUserFromRequest(req);
  const isOwner = user && (user.userId === col.userId || user.role === 'admin');
  if (col.passcode && !isOwner) {
    const passcode = req.nextUrl.searchParams.get('passcode');
    if (passcode !== col.passcode) {
      return NextResponse.json({
        success: false, needPasscode: true,
        collection: { name: col.name, hasPasscode: true },
      }, { status: 403 });
    }
  }

  const chats = [];
  for (const cid of col.chatIds) {
    const c = await getChatById(cid);
    if (c) chats.push({ id: c.id, title: c.title, source: c.source, createdAt: c.createdAt });
  }
  return NextResponse.json({ success: true, collection: {
    id: col.id, userId: col.userId, name: col.name, description: col.description,
    userNickname: col.userNickname, chats, hasPasscode: !!col.passcode,
  }});
}
