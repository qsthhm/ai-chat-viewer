import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/store';
import { verifyPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: '请填写邮箱和密码' }, { status: 400 });
    }

    const user = getUserByEmail(email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

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
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
