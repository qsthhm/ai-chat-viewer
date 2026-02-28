import { NextResponse } from 'next/server';
import { getPlazaChats } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const chats = await getPlazaChats('approved');
  return NextResponse.json({ success: true, chats: chats.map(c => ({
    id: c.id, title: c.title, source: c.source, userNickname: c.userNickname, createdAt: c.createdAt,
  })) });
}
