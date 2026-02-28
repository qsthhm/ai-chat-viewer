import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JwtPayload } from '@/types';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.cookies.get('token');
  return cookie?.value || null;
}

export function getUserFromRequest(req: NextRequest): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: NextRequest): JwtPayload {
  const user = getUserFromRequest(req);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export function requireAdmin(req: NextRequest): JwtPayload {
  const user = requireAuth(req);
  if (user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

/**
 * Validate nickname:
 * - 2~16 chars
 * - Only Chinese, letters, numbers, underscores, hyphens
 * - No pure numbers, no common reserved words
 */
export function validateNickname(name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return '昵称至少2个字符';
  if (n.length > 16) return '昵称最多16个字符';
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-]+$/.test(n)) return '昵称只能包含中文、字母、数字、下划线和短横线';
  if (/^\d+$/.test(n)) return '昵称不能是纯数字';
  const reserved = ['admin','administrator','管理员','超级管理员','系统','system','root','test','null','undefined','官方','客服','support'];
  if (reserved.includes(n.toLowerCase())) return '该昵称为系统保留名称';
  return null;
}

export function validatePasscode(code: string): boolean {
  return /^[a-zA-Z0-9]{4}$/.test(code);
}
