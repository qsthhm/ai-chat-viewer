import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ success: true, settings: { registrationOpen: s.registrationOpen } });
}
