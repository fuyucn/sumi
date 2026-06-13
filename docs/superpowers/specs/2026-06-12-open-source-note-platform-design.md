# Sumi 墨 — 开源发布平台设计文档

> **Sumi（墨）**。一个 note.com 风格的多创作者写作与发布平台，**部署在 Vercel**，用 GitHub 登录，内容存进 GitHub 仓库。
> 日期：2026-06-12（2026-06-12 修订为 Vercel-native 架构） · 状态：设计已批准，执行中

## 1. 项目定位与目标

构建一个**开源**的多创作者内容发布平台，气质对标 note.com：干净的写作体验、独立创作者主页、轻社交、简单可预测的内容发现。

修订后的核心目标（所有取舍服务于它们）：

1. **Vercel 一键部署** — 一个 Next.js 应用推到 Vercel 即可上线。
2. **用 GitHub 登录、内容存进 GitHub** — GitHub OAuth 登录（白名单 safe gate），文章/图片/评论通过 GitHub API 提交进一个 GitHub 仓库。
3. **写作体验好** — TipTap 块状富文本编辑器，内容序列化为 Markdown。
4. **贡献者友好** — 单一代码库、TypeScript 全栈。

**明确不做**：付费内容、算法推荐、嵌套评论、移动 App（为后续预留空间，不实现）。

## 2. 架构总览

**形态：纯 serverless。** 一个 Next.js 应用部署到 Vercel。两类持久化都在 Vercel 之外：
- **账号/会话** → 外部托管 **Neon Postgres**（Better Auth 通过 Drizzle 写入）。
- **内容（文章/图片/评论/杂志）** → **一个 GitHub 仓库**，通过 GitHub API（Octokit）提交。

> 为什么不放本地 SQLite / 本地 git 工作区：Vercel 是无状态、文件系统只读且易失的 serverless 环境，本地 SQLite 文件与"提交到本地 git 工作区"的长驻进程模型都无法在其上运行。Neon（外部 Postgres）+ GitHub API（无状态 HTTP）才能在 serverless 上持久化。

```
┌─────────────── Vercel ───────────────┐
│  Next.js (App Router, TS)             │
│   • Server Components 渲染阅读页       │
│   • Server Actions / Route Handlers   │
│   • TipTap 编辑器(客户端)              │
└───────┬───────────────────┬───────────┘
        │ Drizzle           │ Octokit (GitHub API)
        ▼                   ▼
   Neon Postgres        GitHub 仓库 (内容)
   (账号/会话)           articles/images/comments/magazines
```

**迁移接缝：`ContentStore` 抽象接口。** 应用只依赖内容访问接口，不直接调 Octokit。
- **v0** → `GitHubContentStore`（通过 GitHub API 读写 Markdown + 图片）。
- **未来** → 可加 `DbContentStore`（内容转存 Postgres），用一次性脚本从 GitHub 导入。

## 3. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js (App Router) + TypeScript** | 前后端一体，Vercel 原生 |
| 部署 | **Vercel** | 一键部署；Neon 有官方 Marketplace 集成 |
| 数据库 | **Neon Postgres**（外部托管） | serverless 友好、免费档、Vercel 一键接入 |
| ORM | **Drizzle** | 纯 TS、无引擎二进制、冷启动快、`drizzle-orm/neon-http` 原生对接 Neon |
| 认证 | **Better Auth**（GitHub OAuth + Drizzle adapter） | TS 原生；只用 GitHub 社交登录；白名单 safe gate |
| 内容库 | **GitHub 仓库 + GitHub API (Octokit)** | 内容版本化、可移植；serverless 可用（HTTP API，非本地工作区） |
| 内容格式 | **Markdown + YAML frontmatter** | 可读、可移植、易迁移 |
| 编辑器 | **TipTap (ProseMirror)，序列化 Markdown** | 干净富文本；块限定在 Markdown 可干净表达的范围 |
| 图片 | **提交进 GitHub 内容仓库**，正文相对路径引用 | 与文章同源；不用 base64 内联（污染 diff） |

## 4. 认证与 safe gate

- **唯一登录方式：GitHub OAuth**（Better Auth 的 `socialProviders.github`）。请求 `repo` scope，以便用登录者的 GitHub token 向内容仓库提交。
- **Safe gate（白名单）**：环境变量 `ALLOWED_GITHUB_USERS`（逗号分隔的 GitHub 登录名）。在 Better Auth 的登录/建账钩子里校验：登录者的 GitHub `login` 不在白名单 → 拒绝。白名单为空时的策略：默认拒绝所有（必须显式配置），避免误开放。
- **会话**：Better Auth 默认会话（存 Neon）。
- **账号数据**：`user` / `account` / `session` / `verification` 表存在 Neon，由 Better Auth + Drizzle adapter 管理；GitHub access token 存在 `account` 表，供 Octokit 调用。

## 5. 内容模型（GitHub 仓库布局）

内容仓库（由 `GITHUB_CONTENT_REPO` 指定，形如 `owner/repo`）：

```
content/
  @alice/
    profile.md                       # 创作者资料(frontmatter)
    my-first-post/
      index.md                       # frontmatter(title/tags/cover/status/publishedAt) + 正文 Markdown
      images/cover.png               # 图片独立文件，正文相对路径引用
      comments/
        2026-06-12T10-30-00-bob.md   # 每条评论一个文件(frontmatter: author/date + 正文)
    magazines/
      my-zine.md                     # frontmatter 列出收录文章引用 + 排序
```

