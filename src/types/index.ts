export interface User {
  id: string;
  nickname: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface SharedChat {
  id: string;
  userId: string;
  userNickname: string;
  title: string;
  description: string;
  markdown: string;
  source: 'claude' | 'gemini' | 'chatgpt' | 'unknown';
  plazaStatus: 'none' | 'pending' | 'approved' | 'rejected';
  passcode: string;
  rejectReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  userNickname: string;
  name: string;
  description: string;
  chatIds: string[];
  isPublic: boolean;
  shareId: string;
  plazaStatus: 'none' | 'pending' | 'approved' | 'rejected';
  rejectReason: string;
  passcode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedChat {
  title: string;
  created: string;
  link: string;
  source: 'claude' | 'gemini' | 'chatgpt' | 'unknown';
  turns: ChatTurn[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  ts: string;
  content: string;
  file?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export interface SiteSettings {
  registrationOpen: boolean;
  reviewChats: boolean;
  reviewCollections: boolean;
}
