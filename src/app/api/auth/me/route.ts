import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getUserById } from '@/lib/store';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const user = getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    user: { id: user.id, nickname: user.nickname, email: user.email, role: user.role },
  });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('token');
  return res;
}
