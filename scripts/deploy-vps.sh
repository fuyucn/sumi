#!/usr/bin/env bash
# =============================================================================
# Sumi —— 单节点 VPS 一键部署脚本（部署路径 2 of 3）
#
# 用途:
#   在自有多节点 VPS（Ubuntu/Debian）上安装依赖、构建产物、执行数据库迁移，
#   并用 PM2 以 Node 常驻进程方式启动 Next.js 生产服务。
#
# 特性:
#   - 幂等: 重复运行安全，已安装/已启动的部分会自动跳过或复用。
#   - 自包含: 只需 bash + curl，脚本会按需安装 Node/pnpm/PM2。
#   - 使用 .env 提供环境变量（要求仓库根目录存在 .env 或 .env.local）。
#
# 用法:
#   # 1. 在仓库根目录准备好 .env（从 .env.example 复制并填好）
#   cp .env.example .env
#   # 2. 运行本脚本
#   bash scripts/deploy-vps.sh
#   # 3.（可选）覆盖端口或应用名
#   PORT=8080 APP_NAME=sumi bash scripts/deploy-vps.sh
#
# 依赖（若缺失会自动安装）: node, pnpm, pm2
# =============================================================================
set -euo pipefail

# ---------- 可配置变量（可被环境变量覆盖） ----------
APP_NAME="${APP_NAME:-sumi}"            # PM2 进程名
PORT="${PORT:-3000}"                    # 服务监听端口
NODE_MAJOR="${NODE_MAJOR:-22}"          # 目标 Node 大版本（与 Docker 保持一致）
APP_DIR="${APP_DIR:-$(pwd)}"            # 应用目录，默认当前目录
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"   # 环境变量文件

# 用法提示
if [ ! -f "$ENV_FILE" ]; then
  echo "[错误] 找不到环境文件: $ENV_FILE" >&2
  echo "请先执行: cp .env.example .env 并填写变量后重试。" >&2
  exit 1
fi

echo "==> 应用目录: $APP_DIR"

# ---------- 1. 安装系统依赖 ----------
echo "==> 检查并安装系统依赖 (curl, git)"
if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y curl
fi
if ! command -v git >/dev/null 2>&1; then
  sudo apt-get install -y git
fi

# ---------- 2. 安装 Node（若缺失或版本不符） ----------
install_node() {
  echo "==> 安装 Node $NODE_MAJOR (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
}
if ! command -v node >/dev/null 2>&1; then
  install_node
elif [ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]; then
  echo "==> Node 主版本不符，升级到 v$NODE_MAJOR"
  install_node
fi
echo "==> Node: $(node -v)"

# ---------- 3. 安装 pnpm ----------
if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> 安装 pnpm (corepack)"
  sudo corepack enable
  sudo corepack prepare pnpm@latest --activate
fi
echo "==> pnpm: $(pnpm -v)"

# ---------- 4. 安装项目依赖（幂等: 使用 lockfile） ----------
cd "$APP_DIR"
echo "==> 安装项目依赖"
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

# ---------- 5. 生成/应用最新数据库迁移 ----------
# db:migrate 幂等: Drizzle 只会应用尚未执行的迁移。
echo "==> 执行数据库迁移 (pnpm db:migrate)"
pnpm db:migrate

# ---------- 6. 构建生产产物 ----------
echo "==> 构建生产产物 (pnpm build)"
pnpm build

# ---------- 7. 安装/启动 PM2，并以常驻方式运行 ----------
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> 安装 PM2 (全局)"
  sudo pnpm add -g pm2
fi

echo "==> 启动/重启 PM2 进程 ($APP_NAME, 端口 $PORT)"
# --update-env 让 PM2 拉取 .env 中的最新环境变量
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start .next/standalone/server.js \
  --name "$APP_NAME" \
  --update-env \
  --env NODE_ENV=production \
  --env PORT="$PORT" \
  --env HOSTNAME=0.0.0.0
pm2 save

echo "==> 设置 PM2 开机自启（首次运行会返回手动粘贴的命令提示）"
pm2 startup systemd -u "$(whoami)" --hp "$HOME" || true

echo ""
echo "============================================================"
echo "部署完成。服务地址: http://<服务器IP>:$PORT"
echo "常用命令:"
echo "  pm2 logs $APP_NAME        # 查看日志"
echo "  pm2 restart $APP_NAME     # 重启"
echo "  pm2 status                # 查看状态"
echo "============================================================"
