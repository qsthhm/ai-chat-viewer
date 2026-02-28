import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAllUsers, deleteUser } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const users = await getAllUsers();
    return NextResponse.json({ success: true, users: users.map(u => ({
      id: u.id, nickname: u.nickname, email: u.email, role: u.role, createdAt: u.createdAt,
    })) });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAdmin(req);
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
