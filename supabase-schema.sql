-- ============================================
-- AI Chat Viewer - Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 对话表
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_nickname TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '对话',
  markdown TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'unknown',
  plaza_status TEXT NOT NULL DEFAULT 'none' CHECK (plaza_status IN ('none', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 集（Collections）表
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_nickname TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  chat_ids TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_plaza_status ON chats(plaza_status);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
