#!/usr/bin/env bash
# ============================================================
# poetry-app — Simple Deploy Script
# Works locally (Docker Desktop) and on any Linux VPS.
#
# Usage:
#   chmod +x build-and-run.sh
#   ./build-and-run.sh deploy   # build & run
#   ./build-and-run.sh stop     # stop container
#   ./build-and-run.sh logs     # tail container logs
#   ./build-and-run.sh status   # show container status
# ============================================================

# Inherited nounset (BASH_ENV / SHELLOPTS) breaks optional expansions below.
set +o nounset 2>/dev/null || true
set -eo pipefail

APP_NAME="poetry-app"
IMAGE="${APP_NAME}:latest"
CONTAINER="${APP_NAME}"
TARGET_PORT=3000

GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[0;31m'
NC=$'\033[0m'
log()  { echo -e "${GREEN-}[INFO]${NC-} $*"; }
warn() { echo -e "${YELLOW-}[WARN]${NC-} $*"; }
err()  { echo -e "${RED-}[ERR]${NC-} $*" >&2; }

# ── Find free port ─────────────────────────────────────────
check_port() { lsof -nP -iTCP:$1 -sTCP:LISTEN &>/dev/null; }

PORT=$TARGET_PORT
if check_port $PORT; then
  PORT=$((PORT + 1))
  while check_port $PORT; do PORT=$((PORT + 1)); done
  warn "Port ${TARGET_PORT} busy — using port ${PORT} instead."
fi

# ── Repo root (one level up from this script) ─────────────
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Teardown ───────────────────────────────────────────────
teardown() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "Removing old container…"
    docker stop "${CONTAINER}" 2>/dev/null || true
    docker rm   "${CONTAINER}" 2>/dev/null || true
  fi
}

# ── Build ──────────────────────────────────────────────────
build_image() {
  log "Building image…"
  docker build --platform linux/amd64 -t "${IMAGE}" "${REPO_ROOT}"
  log "Image built."
}

# ── Run ────────────────────────────────────────────────────
run_app() {
  log "Starting container on port ${PORT}…"
  docker run -d \
    --name "${CONTAINER}" \
    --restart unless-stopped \
    -p "${PORT}:3000" \
    -e PORT=3000 \
    -e NODE_ENV=production \
    -e TZ=Asia/Shanghai \
    -v "${APP_NAME}-data:/app/data" \
    "${IMAGE}"

  sleep 3
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "Container running at http://localhost:${PORT}"
  else
    err "Container failed to start — run 'docker logs ${CONTAINER}'"
    exit 1
  fi
}

# ── Main ───────────────────────────────────────────────────
case "${1:-}" in
  deploy|start)
    teardown
    build_image
    run_app
    log "Deploy complete."
    ;;
  stop)         teardown; log "Stopped." ;;
  logs)         docker logs -f "${CONTAINER}" ;;
  status)       docker ps -a --filter "name=${CONTAINER}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" ;;
  *)            echo "Usage: $0 {deploy|stop|logs|status}"; exit 1 ;;
esac