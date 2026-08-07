# Sumi 墨 — 架构设计与核心流程

> 状态: v1 · 与 `docs/PRD.md` 配套，描述当前已实现的系统架构、数据模型与关键业务流程。
> 更新日期: 2026-08-07

---

## 1. 概述

Sumi 是一个开源的**个人空间门户**（对标 mx-space / Shiro 的产品形态:首页门户 + 文章 + 手记 + 标签体系），
同时保留多创作者协作能力（allowlist 门禁下的 GitHub 登录）。它的核心设计理念是:

- **内容即 Git**: 所有文章、图片、评论、杂志都以 Markdown + frontmatter 文件的形式，通过 GitHub API 提交到**创作者自己拥有的仓库**，天然可迁移、可版本化。
- **账号与内容分离**: 登录/会话数据放在 Postgres / D1，内容数据放在 GitHub 仓库或 Cloudflare D1+R2。两者通过 OAuth token 关联。
- **Serverless 友好**: 不在本地文件系统写内容，所有读写都走 GitHub API / 数据库绑定，可部署到 Cloudflare Workers、Docker 自托管或自定义 VPS。

一句话概括数据流:**GitHub OAuth 登录 → 会话库存会话 → 内容读写走 ContentStore（GitHub / D1+R2 任一后端）**。

---

## 2. 系统架构总览

```mermaid
flowchart TB
    subgraph Client["客户端"]
        WB["外部浏览器<br/>http://localhost:3005"]
        IB["内置浏览器 (proxy)<br/>app.sumi.orb.local"]
    end

    subgraph Next["Sumi — Next.js 16 (App Router, TS)"]
        Pages["页面 (SSR)<br/>portal home / article / creator / tags / search / write / settings"]
        SA["Server Actions<br/>savePost / addComment / saveProfile / saveMagazine / like / follow"]
        API["API 路由<br/>/api/auth/*"]
        Auth["Better Auth<br/>GitHub OAuth + allowlist"]
        Env["env 校验 (zod)"]
    end

    subgraph DataLayer["数据层"]
        PG[("Postgres / Neon / D1<br/>user/session/account (Drizzle ORM)")]
        Repo["GitHub 内容仓库<br/>content/... (Octokit)"]
        CF[("Cloudflare D1 + R2<br/>CF_ENABLED=1 时替代 GitHub 后端")]
    end

    OAuth["GitHub OAuth 授权页"]

    WB --> Pages
    IB --> Pages
    Pages --> SA
    Pages --> API
    SA --> Auth
    API --> Auth
    Auth --> PG
    Pages --> Repo
    SA --> Repo
    Pages -.-> CF
    SA -.-> CF
    Auth --> OAuth
    OAuth --> API
```

**强调**: 页面渲染是 SSR（`export const dynamic = "force-dynamic"`），每次请求实时从 GitHub API 拉取内容，因此"发布即生效、无需重新部署"。

---

## 3. 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript | SSR 页面 / Server Actions / API 路由 |
| 样式 | Tailwind CSS 4 + `@tailwindcss/typography` | 设计令牌（墨纸朱印）+ 阅读排版 |
| 字体/图标 | `next/font` Geist + Newsreader / `@phosphor-icons/react` | 无衬线 UI + 衬线阅读字体;单一图标族 |
| 动效 | `motion`（CSS 令牌 `.rise/.lift/.press` 为主） | 入场、卡片 lift、按压缩放 |
| 编辑器 | TipTap 3 + `tiptap-markdown` | 富文本 ↔ Markdown 双向转换 |
| Markdown | `gray-matter`(frontmatter) + `react-markdown` + `remark-gfm` | 解析/序列化与渲染 |
| 认证 | Better Auth + GitHub OAuth | 登录、会话、allowlist 门禁 |
| ORM | Drizzle + `postgres`(postgres-js) | Postgres 访问（Neon 兼容） |
| GitHub | `@octokit/rest` | 内容仓库读写 |
| 校验 | zod | env / 表单 / 输入校验 |
| 测试 | Vitest + PGlite + vite-tsconfig-paths | 单测、auth 门禁、内容 store |
| 部署 | Docker compose（一键自托管, :3005）/ VPS 脚本 / Cloudflare Workers (OpenNext) | Docker/VPS 用 `output: "standalone"`，CF 由 OpenNext 复用该产物 |

