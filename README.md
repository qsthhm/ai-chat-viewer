# AI Chat Viewer v2

平台级 AI 对话查看与分享工具。支持 Claude / Gemini / ChatGPT 导出文件。

## 功能

- **首页**：上传区 + 全页拖放 + 浏览器插件引导
- **用户系统**：注册/登录（昵称+邮箱+密码），JWT 认证
- **对话分享**：上传 → 预览 → 分享链接 `/c/{id}`，可勾选「发布到广场」
- **集**：将多个对话组合为一个列表，添加名称和描述
- **广场**：展示审核通过的公开对话
- **管理后台**：审核广场内容、管理用户、管理对话

## 部署指南（GitHub → Netlify + Supabase）

### 第 1 步：创建 Supabase 项目

1. 去 [supabase.com](https://supabase.com) 注册并创建一个新项目（免费）
2. 进入项目后，点击左侧 **SQL Editor**
3. 将 `supabase-schema.sql` 的内容粘贴进去，点击 **Run** 执行
4. 进入 **Settings → API**，记下：
   - `Project URL`（即 `SUPABASE_URL`）
   - `service_role` key（即 `SUPABASE_SERVICE_ROLE_KEY`，注意不是 anon key）

### 第 2 步：推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/ai-chat-viewer.git
git push -u origin main
```

### 第 3 步：部署到 Netlify

1. 去 [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. 选择你的 GitHub 仓库
3. 构建设置会自动识别（`netlify.toml` 已配置好）
4. 进入 **Site configuration → Environment variables**，添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `SUPABASE_URL` | 你的 Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 你的 service_role key |
| `JWT_SECRET` | 随机字符串（越长越好） |
| `SUPER_ADMIN_EMAIL` | 管理员邮箱，如 `admin@example.com` |
| `SUPER_ADMIN_PASSWORD` | 管理员密码 |

5. 点击 **Deploy**

### 第 4 步：初始化管理员

部署完成后，访问一次以下地址创建超级管理员账号：

```
POST https://你的域名/api/auth/init
```

可以用浏览器控制台执行：
```js
fetch('/api/auth/init', { method: 'POST' }).then(r => r.json()).then(console.log)
```

之后用配置的邮箱和密码登录即可进入管理后台。

## 目录结构

```
src/
├── app/
│   ├── page.tsx              # 首页
│   ├── login/ register/      # 登录注册
│   ├── plaza/                # 广场
│   ├── dashboard/            # 个人中心 + 集管理
│   ├── admin/                # 超级管理员后台
│   ├── c/[slug]/             # 分享链接查看页
│   └── api/                  # 所有 API 路由
├── components/               # React 组件
├── lib/
│   ├── supabase.ts           # Supabase 客户端
│   ├── store.ts              # 数据操作层（Supabase）
│   ├── auth.ts               # JWT 认证
│   ├── markdown.ts           # MD → HTML
│   └── parser.ts             # 多格式解析
└── types/                    # TypeScript 类型

supabase-schema.sql           # 数据库建表 SQL
netlify.toml                  # Netlify 部署配置
```

## 技术栈

Next.js 14 + Tailwind CSS + TypeScript + Supabase (PostgreSQL) + Netlify
