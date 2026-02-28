/**
 * In-memory data store for development / demo.
 * Replace with a real database (PostgreSQL, MongoDB, etc.) for production.
 *
 * Using global to persist across hot-reloads in Next.js dev mode.
 */

import { User, SharedChat, Collection } from '@/types';
import bcrypt from 'bcryptjs';

interface Store {
  users: Map<string, User>;
  chats: Map<string, SharedChat>;
  collections: Map<string, Collection>;
  initialized: boolean;
}

const globalStore = globalThis as unknown as { __store?: Store };

function getStore(): Store {
  if (!globalStore.__store) {
    globalStore.__store = {
      users: new Map(),
      chats: new Map(),
      collections: new Map(),
      initialized: false,
    };
  }

  // Initialize super admin on first access
  if (!globalStore.__store.initialized) {
    globalStore.__store.initialized = true;
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
    const adminId = 'admin-' + Date.now();
    const hash = bcrypt.hashSync(password, 10);
    globalStore.__store.users.set(adminId, {
      id: adminId,
      nickname: '超级管理员',
      email,
      passwordHash: hash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }

  return globalStore.__store;
}

// ==================== Users ====================
export function createUser(nickname: string, email: string, passwordHash: string): User {
  const store = getStore();
  const id = 'u-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const user: User = {
    id, nickname, email, passwordHash, role: 'user',
    createdAt: new Date().toISOString(),
  };
  store.users.set(id, user);
  return user;
}

export function getUserByEmail(email: string): User | undefined {
  const store = getStore();
  for (const u of store.users.values()) {
    if (u.email === email) return u;
  }
  return undefined;
}

export function getUserById(id: string): User | undefined {
  return getStore().users.get(id);
}

export function getAllUsers(): User[] {
  return Array.from(getStore().users.values());
}

export function deleteUser(id: string): boolean {
  return getStore().users.delete(id);
}

// ==================== Chats ====================
export function createChat(chat: Omit<SharedChat, 'id' | 'createdAt' | 'updatedAt'>): SharedChat {
  const store = getStore();
  const id = 'c-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const now = new Date().toISOString();
  const full: SharedChat = { ...chat, id, createdAt: now, updatedAt: now };
  store.chats.set(id, full);
  return full;
}

export function getChatById(id: string): SharedChat | undefined {
  return getStore().chats.get(id);
}

export function getChatsByUser(userId: string): SharedChat[] {
  const store = getStore();
  return Array.from(store.chats.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllChats(): SharedChat[] {
  return Array.from(getStore().chats.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPlazaChats(status: string = 'approved'): SharedChat[] {
  return Array.from(getStore().chats.values())
    .filter(c => c.plazaStatus === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateChat(id: string, updates: Partial<SharedChat>): SharedChat | undefined {
  const store = getStore();
  const chat = store.chats.get(id);
  if (!chat) return undefined;
  const updated = { ...chat, ...updates, updatedAt: new Date().toISOString() };
  store.chats.set(id, updated);
  return updated;
}

export function deleteChat(id: string): boolean {
  const store = getStore();
  // Also remove from collections
  for (const col of store.collections.values()) {
    col.chatIds = col.chatIds.filter(cid => cid !== id);
  }
  return store.chats.delete(id);
}

// ==================== Collections ====================
export function createCollection(col: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Collection {
  const store = getStore();
  const id = 'col-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const now = new Date().toISOString();
  const full: Collection = { ...col, id, createdAt: now, updatedAt: now };
  store.collections.set(id, full);
  return full;
}

export function getCollectionById(id: string): Collection | undefined {
  return getStore().collections.get(id);
}

export function getCollectionsByUser(userId: string): Collection[] {
  return Array.from(getStore().collections.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateCollection(id: string, updates: Partial<Collection>): Collection | undefined {
  const store = getStore();
  const col = store.collections.get(id);
  if (!col) return undefined;
  const updated = { ...col, ...updates, updatedAt: new Date().toISOString() };
  store.collections.set(id, updated);
  return updated;
}

export function deleteCollection(id: string): boolean {
  return getStore().collections.delete(id);
}

export function getAllCollections(): Collection[] {
  return Array.from(getStore().collections.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