---

## 4. 分层与模块

### 4.1 表现层（页面与组件）
- `src/app/*` — App Router 页面:**门户首页**（身份区 + 最新文章 + 标签云）、文章页 `/[handle]/[slug]`、创作者页 `/[handle]`、手记时间线 `/[handle]/notes`、友链页 `/friends`、标签库 `/tags` 与标签页 `/tag/[slug]`、搜索 `/search`、写作 `/write`、杂志 `/write/magazines`、设置 `/settings`、登录 `/sign-in`。
- `src/components/*` — 客户端组件:TipTap 编辑器、评论表单、杂志表单、资料表单、导航栏等。
- 公共读页面一律通过 `getReadContentStore()`（匿名 Octokit）读公开仓库，无需登录即可浏览。

**UI 设计系统（ink-on-paper）**: 全局令牌定义在 `src/app/globals.css` 的 `@theme` 中:
- 配色: 纸 `paper #f7f4ec` 系 + 墨 `ink #1e1b16` 系 + 单一朱印色 `seal #b3402e`（亮/暗双模式）。
- 字体: 无衬线 `Geist`（UI）+ 衬线 `Newsreader`（阅读正文与标题），经 `next/font/google` 自托管。
- 形状: 卡片 14px / 输入 10px / 交互元素 pill 的统一圆角规则;阴影按背景色着色。
- 动效: `.rise` 入场、`.lift` 卡片悬停、`.press` 按压反馈，均包裹 `prefers-reduced-motion`。
- 品牌: 首页门户含身份区（统计数字、墨印卡片 CTA）、最新文章索引（日期栏 + 悬停位移）、标签云（按使用量缩放字号）。

### 4.2 应用层（Server Actions 与 API）
- `src/app/write/actions.ts` + `actions-core.ts` — 保存/删除文章、图片上传（`"use server"`）。
- `src/app/community/actions.ts` + `actions-core.ts` — 评论、资料、杂志、手记、友链的增删改。
- `src/app/api/auth/[...all]/route.ts` — 将 Better Auth 挂到 Next 的 catch-all 路由（GET/POST）。
- 每个 action 都先经过 `resolveDeps()`（`src/lib/session.ts`）解析「当前用户 id / handle / content store」，再由 `guard()` 校验登录态与配置。

### 4.3 服务层（核心库）
- `src/lib/auth.ts` — Better Auth 单例（惰性 Proxy），GitHub OAuth + 自定义 `username` 字段 + allowlist 门禁 hook。
- `src/lib/env.ts` — zod 校验环境变量，惰性加载单例。
- `src/lib/db.ts` — Drizzle + postgres-js 惰性单例。
- `src/lib/github.ts` — Octokit 封装成 `GitHubClient`（文件读写/目录列举/二进制上传）。
- `src/lib/current-user.ts` / `session.ts` / `user.ts` — 会话与 handle 解析。

### 4.4 内容层（ContentStore 抽象）
- `src/content/store.ts` — `ContentStore` 接口（文章/评论/杂志/资料/图片/手记/友链的统一读写，是 GitHub / Postgres / Cloudflare 三后端共用的接缝）。
- `src/content/github-content-store.ts` / `db-content-store.ts` / `cloudflare-content-store.ts` — 同一接口的三个实现（Git 文件 / Postgres 镜像 / D1+R2），手记与友链在三个后端行为一致。
- `src/content/frontmatter.ts` — Markdown ↔ frontmatter 序列化/解析（含手记）。
- `src/content/paths.ts` — 仓库目录约定与 slug 规则。
- `src/content/types.ts` — 领域类型（`Post / Comment / Magazine / Profile`，以及手记 `Note`、友链 `Friend`）。
- `src/content/feed.ts` — 聚合各创作者的已发布文章，按 `publishedAt` 倒序。
- `src/content/index.ts` — 工厂函数：`getReadContentStore()`（匿名读）与 `getContentStoreForUser()`（用 OAuth token 写）。

