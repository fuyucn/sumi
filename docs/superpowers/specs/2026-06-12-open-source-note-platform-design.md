# Sumi 墨 — 开源自托管发布平台设计文档

> **Sumi（墨）**。一个 note.com 风格的、自托管的多创作者写作与发布平台。
> 日期：2026-06-12 · 状态：设计已批准，待写实现计划

## 1. 项目定位与目标

构建一个**开源、可自托管**的多创作者内容发布平台，气质对标 note.com：干净的写作体验、独立创作者主页、轻社交、简单可预测的内容发现。

三个核心目标，所有取舍都服务于它们：

1. **自托管易用** — 起步零外部依赖容器，一条命令跑起来。
2. **写作体验好** — TipTap 块状富文本编辑器，干净、所见即所得。
3. **贡献者友好** — 单一代码库、TypeScript 全栈、内容人类可读。

**明确不做**：支付/付费内容、算法个性化推荐、嵌套评论、移动 App（数据/接口为后续预留空间，但不实现）。

## 2. 两阶段架构（核心决策）

本项目分两个阶段演进，**从一开始就为阶段迁移而设计**：

| | **v0（前期开发 · 现在做）** | **v1（后期 · 完整版）** |
|---|---|---|
| 内容存储 | **git 仓库**（Markdown + 图片文件） | **PostgreSQL + Prisma** |
| 评论 | git 文件 | DB 表 |
| 账号/认证 | **Better Auth + SQLite**（文件型，无容器） | Better Auth + Postgres |
| 点赞(スキ)/关注 | **不做**（延后） | 完整支持 |
| 发现流 | 最新 + 标签 | 最新 + 标签 + 关注流 |
| 部署 | app 进程 + git 仓库 + sqlite 文件 | app + Postgres 容器 |

**迁移接缝：`ContentStore` 抽象接口。**
应用代码只依赖一个内容访问接口，不直接碰 git 或 DB：

```ts
interface ContentStore {
  listPosts(opts): Promise<PostMeta[]>
  getPost(handle, slug): Promise<Post | null>
  savePost(handle, post): Promise<void>
  deletePost(handle, slug): Promise<void>
  listComments(handle, slug): Promise<Comment[]>
  addComment(handle, slug, comment): Promise<void>
  listMagazines(handle): Promise<Magazine[]>
  // ...
}
```

- **v0** → `GitContentStore`：读写 git 里的 Markdown 文件。
- **v1** → `DbContentStore`：Postgres + Prisma。

因为 v0 内容是**标准 Markdown + frontmatter**，迁移 = 一次性"把文件导入 Postgres"的脚本，而非返工。

---

## 3. v0 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js (App Router) + TypeScript** | 前后端一体，单一部署单元 |
| 内容库 | **git 仓库（本地工作区 + 可选远程）** | 版本化、可读、可移植，零数据库容器 |
| 内容格式 | **Markdown + YAML frontmatter** | git diff 可读、可移植、易迁移到 DB |
| 编辑器 | **TipTap (ProseMirror)，序列化为 Markdown** | 干净富文本。支持的块限定在 Markdown 能干净表达的范围 |
| 认证 | **Better Auth + SQLite** | TS 原生、`@handle`、文件型存储无需容器 |
| 图片 | **git 仓库内独立文件**，正文相对路径引用 | git 原生用法；不用 base64 内联（会污染 diff、文件膨胀） |
| 部署 | **单 Docker 镜像 + docker-compose** | 一条命令跑起来 |

**应用形态**：单体 Next.js 应用。
- **Server Components** 渲染阅读类页面（SEO 友好）。
- **Server Actions / Route Handlers** 承载写操作。
- **Client Components** 承载编辑器与交互控件。

## 4. v0 内容仓库结构

```
content/
  @alice/
    profile.md                       # 创作者资料（昵称/简介/头像引用）
    my-first-post/
      index.md                       # frontmatter(title/tags/cover/status/publishedAt) + 正文 Markdown
      images/cover.png               # 图片独立文件，正文相对路径引用
      comments/
        2026-06-12T10-30-00-bob.md   # 每条评论一个文件(frontmatter: author/date + 正文)
    magazines/
      my-zine.md                     # frontmatter 列出收录文章引用 + 排序
```

- **文章 slug** = 目录名，按创作者唯一。
- **草稿/发布** 由 frontmatter `status: draft|published` 控制。

## 5. v0 写/读模型

- **写操作走串行 git 提交队列**：发布文章 / 上传图片 / 发评论 / 改资料 → 写文件 → `git add && git commit` →（若配置了远程）`git push`。串行化避免并发提交冲突。
- **读操作**直接读工作区文件，Markdown 解析渲染后在内存缓存；文件变更（含远程 pull）后失效缓存。
- **「链接 git」**：通过环境变量配置一个可选远程仓库地址 + 凭证，app 把内容 push 过去做备份/同步；远程也可作为内容的"真源"，由 webhook 触发 pull。