- 读：用 GitHub API 拉取文件/目录（带缓存）。
- 写：用 Octokit 的 contents API 创建/更新文件并产生一次 commit（可选 push 即时生效）。
- 文章 slug = 目录名，按创作者唯一；草稿/发布由 frontmatter `status` 控制。

## 6. 功能模块（v0）

- **写作**：TipTap 编辑器→Markdown；草稿/发布；封面图；标签；图片上传（提交进内容仓库 `images/`）。
- **阅读**：文章页 `/@handle/<slug>`（SSR/SEO/OG）；创作者主页 `/@handle`；标签页 `/tag/<slug>`。
- **评论**：平铺、按时间；提交即作为文件写进内容仓库。
- **发现**（不做算法推荐）：首页最新已发布流；标签浏览。
- **杂志/合集**：创作者创建杂志收录文章并排序；杂志页 `/@handle/m/<slug>`。
- **账户**：GitHub 登录、白名单 gate、个人资料（写入 `profile.md`）。
- **v0 延后**：点赞(スキ)、关注、关注流（未来加，存 Neon）。

## 7. 关键路由

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | SSR | 最新文章流 |
| `/@:handle` | SSR | 创作者主页 |
| `/@:handle/:slug` | SSR | 文章阅读页 |
| `/@:handle/m/:magazineSlug` | SSR | 杂志页 |
| `/tag/:slug` | SSR | 标签页 |
| `/write`、`/write/:slug` | Client | 编辑器 |
| `/sign-in` | Client | GitHub 登录按钮 |
| `/settings` | Client | 资料设置 |
| `/api/auth/*` | Route Handler | Better Auth (GitHub OAuth 回调) |
| `/api/upload` | Route Handler | 图片上传→提交进内容仓库 |

## 8. 模块边界与可测试性

- **db/** — Drizzle client（`drizzle-orm/neon-http` + `@neondatabase/serverless`）+ schema（含 Better Auth 生成的表）。
- **auth/** — Better Auth(GitHub OAuth + Drizzle adapter + 白名单 gate)；对外 `getCurrentUser()`。
- **content/** — `ContentStore` 接口 + `GitHubContentStore`（Octokit + Markdown 解析/序列化 + frontmatter）。迁移接缝。
- **editor/** — TipTap 配置、Markdown 序列化；纯前端可独立测。
- **posts/ comments/ magazines/** — 领域 server actions，调用 `ContentStore`。

判据：能否不读内部实现就说清每个单元"做什么、怎么用、依赖什么"。`ContentStore` 与 `auth` 是关键解耦点。

## 9. 错误处理与测试策略

- **校验**：server action 入参用 zod；白名单拒绝返回明确 403。
- **认证错误**：Better Auth 钩子里用其 `APIError` 抛出（普通 `Error` 会被吞成通用 422）。
- **GitHub API**：处理 rate limit / 冲突；写失败返回可读错误。
- **测试**：
  - 单元：frontmatter 解析/序列化、Markdown 往返、白名单判断、slug 生成。
  - 集成：`GitHubContentStore` 对 Octokit 打桩（nock/MSW 或注入 fake client）；认证 gate 用 **pglite**（内嵌 Postgres）跑 Drizzle 进行真实集成。
  - happy-path E2E：GitHub 登录(mock) → 写 → 发布 → 阅读。
- **TDD**：每个功能先写测试。

## 10. 部署（Vercel 一键）

- README 提供 **Deploy to Vercel** 按钮，提示填写环境变量。
- **Neon**：通过 Vercel Marketplace 一键接入，自动注入 `DATABASE_URL`。
- **Drizzle 迁移**：`drizzle-kit` 生成 + 应用迁移；Better Auth 表通过 Better Auth CLI 生成 Drizzle schema 后纳入迁移。首次部署后跑一次迁移（构建步骤或一次性命令）。
- **环境变量**：`DATABASE_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`ALLOWED_GITHUB_USERS`、`GITHUB_CONTENT_REPO`。
- **本地开发**：`.env.local` 用 Neon 连接串（或本地 Postgres）；GitHub OAuth app 配 `http://localhost:3000` 回调。

## 11. 里程碑 / 计划拆分

- **Plan 1 — Foundation + Auth + Deploy（当前）**：scaffold、env、Drizzle+Neon、Better Auth(GitHub OAuth+白名单)、auth 路由、`getCurrentUser`、GitHub 登录页、Vercel 部署配置 + Deploy 按钮。产出：能用 GitHub 登录、白名单生效、可一键部署的空壳应用。
- **Plan 2 — 内容引擎**：`ContentStore` 接口 + `GitHubContentStore`（Octokit、Markdown、frontmatter、提交）。
- **Plan 3 — 写作与阅读**：TipTap 编辑器、草稿/发布、文章页、创作者主页、图片上传。
- **Plan 4 — 评论 + 发现 + 杂志。**
- **Plan 5 — 打磨**：资料设置、标签页、部署文档完善。

## 12. 未来展望

- 点赞(スキ)、关注、关注流（存 Neon）。
- 内容可选转存 Postgres（加 `DbContentStore`）。
- 付费/会员、通知、全文搜索、嵌套评论、GitHub App（比 OAuth token 更硬的内容写入凭证）。