---

## 5. 数据模型

### 5.1 关系库 (Postgres / Neon) — 认证、会话与 agent 密钥

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ ACCOUNT : has
    ACCOUNT }o--|| USER : belongs_to
    USER {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        text username UK "GitHub login"
        timestamp created_at
        timestamp updated_at
    }
    SESSION {
        text id PK
        text token UK
        timestamp expires_at
        text user_id FK
        text ip_address
        text user_agent
    }
    ACCOUNT {
        text id PK
        text account_id
        text provider_id "github"
        text user_id FK
        text access_token "OAuth token → Git 写入"
        text refresh_token
    }
    AGENT_KEYS {
        text id PK
        text agent_handle UK "创作手柄 @<handle>"
        text display_name
        text key_hash "SHA-256 摘要, 明文只展示一次"
        text public_key "Ed25519 公钥, 校验请求签名"
        timestamp created_at
        timestamp last_used_at
    }
```

- 认证表 `user` / `session` / `account` / `verification`（`src/db/schema.ts`）。
- `agent_keys`（`src/db/schema.ts`）为 agent 发布服务：只存 SHA-256 密钥摘要与
  Ed25519 公钥，`scripts/create-agent.ts` 一次性签发明文 bearer key + 私钥 JWK。
- `account.access_token` 存 GitHub OAuth token，`src/content/github-token.ts` 据此为已登录用户建立可写 store。
- `user.username` 存 GitHub login（`mapProfileToUser` 写入），是内容路径 `@<handle>` 的来源。

### 5.2 内容仓库 (GitHub) — 所有创作者内容

```mermaid
graph TD
    Root["content/"] --> H["@fuyucn/"]
    Sub["@another-creator/"] -.同构.-> Root

    H --> P["my-first-post/<br/>(slug，来自标题)"]
    P --> PI["index.md"]
    P --> IMG["images/*<br/>(上传的图片)"]
    P --> C["comments/<br/>2026-08-02...-author.md"]

    H --> MAG["magazines/"]
    MAG --> M1["daily.md"]
    MAG --> M2["essays.md"]

    H --> PROF["profile.md"]
    H --> NOTES["notes/"]
    NOTES --> N1["2026-08-07...-handle.md"]

    Root --> F["friends.json<br/>(站点级)"]