## 6. v0 功能模块

### 6.1 写作
- TipTap 编辑器（标题、段落/标题/列表/引用/代码/图片/链接/分隔线），序列化 Markdown
- 草稿 ↔ 发布
- 封面图、标签、摘要
- 图片上传 → 存入文章目录 `images/` 并提交

### 6.2 阅读
- 文章页 `/@handle/<slug>`（SSR、SEO、OG 标签）
- 创作者主页 `/@handle`（资料 + 文章列表）
- 标签页 `/tag/<slug>`

### 6.3 评论
- 平铺、按时间排序；提交即作为文件 commit 进 git

### 6.4 发现（不做算法推荐）
- 首页：全站最新已发布文章流
- 标签浏览

### 6.5 杂志/合集
- 创作者创建杂志、收录自己的文章并排序
- 杂志页 `/@handle/m/<slug>`

### 6.6 账户与运维
- Better Auth（SQLite）：注册/登录、邮箱密码 + 可选 OAuth、`@handle` 唯一
- 个人资料编辑（写入 `profile.md`）
- 实例配置 `signups: open | invite | closed`
- 基础 Admin（ADMIN 角色）：删违规文章/评论、封禁用户

**v0 明确延后**：点赞(スキ)、关注、关注流 → 留到 v1（DB 阶段）。

## 7. v0 关键路由

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | SSR | 最新文章流 |
| `/@:handle` | SSR | 创作者主页 |
| `/@:handle/:slug` | SSR | 文章阅读页 |
| `/@:handle/m/:magazineSlug` | SSR | 杂志页 |
| `/tag/:slug` | SSR | 标签页 |
| `/write`、`/write/:slug` | Client | 编辑器 |
| `/settings` | Client | 资料/账户设置 |
| `/admin` | Client(鉴权) | 基础管理 |
| `/api/auth/*` | Route Handler | Better Auth |
| `/api/upload` | Route Handler | 图片上传（写入 git） |

## 8. 模块边界与可测试性

按职责切分，接口清晰、可独立测试：

- **content/** — `ContentStore` 接口 + `GitContentStore` 实现（git 操作 + Markdown 解析/序列化 + frontmatter）。**这是 git→db 的接缝。**
- **auth/** — Better Auth(SQLite) 配置；对外 `getCurrentUser()`
- **editor/** — TipTap 配置、Markdown ↔ 编辑器状态序列化；纯前端可独立测
- **git/** — 串行提交队列、commit/push、可选 pull；对 content 暴露简单接口
- **posts/ comments/ magazines/** — 领域 server actions，调用 `ContentStore`，输入输出有明确类型

判据：能否不读内部实现就说清每个单元"做什么、怎么用、依赖什么"。`ContentStore` 接口是关键解耦点。

## 9. 错误处理与测试策略

- **校验**：所有 server action 入参用 zod 校验；handle/slug 唯一性冲突给明确错误。
- **鉴权**：写操作统一经 `getCurrentUser()` 守卫；越权改他人内容返回 403。
- **git 失败**：提交/推送失败要回滚工作区改动并返回可读错误；提交队列保证串行。
- **测试**：
  - 单元测试：slug 生成、frontmatter 解析/序列化、Markdown 往返、权限判断。
  - 集成测试：`GitContentStore` 在临时 git 仓库上跑（发布/评论/读取）。
  - 关键 happy-path E2E：注册 → 写 → 发布 → 他人阅读/评论。
- **TDD**：每个功能先写测试。

## 10. 部署（v0）

- 单 `Dockerfile` 构建 Next.js 生产镜像。
- `docker-compose.yml`：仅 app 一个服务；卷挂载 ① 内容 git 仓库目录 ② sqlite 文件。
- 环境变量：Better Auth secret、`signups` 模式、内容仓库路径、可选 git 远程地址+凭证。
- 首次启动：初始化内容仓库（若不存在）、跑 Better Auth 表迁移、可选 seed 首个 admin。

## 11. 里程碑（供实现计划参考）

1. 骨架 + Docker + Better Auth(SQLite) 跑通（注册/登录/`@handle`）
2. `ContentStore` 接口 + `GitContentStore`（含提交队列、Markdown 解析）
3. 写作与阅读核心（编辑器、草稿/发布、文章页、创作者主页、图片上传）
4. 评论（git 文件）
5. 发现（首页流、标签）+ 杂志/合集
6. Admin + 配置开关 + 部署文档 + 「链接远程 git」

## 12. v1 展望（后期 · 完整 DB 版）

- 新增 `DbContentStore`（Postgres + Prisma），写一次性迁移脚本把 Markdown 内容导入 DB。
- 补齐点赞(スキ)、关注、关注流。
- 为支付/会员预留的数据模型（`visibility`、`price`、订阅）在此阶段评估接入。
- 其余未来项：通知、全文搜索增强、嵌套评论、移动端、联邦/ActivityPub。
