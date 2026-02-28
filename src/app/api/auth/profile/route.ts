import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById, getUserByEmail, getUserByNickname, updateUser } from '@/lib/store';
import { hashPassword, verifyPassword, validateNickname, signToken } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    const user = await getUserById(payload.userId);
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    const { nickname, email, currentPassword, newPassword } = await req.json();
    const updates: Record<string, unknown> = {};

    // Update nickname
    if (nickname !== undefined && nickname.trim() !== user.nickname) {
      const nickErr = validateNickname(nickname);
      if (nickErr) return NextResponse.json({ error: nickErr }, { status: 400 });
      const existing = await getUserByNickname(nickname.trim());
      if (existing && existing.id !== user.id) return NextResponse.json({ error: '该昵称已被使用' }, { status: 409 });
      updates.nickname = nickname.trim();
    }

    // Update email
    if (email !== undefined && email.trim().toLowerCase() !== user.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
      const existing = await getUserByEmail(email.trim().toLowerCase());
      if (existing && existing.id !== user.id) return NextResponse.json({ error: '该邮箱已被使用' }, { status: 409 });
      updates.email = email.trim().toLowerCase();
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: '请输入当前密码' }, { status: 400 });
      if (!verifyPassword(currentPassword, user.passwordHash)) return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
      if (newPassword.length < 6) return NextResponse.json({ error: '新密码至少6位' }, { status: 400 });
      updates.passwordHash = hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: '没有需要更新的内容' }, { status: 400 });

    const updated = await updateUser(user.id, updates);
    if (!updated) return NextResponse.json({ error: '更新失败' }, { status: 500 });

    // If email changed, re-sign token
    let token: string | undefined;
    if (updates.email) {
      token = signToken({ userId: updated.id, email: updated.email, role: updated.role });
    }

    const res = NextResponse.json({
      success: true,
      user: { id: updated.id, nickname: updated.nickname, email: updated.email, role: updated.role },
    });
    if (token) {
      res.cookies.set('token', token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 7 * 24 * 3600, path: '/',
      });
    }
    return res;
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