```

- 每篇文章一个目录：`content/@<handle>/<slug>/index.md`，frontmatter 含 `title / tags / status / publishedAt / excerpt / coverImage`，正文为 Markdown。
- 图片提交到 `content/@<handle>/<slug>/images/<name>`（base64 经 Octokit 写入）。
- 评论是扁平文件：`comments/<ISO时间戳>-<作者handle>.md`，按 `date` 升序列出。
- 杂志（合集）：`magazines/<mag>.md`，frontmatter 含 `title / description / items[]`。
- 资料：`profile.md`，frontmatter 含 `displayName / bio`。
- 手记（时间线）：`notes/<ISO时间戳>-<handle>.md`，frontmatter 含 `author / date`，按 `date` 降序列出。
- 友链：站点级单文件 `content/friends.json`，数组 `{ friends: [{ id, name, url, avatar?, bio?, createdAt }] }`，按 `createdAt` 升序展示。
- `paths.ts` 集中定义这些约定，`slugify()` 负责标题转 slug。

> Postgres 镜像（`DbContentStore`）用 `sumi_notes` / `sumi_friends` 表承载同样的数据；Cloudflare D1 用 `notes` / `friends` 表，建表 SQL 见 `drizzle/d1-schema.sql`（`drizzle/*.sql` 迁移为 Postgres 方言，不适用于 D1）。

---

## 6. 核心业务流程（Flow 图）

### 6.1 登录认证（GitHub OAuth + Allowlist 门禁）

```mermaid
sequenceDiagram
    participant U as 浏览器用户
    participant N as Next.js (SSR 页面)
    participant BA as Better Auth
    participant GH as GitHub OAuth
    participant DB as Postgres

    U->>N: GET /sign-in
    N-->>U: 渲染登录页 (client 组件)
    U->>N: 点击 "Continue with GitHub"
    N->>BA: POST /api/auth/sign-in/social {provider: github}
    BA->>BA: origin 校验 (BETTER_AUTH_TRUSTED_ORIGINS)
    BA-->>U: 302 → GitHub 授权页 (client_id, PKCE)
    U->>GH: 登录并授权 (scope: repo, read:user)
    GH-->>U: 302 → /api/auth/callback/github?code=...&state=...
    U->>N: GET callback
    N->>BA: code 交换 access_token
    BA->>GH: 换取用户资料 (login)
    BA->>BA: mapProfileToUser → username = login
    alt 不在 ALLOWED_GITHUB_USERS
        BA-->>U: 403 FORBIDDEN (账号未开通)
    else 允许
        BA->>DB: 写入/更新 user + account(accessToken) + session
        BA-->>U: Set-Cookie 会话 → 跳转首页
    end
```

### 6.2 阅读 / 首页 Feed（匿名只读）

```mermaid
sequenceDiagram
    participant R as 读者(未登录)
    participant N as Next.js SSR
    participant CS as ReadContentStore (匿名 Octokit)
    participant G as GitHub API

    R->>N: GET / (或 /@handle, /@handle/slug, /tag/slug)
    N->>CS: getReadContentStore() (env.GITHUB_CONTENT_REPO)
    CS->>G: 枚举 content/ 下所有 @creator
    CS->>G: 逐个读取 index.md (含 comments、profile、magazines)
    G-->>CS: markdown + frontmatter
    CS-->>N: parsePost/parseComment → 内存对象
    N-->>R: 渲染首页 feed / 文章正文 / 评论区
```

### 6.3 写作与发布（登录用户）

```mermaid
sequenceDiagram
    participant W as 创作者
    participant E as TipTap Editor (client)
    participant A as savePostAction (server)
    participant D as resolveDeps (session + token + store)
    participant CS as GitHubContentStore (写)
    participant G as GitHub API

    W->>E: 编辑 Markdown + tags + publish
    E->>A: 提交 WriteForm (title/body/tags/publish)
    A->>D: getCurrentUser() → getUserHandle() → getContentStoreForUser()
    D-->>A: {userId, handle, store}
    A->>A: buildNewPost (zod) → slugify(title)
    A->>CS: savePost(handle, post)
    CS->>G: GET 既有文件 (拿 sha，避免冲突)
    CS->>G: PUT content/@handle/<slug>/index.md
    G-->>CS: 生成 commit
    CS-->>A: slug
    A-->>W: 跳转 /@handle/<slug>（已发布）或 /write?draft
```

### 6.4 图片上传

```mermaid
sequenceDiagram
    participant W as 创作者
    participant E as Editor
    participant A as uploadImageAction
    participant CS as ContentStore
    participant G as GitHub API

    W->>E: 选择/拖入图片
    E->>A: {title, filename, base64}
    A->>CS: uploadImage(handle, slug, safeName, bytes)
    CS->>G: PUT .../images/<safeName> (base64)
    G-->>CS: commit
    CS-->>A: 相对路径 images/<name>
    A-->>E: 插入 markdown 图片引用
```

### 6.5 评论

```mermaid
sequenceDiagram
    participant R as 已登录读者
    participant P as 文章页
    participant A as addCommentAction
    participant CS as ContentStore
    participant G as GitHub API

    R->>P: 填写评论 → 提交
    P->>A: addCommentAction(form)
    A->>A: zod 校验 (commentFormSchema)
    A->>CS: addComment(postHandle, slug, body, authorHandle, now)
    CS->>G: PUT comments/<ts>-<author>.md
    G-->>CS: commit
    CS-->>A: Comment (handle/date/body)
    A-->>R: 立即就地追加显示
```

### 6.6 杂志（合集）与 6.7 资料

```mermaid
sequenceDiagram
    participant C as 创作者
    participant A as saveMagazineAction / saveProfileAction
    participant CS as ContentStore
    participant G as GitHub API

    C->>A: 杂志表单 (title/description/items) 或资料表单 (displayName/bio)
    A->>A: zod 校验后组装
    A->>CS: saveMagazine → magazines/<slug>.md 或 saveProfile → profile.md
    CS->>G: GET sha → PUT frontmatter 文件
    G-->>CS: commit
    CS-->>A: slug / ok
    A-->>C: 跳转 /@handle/m/<slug> 或刷新创作者主页
```

### 6.8 部署拓扑（Docker 一键 + Cloudflare + 自定义 VPS）

```mermaid
flowchart LR
    subgraph Local["Docker 自托管 (docker compose up -d)"]
        direction TB
        DB["db: postgres:16-alpine<br/>(healthcheck + pgdata 卷)"]
        MIG["migrate: drizzle-kit migrate<br/>(one-shot, 成功才起 app)"]
        APP["app: Next.js standalone<br/>:3005 → 容器 :3000 (uid 1001)"]
        DB -->|healthy| MIG -->|completed| APP
    end

    subgraph Cloud["Cloudflare (免费, CF_ENABLED=1)"]
        direction TB
        WAPP["OpenNext Worker"]
        D1[("D1 会话/内容")]
        R2[("R2 图片 + 缓存")]
        WAPP --> D1
        WAPP --> R2
    end

    Local -->|GITHUB_CONTENT_REPO| GHRepo["GitHub 内容仓库"]
    Cloud -->|GITHUB_CONTENT_REPO| GHRepo
```

- **Docker 一键**: `docker compose up -d --build`，宿主端口 `:3005` 映射容器 `:3000`。`migrate` 与 `app` 通过 `depends_on: service_completed_successfully` 保证迁移先行（`Dockerfile` / `docker-compose.yml`）。
- **Cloudflare 免费托管**: `pnpm cf:build && pnpm cf:deploy`，OpenNext 把 Next 构建为 Worker；会话/内容走 D1（`DB` 绑定），图片走 R2（`IMAGES` 绑定），前置资源创建见 §11.2。
- **自定义 VPS**: `bash scripts/deploy-vps.sh` 幂等安装 Node/pnpm/PM2、构建、迁移并常驻运行。
- `env_file: .env` 注入配置；`BETTER_AUTH_TRUSTED_ORIGINS` 用于信任本地代理来源（如内置浏览器 `app.sumi.orb.local`），详见 `README` 的 Docker 一节。

### 6.9 Agent 自动化发布（MCP）

```mermaid
sequenceDiagram
    participant AG as Agent (Claude Code 等)
    participant MCP as mcp/index.mjs (stdio) 或 /api/mcp (Streamable HTTP)
    participant API as /api/agent/* 路由
    participant AUTH as agent-auth (bearer + Ed25519)
    participant CS as ContentStore
    participant W as 人类 /write 仪表盘

    AG->>MCP: sumi_write_post(title, body, tags, publish?)
    MCP->>API: POST /api/agent/posts + Bearer key + X-Agent-Signature
    API->>AUTH: hashApiKey → 查 agent_keys + 验签 + 时间窗
    AUTH-->>API: agentHandle
    API->>CS: savePost(handle, {..., agent: true, status: draft})
    CS-->>API: slug
    API-->>MCP: { slug, status: "draft" }
    MCP-->>AG: 结果

    W->>W: /write 按 agent handle 分组列出草稿
    W->>W: approveAgentDraftAction / deleteAgentDraftAction
    W->>CS: savePost(status: "published", agent: true)
```

- 双因子认证：bearer key 标识 + Ed25519 签名（`method + path + body + timestamp`
  规范化串），时间窗防重放；泄露 bearer key 无法冒用（`src/lib/agent-auth.ts`、
  `src/lib/agent-signature.ts`）。
- 安全默认：agent 写入一律先落 **draft**，人类在 `/write` 审批后才发布；
  草稿带 `agent: true` 标记并归属 `agent_keys.agent_handle`。
- 同一套 `ContentStore` 接缝 → GitHub / Postgres 镜像 / Cloudflare D1 三种后端
  无需改动即可支持 agent 发布；远程 MCP 仅限长驻 Node 运行时（Docker / VPS）。

---

## 7. 目录结构与职责速查

| 路径 | 职责 |
|---|---|
| `src/app/` | App Router 页面与路由（SSR + Server Actions + API） |
| `src/components/` | 客户端 UI 组件（编辑器、表单、卡片、导航） |
| `src/content/` | 内容层:`ContentStore` 接口、GitHub 实现、frontmatter、路径、feed |
| `src/lib/` | 基础设施:auth、env、db、github 客户端、session、user、allowlist |
| `src/db/schema.ts` | Drizzle 表结构（认证/会话 + agent_keys） |
| `src/app/api/agent/` | agent 发布 REST 路由（me / posts CRUD / images） |
| `src/app/api/mcp/` | 远程 Streamable HTTP MCP 服务器（会话注册表 + 限流） |
| `mcp/` | 零依赖 stdio MCP 服务器 + 签名客户端（`index.mjs` / `lib/sign.mjs`） |
| `drizzle/` | 迁移文件（`db:generate` / `db:migrate`） |
| `docs/` | PRD / 架构文档 / 计划 |

---

## 8. 关键设计决策与取舍

1. **内容放 GitHub、会话放 Postgres** —— 创作者完全掌控内容，版本化免费；数据库只承担轻量认证，符合 serverless/低成本诉求。
2. **统一 `ContentStore` 抽象** —— 目前只有 `GitHubContentStore`，但接口预留了未来 `DbContentStore`（镜像到 Postgres）的接缝。
3. **slug 派生自标题** —— 改标题会产生新路径（旧文件被孤儿化），代码注释明确提示;这是 v0 的取舍。
4. **Allowlist 门禁只在建号时执行** —— 用户被移出 allowlist 后仍可登录（注释注明权衡，撤销需改 `sign-in` 检查）。
5. **一切读写走 HTTP** —— 无本地 FS 写入，图片 base64 提交到仓库，天然 serverless 可移植。
6. **惰性单例 (Proxy)** —— `env / db / auth` 均在首次访问才初始化，避免测试与构建期触发副作用。
7. **正则校验前置** —— `env.ts` 用 zod 在启动期暴露配置错误（如 `DATABASE_URL`、GitHub 凭据）。

---

## 9. 测试与验证

- **单元测试**: Vitest 27 个文件 / 161 个用例，覆盖 frontmatter 序列化、路径与 slug、feed 排序、搜索相关性、Server Action 核心（用依赖注入注入 `store`/`now`）、GitHub/Cloudflare store 集成（mock）、auth 门禁（PGlite 内存库）、评论深度与删除。
- **质量门禁**: `pnpm typecheck`、`pnpm test`、`pnpm lint`、`pnpm build`、以及 Docker 冒烟（`docker compose up -d` + `curl :3005` = 200）。

---

## 10. 环境变量一览（`src/lib/env.ts` 强校验）

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres/Neon 连接串（Docker 默认 `postgresql://sumi:sumi@db:5432/sumi`） |
| `BETTER_AUTH_SECRET` | ✅ | 会话签名密钥（≥32 字符） |
| `BETTER_AUTH_URL` | ✅ | 应用公开地址（默认 `http://localhost:3000`） |
| `BETTER_AUTH_TRUSTED_ORIGINS` | ⭕ | 额外信任的 auth 来源，逗号分隔（如本地代理/自定义域名） |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App 凭据 |
| `ALLOWED_GITHUB_USERS` | ⭕ | 允许登录的用户名，逗号分隔（空 = 拒绝所有人） |
| `GITHUB_CONTENT_REPO` | ⭕ | 内容仓库 `owner/repo`（未配置则只读页面为空） |
| `GITHUB_CONTENT_TOKEN` | ⭕ | 公开读取私有/限流仓库的可选 token |
| `CF_ENABLED` | ⭕ | Cloudflare 运行开关（置 "1" 时命中 CF 内容后端；Docker/VPS 留空） |

---

## 11. 部署目标与运行时存储后端

Sumi 的单一代码库可部署到三种目标，它们共享同一套 `next.config.ts`（`output: "standalone"`）与同一份 zod env schema，互不影响：

| 部署路径 | 命令/方式 | 数据层 | 说明 |
|---|---|---|---|
| **1. Docker 一键** | `docker compose up -d --build` | 内置 Postgres + GitHub 内容仓库 | 开箱即用，compose 自动执行迁移后启动应用 |
| **2. 自定义 VPS** | `bash scripts/deploy-vps.sh` | 自有 Postgres/Neon + GitHub 内容仓库 | 脚本幂等安装 Node/pnpm/PM2、构建、迁移并常驻运行 |
| **3. Cloudflare (Workers/OpenNext)** | `pnpm cf:build && pnpm cf:deploy` | D1 绑定 `DB` + R2 绑定 `IMAGES` | OpenNext 把 Next 构建成 Worker，数据走 CF 绑定 |

> 备注：Cloudflare 是**首选免费路径**（`CF_ENABLED=1` 时内容走 D1+R2），Docker/VPS 则默认走 Postgres + GitHub API。三条路径共享同一套 `ContentStore` 抽象与 env 校验，可随时切换。

### 11.1 运行时如何选择存储后端（ContentStore 工厂）

所有内容读写都经由 `src/content/store.ts` 的 `ContentStore` 接口。**具体工厂函数由编排方（orchestrator）负责实现**，本文件仅说明其选择模型：

```text
env.CF_ENABLED 是否为真？
├─ 是 → 构造 Cloudflare 后端（D1 绑定 `DB` + R2 绑定 `IMAGES` 传入 Binding 层）
└─ 否 → DB_MIRROR=1 且 DATABASE_URL 可用？
         ├─ 是 → 构造 Postgres 镜像后端（DbContentStore）
         └─ 否 → 构造 GitHub 后端（GitHubContentStore，走 Octokit 读写内容仓库）
```

要点：
- `ContentStore` 接口（`src/content/store.ts`）保持不变；GitHub / Postgres 镜像 / Cloudflare D1+R2 三个实现都实现同一接口，保证 Server Actions / 页面只依赖抽象（工厂见 `src/content/index.ts`）。
- `env.CF_ENABLED` 是唯一提示键（见 §10）。CF 绑定（D1/R2）由 `wrangler.jsonc` 声明并在 Worker 运行时注入，**不会**以 `process.env` 形式出现。
- 三种目标共用同一套 GitHub OAuth 认证与会话表（Postgres 或 D1 建模由各后端负责）。

### 11.2 Cloudflare 前置资源

`wrangler.jsonc` 声明了以下绑定，部署前需用 wrangler 创建并回填 ID：

```bash
pnpm dlx wrangler d1 create sumi-db                 # → 回填 database_id 到 wrangler.jsonc
pnpm dlx wrangler r2 bucket create sumi-opennext-cache
pnpm dlx wrangler r2 bucket create sumi-images
```

D1 内容表建表（Postgres 方言的 `drizzle/*.sql` 不适用于 D1，请用专用 D1 DDL）：

```bash
pnpm dlx wrangler d1 execute sumi-db --remote --file=drizzle/d1-schema.sql
```

D1/R2 的运行时访问由 Worker 绑定（`DB` / `IMAGES`）提供，不经过 `src/lib/db.ts` 的 Postgres 驱动。

---

> 相关文档: [PRD](docs/PRD.md) · 设计稿 `docs/superpowers/specs/2026-06-12-open-source-note-platform-design.md` · 使用教程见 `README.md`
