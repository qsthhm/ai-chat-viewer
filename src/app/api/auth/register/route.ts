import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByNickname, getRecentLoginAttempts, recordLoginAttempt, getSettings } from '@/lib/store';
import { hashPassword, signToken, validateNickname, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check if registration is open
    const settings = await getSettings();
    if (!settings.registrationOpen) {
      return NextResponse.json({ error: '注册已关闭，请联系管理员' }, { status: 403 });
    }

    const ip = getClientIp(req);
    // Rate limit registration too
    const attempts = await getRecentLoginAttempts(ip, 15);
    if (attempts >= 10) {
      return NextResponse.json({ error: '操作过于频繁，请稍后再试' }, { status: 429 });
    }
    await recordLoginAttempt(ip, '');

    const { nickname, email, password } = await req.json();
    if (!nickname?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
    }

    // Validate nickname
    const nickErr = validateNickname(nickname);
    if (nickErr) return NextResponse.json({ error: nickErr }, { status: 400 });

    if (password.length < 6) return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });

    const existingEmail = await getUserByEmail(email.trim().toLowerCase());
    if (existingEmail) return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });

    const existingNick = await getUserByNickname(nickname.trim());
    if (existingNick) return NextResponse.json({ error: '该昵称已被使用' }, { status: 409 });

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
