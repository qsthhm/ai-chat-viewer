import { getSupabase } from './supabase';
import { User, SharedChat, Collection } from '@/types';

function genId(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ==================== Users ====================

export async function createUser(nickname: string, email: string, passwordHash: string): Promise<User> {
  const sb = getSupabase();
  const user: User = {
    id: genId('u'), nickname, email, passwordHash,
    role: 'user', createdAt: new Date().toISOString(),
  };
  const { error } = await sb.from('users').insert({
    id: user.id, nickname: user.nickname, email: user.email,
    password_hash: user.passwordHash, role: user.role, created_at: user.createdAt,
  });
  if (error) throw new Error('创建用户失败: ' + error.message);
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const sb = getSupabase();
  const { data } = await sb.from('users').select('*').eq('email', email).maybeSingle();
  return data ? mapUser(data) : undefined;
}

export async function getUserByNickname(nickname: string): Promise<User | undefined> {
  const sb = getSupabase();
  const { data } = await sb.from('users').select('*').eq('nickname', nickname).maybeSingle();
  return data ? mapUser(data) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const sb = getSupabase();
  const { data } = await sb.from('users').select('*').eq('id', id).maybeSingle();
  return data ? mapUser(data) : undefined;
}

export async function getAllUsers(): Promise<User[]> {
  const sb = getSupabase();
  const { data } = await sb.from('users').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapUser);
}

export async function updateUser(id: string, updates: Record<string, unknown>): Promise<User | undefined> {
  const sb = getSupabase();
  const row: Record<string, unknown> = {};
  if (updates.nickname !== undefined) row.nickname = updates.nickname;
  if (updates.email !== undefined) row.email = updates.email;
  if (updates.passwordHash !== undefined) row.password_hash = updates.passwordHash;
  if (updates.lastLoginAt !== undefined) row.last_login_at = updates.lastLoginAt;
  if (updates.lastLoginIp !== undefined) row.last_login_ip = updates.lastLoginIp;
  if (Object.keys(row).length === 0) return getUserById(id);
  const { data, error } = await sb.from('users').update(row).eq('id', id).select('*').maybeSingle();
  if (error || !data) return undefined;
  return mapUser(data);
}

export async function deleteUser(id: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from('users').delete().eq('id', id);
  return !error;
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string, nickname: row.nickname as string,
    email: row.email as string, passwordHash: row.password_hash as string,
    role: row.role as 'user' | 'admin', createdAt: row.created_at as string,
    lastLoginAt: (row.last_login_at as string) || undefined,
    lastLoginIp: (row.last_login_ip as string) || undefined,
  };
}

// ==================== Rate Limiting ====================

export async function recordLoginAttempt(ip: string, email: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('login_attempts').insert({ ip, email, attempted_at: new Date().toISOString() });
}

export async function getRecentLoginAttempts(ip: string, windowMinutes: number = 15): Promise<number> {
  const sb = getSupabase();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await sb.from('login_attempts').select('*', { count: 'exact', head: true })
    .eq('ip', ip).gte('attempted_at', since);
  return count || 0;
}

export async function cleanOldLoginAttempts(): Promise<void> {
  const sb = getSupabase();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await sb.from('login_attempts').delete().lt('attempted_at', cutoff);
}

// ==================== Chats ====================

export async function createChat(chat: Omit<SharedChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<SharedChat> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const full: SharedChat = { ...chat, id: genId('c'), createdAt: now, updatedAt: now };
  const { error } = await sb.from('chats').insert({
    id: full.id, user_id: full.userId, user_nickname: full.userNickname,
    title: full.title, description: full.description || '', markdown: full.markdown,
    source: full.source, plaza_status: full.plazaStatus,
    passcode: full.passcode || '',
    created_at: full.createdAt, updated_at: full.updatedAt,
  });
  if (error) throw new Error('创建对话失败: ' + error.message);
  return full;
}

export async function getChatById(id: string): Promise<SharedChat | undefined> {
  const sb = getSupabase();
  const { data } = await sb.from('chats').select('*').eq('id', id).maybeSingle();
  return data ? mapChat(data) : undefined;
}

