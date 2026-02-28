import { NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '@/lib/store';
import { hashPassword } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

/**
 * POST /api/auth/init
 * Creates the super admin account if it doesn't exist.
 * Called automatically on first visit or manually.
 */
export async function POST() {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json({ error: '未配置 SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD' }, { status: 500 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ success: true, message: '管理员已存在' });
    }

    const hash = hashPassword(password);
    // Create admin user directly with admin role
    const sb = getSupabase();
    const id = 'admin-' + Date.now().toString(36);
    await sb.from('users').insert({
      id, nickname: '超级管理员', email,
      password_hash: hash, role: 'admin',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: '管理员已创建' });
  } catch (e) {
    return NextResponse.json({ error: '初始化失败: ' + (e instanceof Error ? e.message : '') }, { status: 500 });
  }
}
