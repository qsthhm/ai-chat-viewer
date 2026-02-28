import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/store';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { nickname, email, password } = await req.json();
    if (!nickname?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }
    const existing = await getUserByEmail(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
    }
    const hash = hashPassword(password);
    const user = await createUser(nickname.trim(), email.trim().toLowerCase(), hash);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, nickname: user.nickname, email: user.email, role: user.role },
      token,
    });
    res.cookies.set('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 3600, path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
