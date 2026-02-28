import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, recordLoginAttempt, getRecentLoginAttempts, cleanOldLoginAttempts, updateUser } from '@/lib/store';
import { verifyPassword, signToken, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit: max 10 attempts per 15 minutes per IP
    const attempts = await getRecentLoginAttempts(ip, 15);
    if (attempts >= 10) {
      return NextResponse.json({ error: '登录尝试过于频繁，请15分钟后再试' }, { status: 429 });
    }

    const { email, password } = await req.json();
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: '请填写邮箱和密码' }, { status: 400 });
    }

    // Record attempt before checking
    await recordLoginAttempt(ip, email.trim().toLowerCase());

    const user = await getUserByEmail(email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // Update last login info
    await updateUser(user.id, {
      lastLoginAt: new Date().toISOString(),
      lastLoginIp: ip,
    });

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

    // Periodically clean old attempts
    cleanOldLoginAttempts().catch(() => {});

    return res;
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
