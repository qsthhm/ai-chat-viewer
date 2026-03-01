import { NextResponse } from 'next/server';
import { getPlazaChats, getPlazaCollections } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const chats = await getPlazaChats('approved');
  const collections = await getPlazaCollections('approved');
  return NextResponse.json({
    success: true,
    chats: chats.map(c => ({
      id: c.id, title: c.title, description: c.description, source: c.source,
      userNickname: c.userNickname, createdAt: c.createdAt, type: 'chat',
      hasPasscode: !!c.passcode,
    })),
    collections: collections.map(c => ({
      id: c.id, shareId: c.shareId, name: c.name, description: c.description,
      userNickname: c.userNickname, chatCount: c.chatIds.length,
      createdAt: c.createdAt, type: 'collection',
    })),
  });
}
