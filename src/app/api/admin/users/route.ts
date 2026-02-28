import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAllUsers, deleteUser, updateUser, getUserByEmail, getUserByNickname } from '@/lib/store';
import { hashPassword, validateNickname } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const users = await getAllUsers();
    return NextResponse.json({ success: true, users: users.map(u => ({
      id: u.id, nickname: u.nickname, email: u.email, role: u.role,
      createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null, lastLoginIp: u.lastLoginIp || null,
    })) });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    if (e instanceof Error && e.message === 'FORBIDDEN') return NextResponse.json({ error: '无权限' }, { status: 403 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// Admin edit user
export async function PATCH(req: NextRequest) {
  try {
    requireAdmin(req);
    const { userId, nickname, email, newPassword } = await req.json();
    if (!userId) return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (nickname !== undefined) {
      const err = validateNickname(nickname);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      const existing = await getUserByNickname(nickname.trim());
      if (existing && existing.id !== userId) return NextResponse.json({ error: '昵称已被使用' }, { status: 409 });
      updates.nickname = nickname.trim();
    }
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
      const existing = await getUserByEmail(email.trim().toLowerCase());
      if (existing && existing.id !== userId) return NextResponse.json({ error: '邮箱已被使用' }, { status: 409 });
      updates.email = email.trim().toLowerCase();
    }
    if (newPassword) {
      if (newPassword.length < 6) return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
      updates.passwordHash = hashPassword(newPassword);
    }

    const updated = await updateUser(userId, updates);
    return NextResponse.json({ success: true, user: updated });
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
