# Sumi 墨 — 开源自托管发布平台设计文档

> **Sumi（墨）**。一个 note.com 风格的、自托管的多创作者写作与发布平台。
> 日期：2026-06-12 · 状态：设计已批准，待写实现计划

## 1. 项目定位与目标

构建一个**开源、可自托管**的多创作者内容发布平台，气质对标 note.com：干净的写作体验、独立创作者主页、轻社交（关注/点赞/评论）、简单可预测的内容发现。

三个核心目标，所有取舍都服务于它们：

1. **自托管易用** — `docker compose up` 即可运行，单一应用 + 单一数据库，零外部强依赖。
2. **写作体验好** — TipTap 块状富文本编辑器，干净、所见即所得。
3. **贡献者友好** — 单一代码库、TypeScript 全栈、schema 即文档。

**明确不做（本期 YAGNI）**：支付/付费内容、算法个性化推荐、嵌套评论、移动 App。
其中**支付**在数据模型上预留扩展空间，但本期不实现任何收费流程。

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js (App Router) + TypeScript** | 前后端一体，单一部署单元 |
| 数据库 | **PostgreSQL** | 关系清晰，自带全文检索够用 |
| ORM | **Prisma** | schema 即文档，迁移友好 |
| 编辑器 | **TipTap (ProseMirror)** | 干净的块状富文本，内容存 ProseMirror JSON |
| 认证 | **Better Auth** | TS 原生、Prisma adapter、username 插件做 `@handle`、自托管数据自持 |
| 图片存储 | **本地文件系统（默认）+ 可选 S3 兼容** | 起步零依赖，规模化再切 S3 |
| 部署 | **单 Docker 镜像 + docker-compose** | 一条命令跑起来 |

**应用形态**：单体 Next.js 应用。
- **Server Components** 渲染阅读类页面（文章页、创作者主页、标签页）→ SEO 友好。
- **Server Actions / Route Handlers** 承载写操作（发布、关注、点赞、评论）。
- **Client Components** 承载编辑器与交互控件。

## 3. 数据模型（Prisma）

```
User
  id, handle (unique), displayName, bio, avatarUrl, role (USER|ADMIN)
  createdAt, updatedAt
  ← Better Auth 管理认证相关表（account/session/verification）

Post
  id, authorId → User
  title, slug (unique per author), content (Json, ProseMirror), excerpt
  coverImageUrl, status (DRAFT|PUBLISHED), publishedAt, createdAt, updatedAt

Tag
  id, name (unique), slug (unique)

PostTag        (Post ↔ Tag 多对多)
  postId, tagId

Follow
  followerId → User, followingId → User   (复合主键)

Like           (スキ)
  userId → User, postId → Post            (复合主键)

Comment
  id, postId → Post, authorId → User, body (text), createdAt
  （平铺，不做嵌套）

Magazine       (杂志/合集)
  id, ownerId → User, title, slug, description, coverImageUrl, createdAt

MagazinePost   (Magazine ↔ Post 多对多 + 排序)
  magazineId, postId, position
```

**支付预留**：`Post` 后续可加 `visibility (PUBLIC|PAID)` 与 `price`，`Magazine` 可作为订阅单元——本期不建这些字段，仅在设计上确认不会与现有结构冲突。

## 4. 功能模块（MVP 范围）

### 4.1 写作
- TipTap 编辑器：标题、正文（段落/标题/列表/引用/代码/图片/链接/分隔线）
- 草稿 ↔ 发布 状态切换
- 封面图、标签、摘要（可自动从正文截取）
- 自动保存草稿

### 4.2 阅读
- 文章页 `/@handle/<slug>`（SSR、SEO 友好、OG 标签）
- 创作者主页 `/@handle`（简介 + 文章列表 + 关注按钮）
- 标签页 `/tag/<slug>`（该标签下最新文章）

### 4.3 社交
- 关注 / 取关
- スキ（点赞）
- 评论（平铺、按时间排序）

