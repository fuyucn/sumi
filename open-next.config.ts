// OpenNext for Cloudflare 配置 —— 描述如何把 Next.js 16 应用打包成 Cloudflare Worker。
// 由 `@opennextjs/cloudflare` 构建时读取（`pnpm cf:build`）。
// 这里启用 R2 增量缓存（复用 OpenNext 官方模板），worker 的缓存桶绑定见 wrangler.jsonc。
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
