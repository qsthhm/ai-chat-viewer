import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSettings, updateSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const settings = await getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json();
    await updateSettings(body);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