### 4.4 发现（不做算法推荐）
- 首页：全站最新已发布文章流
- 标签浏览
- "关注中"：已登录用户看自己关注对象的文章流

### 4.5 杂志/合集
- 创作者创建杂志，将自己的文章加入并排序
- 杂志页 `/@handle/m/<slug>` 展示合集内文章

### 4.6 账户与运维
- Better Auth：注册/登录、邮箱密码 + 可选 OAuth、`@handle` 唯一
- 个人资料编辑（昵称/简介/头像）
- 实例配置 `signups: open | invite | closed`（invite 且只邀请自己 = 单作者模式）
- 基础 Admin（ADMIN 角色）：封禁用户、删除违规文章/评论

## 5. 关键页面与路由

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | SSR | 最新文章流 |
| `/@:handle` | SSR | 创作者主页 |
| `/@:handle/:slug` | SSR | 文章阅读页 |
| `/@:handle/m/:magazineSlug` | SSR | 杂志页 |
| `/tag/:slug` | SSR | 标签页 |
| `/feed` | SSR(鉴权) | 关注中的文章流 |
| `/write`、`/write/:postId` | Client | 编辑器 |
| `/settings` | Client | 资料/账户设置 |
| `/admin` | Client(鉴权) | 基础管理 |
| `/api/auth/*` | Route Handler | Better Auth |
| `/api/upload` | Route Handler | 图片上传（本地/S3） |

## 6. 模块边界与可测试性

按职责切分，各自接口清晰、可独立测试：

- **auth/** — Better Auth 配置与 session 读取；对外暴露 `getCurrentUser()`
- **db/** — Prisma client + 查询封装（repository 风格），UI 不直接拼查询
- **editor/** — TipTap 配置、ProseMirror JSON ↔ 渲染；纯前端，可独立测
- **storage/** — 图片存储抽象接口 `StorageProvider`，本地与 S3 两个实现
- **posts/ follows/ likes/ comments/ magazines/** — 各领域的 server actions + 查询，输入输出有明确类型

判据：能否不读内部实现就说清每个单元"做什么、怎么用、依赖什么"。`storage` 的 provider 接口是关键解耦点（本地 ↔ S3 可换）。

## 7. 错误处理与测试策略

- **校验**：所有 server action 入参用 zod 校验；handle/slug 唯一性冲突给出明确错误。
- **鉴权**：写操作统一经 `getCurrentUser()` 守卫；越权（改他人文章）返回 403。
- **测试**：
  - 单元测试领域逻辑（slug 生成、权限判断、ProseMirror 序列化）。
  - 集成测试关键 server action（发布文章、关注、点赞、评论）跑在测试库上。
  - 关键 happy-path E2E（注册 → 写 → 发布 → 他人阅读/点赞/评论）。
- **TDD**：实现阶段对每个功能先写测试。

## 8. 部署

- 单个 `Dockerfile` 构建 Next.js 生产镜像。
- `docker-compose.yml`：app + postgres + （可选）卷挂载本地图片目录。
- 通过环境变量配置：数据库 URL、Better Auth secret、`signups` 模式、存储后端（local/s3）、可选 S3 凭证。
- 首次启动跑 Prisma migrate + 可选 seed（创建首个 admin）。

## 9. 里程碑式交付建议（供实现计划参考）

1. 项目骨架 + Docker + Prisma schema + Better Auth 跑通（能注册登录）
2. 写作与阅读核心（编辑器、草稿/发布、文章页、创作者主页）
3. 社交层（关注、点赞、评论）
4. 发现层（首页流、标签、关注流）
5. 杂志/合集
6. Admin + 配置开关 + 打磨/部署文档

## 10. 范围外（未来可扩展）

付费内容与会员（已预留数据模型空间）、算法推荐、嵌套评论、通知系统、全文搜索增强、移动端、联邦/ActivityPub。
