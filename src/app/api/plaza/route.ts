import { NextResponse } from 'next/server';
import { getPlazaChats } from '@/lib/store';

export async function GET() {
  const chats = getPlazaChats('approved').map(c => ({
    id: c.id,
    title: c.title,
    source: c.source,
    userNickname: c.userNickname,
    createdAt: c.createdAt,
  }));
  return NextResponse.json({ success: true, chats });
}
