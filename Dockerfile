# syntax=docker/dockerfile:1

# ---- base: node + pnpm ----
FROM node:22-alpine AS base
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps: install from lockfile ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: full build (also runs drizzle-kit for migrations) ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG BUILD_ENV=production
ENV NODE_ENV=${BUILD_ENV}
RUN pnpm build

# ---- migrate: one-shot stage for `pnpm db:migrate` ----
FROM builder AS migrate
CMD ["pnpm", "db:migrate"]

# ---- runner: minimal image from the standalone build ----
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
