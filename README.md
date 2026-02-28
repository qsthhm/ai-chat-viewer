# AI Chat Viewer v2

一个平台级的 AI 对话查看与分享工具，基于 Next.js + Tailwind CSS 重构。

## 功能概览

### 🏠 首页
- 上传区域，支持**整页拖放**自动识别文件
- 支持 Claude / Gemini / ChatGPT 导出的 `.md` 和 `.json` 文件
- 浏览器插件引导区域（Gemini Exporter / Claude Exporter）
- 三大卖点：无需翻墙、无需登录查看、隐私安全

### 👤 用户系统
- 注册（昵称 + 邮箱 + 密码）
- 登录 / 登出
- JWT Token 认证（httpOnly cookie）

### 💬 对话分享
- 上传后可直接在浏览器内预览
- 登录后可分享，生成 `/c/{id}` 短链接
- 分享时可勾选**「发布到广场」**（需管理员审核）

### 📚 集（Collections）
- 用户可创建「集」，选择已分享的对话组合在一起
- 为集添加名称和描述
- 支持编辑和删除

### 🏛️ 广场（Plaza）
- 展示所有审核通过的公开对话
- 卡片式布局，显示来源、作者、日期

### 🔧 超级管理员后台
- **待审核**：审核发布到广场的对话（通过 / 拒绝）
- **用户管理**：查看所有用户、删除用户
- **对话管理**：查看所有对话、删除对话

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **语言**: TypeScript
- **认证**: JWT + bcryptjs
- **存储**: 内存存储（开发用，可替换为数据库）

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 设置你的密钥

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000

### 默认超级管理员

- 邮箱：`admin@example.com`
- 密码：`admin123`
- 管理后台：登录后在头像下拉菜单中选择「管理后台」

## 目录结构

```
src/
├── app/
│   ├── page.tsx                # 首页（上传 + 查看器）
│   ├── login/page.tsx          # 登录
│   ├── register/page.tsx       # 注册
│   ├── plaza/page.tsx          # 广场
│   ├── dashboard/              # 个人中心
│   │   ├── page.tsx            # 我的对话 & 集
│   │   └── collections/[id]/  # 集详情
│   ├── admin/page.tsx          # 超级管理员后台
│   ├── c/[slug]/page.tsx       # 分享链接查看页
│   └── api/                    # API 路由
│       ├── auth/               # 注册 / 登录 / 用户信息
│       ├── chats/              # 对话 CRUD
│       ├── collections/        # 集 CRUD
│       ├── plaza/              # 广场公开接口
│       └── admin/              # 管理员接口
├── components/
│   ├── AuthProvider.tsx        # 认证上下文
│   ├── ChatRenderer.tsx        # 对话渲染器
│   ├── Modal.tsx               # 弹窗组件
│   ├── Navbar.tsx              # 导航栏
│   └── Toast.tsx               # 提示组件
├── lib/
│   ├── auth.ts                 # JWT 工具
│   ├── markdown.ts             # MD → HTML 渲染
│   ├── parser.ts               # 多格式解析器
│   └── store.ts                # 内存数据存储
└── types/
    └── index.ts                # TypeScript 类型定义
```

## 生产部署注意

当前使用**内存存储**，服务器重启后数据会丢失。生产环境请替换 `src/lib/store.ts` 为实际数据库实现（如 PostgreSQL、MongoDB、Supabase 等），接口无需修改。

## 环境变量

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥 |
| `SUPER_ADMIN_EMAIL` | 超级管理员邮箱 |
| `SUPER_ADMIN_PASSWORD` | 超级管理员密码 |
| `NEXT_PUBLIC_APP_URL` | 应用地址 |