export async function getChatsByUser(userId: string): Promise<SharedChat[]> {
  const sb = getSupabase();
  const { data } = await sb.from('chats').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return (data || []).map(mapChat);
}

export async function getAllChats(): Promise<SharedChat[]> {
  const sb = getSupabase();
  const { data } = await sb.from('chats').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapChat);
}

export async function getPlazaChats(status: string = 'approved'): Promise<SharedChat[]> {
  const sb = getSupabase();
  const { data } = await sb.from('chats').select('*').eq('plaza_status', status).order('created_at', { ascending: false });
  return (data || []).map(mapChat);
}

export async function updateChat(id: string, updates: Partial<SharedChat>): Promise<SharedChat | undefined> {
  const sb = getSupabase();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.plazaStatus !== undefined) row.plaza_status = updates.plazaStatus;
  if (updates.markdown !== undefined) row.markdown = updates.markdown;
  if (updates.passcode !== undefined) row.passcode = updates.passcode;
  const { data, error } = await sb.from('chats').update(row).eq('id', id).select('*').maybeSingle();
  if (error || !data) return undefined;
  return mapChat(data);
}

export async function deleteChat(id: string): Promise<boolean> {
  const sb = getSupabase();
  const { data: cols } = await sb.from('collections').select('id, chat_ids').contains('chat_ids', [id]);
  if (cols) {
    for (const col of cols) {
      const newIds = (col.chat_ids as string[]).filter((cid: string) => cid !== id);
      await sb.from('collections').update({ chat_ids: newIds }).eq('id', col.id);
    }
  }
  const { error } = await sb.from('chats').delete().eq('id', id);
  return !error;
}

function mapChat(row: Record<string, unknown>): SharedChat {
  return {
    id: row.id as string, userId: row.user_id as string,
    userNickname: row.user_nickname as string, title: row.title as string,
    description: (row.description as string) || '',
    markdown: row.markdown as string, source: row.source as SharedChat['source'],
    plazaStatus: row.plaza_status as SharedChat['plazaStatus'],
    passcode: (row.passcode as string) || '',
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  };
}

// ==================== Collections ====================

export async function createCollection(col: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const full: Collection = { ...col, id: genId('col'), createdAt: now, updatedAt: now };
  const { error } = await sb.from('collections').insert({
    id: full.id, user_id: full.userId, user_nickname: full.userNickname,
    name: full.name, description: full.description, chat_ids: full.chatIds,
    is_public: full.isPublic, created_at: full.createdAt, updated_at: full.updatedAt,
  });
  if (error) throw new Error('创建集失败: ' + error.message);
  return full;
}

export async function getCollectionById(id: string): Promise<Collection | undefined> {
  const sb = getSupabase();
  const { data } = await sb.from('collections').select('*').eq('id', id).maybeSingle();
  return data ? mapCollection(data) : undefined;
}

export async function getCollectionsByUser(userId: string): Promise<Collection[]> {
  const sb = getSupabase();
  const { data } = await sb.from('collections').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return (data || []).map(mapCollection);
}

export async function updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | undefined> {
  const sb = getSupabase();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.chatIds !== undefined) row.chat_ids = updates.chatIds;
  if (updates.isPublic !== undefined) row.is_public = updates.isPublic;
  const { data, error } = await sb.from('collections').update(row).eq('id', id).select('*').maybeSingle();
  if (error || !data) return undefined;
  return mapCollection(data);
}

export async function deleteCollection(id: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from('collections').delete().eq('id', id);
  return !error;
}

export async function getAllCollections(): Promise<Collection[]> {
  const sb = getSupabase();
  const { data } = await sb.from('collections').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapCollection);
}

function mapCollection(row: Record<string, unknown>): Collection {
  return {
    id: row.id as string, userId: row.user_id as string,
    userNickname: row.user_nickname as string, name: row.name as string,
    description: row.description as string, chatIds: (row.chat_ids || []) as string[],
    isPublic: row.is_public as boolean, createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
