#!/usr/bin/env bash
# ============================================================
# poetry-app — Build and Run Script
# Works on any Linux server with Docker installed.
# Use this if you want to deploy via SSH instead of Coolify.
#
# Usage:
#   # On the server — one-time setup:
#   chmod +x build-and-run.sh && ./build-and-run.sh setup
#
#   # On subsequent deployments:
#   chmod +x build-and-run.sh && ./build-and-run.sh deploy
# ============================================================

set -euo pipefail

APP_NAME="poetry-app"
PORT=3000
IMAGE="${APP_NAME}:latest"
CONTAINER="${APP_NAME}-app"

# Temp staging dir — avoids Docker Desktop context issues with deep paths
STAGING_DIR="/tmp/poetry-app-staging"
# Repo root (where this script lives)
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Colours ────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*" >&2; }

# ── Dependencies ───────────────────────────────────────────
check_docker() {
  if ! command -v docker &>/dev/null; then
    err "Docker not found. Install Docker first: https://docs.docker.com/engine/install/"
    exit 1
  fi
  log "Docker $(docker version --format '{{.Server.Version}}') found."
}

# ── Setup: install Docker if missing (Ubuntu/Debian) ───────
setup_server() {
  log "Setting up Docker on this server…"

  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker.io docker-compose curl
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER"
    log "Docker installed. You may need to re-login for group permissions to apply."
  else
    err "Unsupported OS. Please install Docker manually."
    exit 1
  fi
}

# ── Stage files to temp dir (avoids Docker Desktop path bug) ─
stage_files() {
  log "Staging files to ${STAGING_DIR}…"

  # Always start fresh — prevents stale node_modules from being reused
  if [[ -d "${STAGING_DIR}" ]]; then
    rm -rf "${STAGING_DIR}"
  fi
  mkdir -p "${STAGING_DIR}"

  # Copy everything except node_modules, .next, git, db files, docs
  # tsconfig.json MUST be included (it defines the @/* path alias)
  rsync -a \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    --exclude='*.db' \
    --exclude='*.db-shm' \
    --exclude='*.db-wal' \
    --exclude=README.md \
    --exclude=eslint.config.mjs \
    --exclude=.gitignore \
    --exclude='*.md' \
    --exclude=.DS_Store \
    --exclude='.dockerignore' \
    . "${STAGING_DIR}/"

  # poetry_data.json lives one level up from the project — copy it so the
  # migrate-on-start script can seed the DB inside the container
  local DATA_SRC="${REPO_ROOT}/../poetry_data.json"
  if [[ -f "${DATA_SRC}" ]]; then
    cp "${DATA_SRC}" "${STAGING_DIR}/poetry_data.json"
    log "Copied poetry_data.json ($(du -sh "${DATA_SRC}" | cut -f1)) into staging."
  else
    warn "poetry_data.json not found at ${DATA_SRC} — DB will start empty."
  fi

  log "Staged $(find "${STAGING_DIR}" -type f | wc -l) files."
}

# ── Build the Docker image ─────────────────────────────────
build_image() {
  log "Building Docker image '${IMAGE}'…"
  docker build -t "${IMAGE}" "${STAGING_DIR}"
  log "Image built successfully."
}

# ── Stop & remove old container ───────────────────────────
teardown() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "Removing old container…"
    docker stop "${CONTAINER}" 2>/dev/null || true
    docker rm   "${CONTAINER}" 2>/dev/null || true
  fi
}

# ── Run the app ───────────────────────────────────────────
run_app() {
  log "Starting container '${CONTAINER}' on port ${PORT}…"

  docker run -d \
    --name "${CONTAINER}" \
    --restart unless-stopped \
    -p "${PORT}:3000" \
    -v "${APP_NAME}-data:/app" \
    --health-cmd="wget -qO- http://localhost:3000/ || exit 1" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    "${IMAGE}"

  sleep 2

  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "Container running! App available at http://localhost:${PORT}"
    log "Logs: docker logs -f ${CONTAINER}"
  else
    err "Container failed to start. Run 'docker logs ${CONTAINER}' to debug."
    exit 1
  fi
}

# ── Show logs ─────────────────────────────────────────────
logs_app() {
  docker logs -f "${CONTAINER}"
}

# ── Show status ───────────────────────────────────────────
status_app() {
  docker ps -a --filter "name=${CONTAINER}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ── Deploy: stage → build → run ──────────────────────────
deploy() {
  check_docker
  stage_files
  teardown
  build_image
  run_app
  log "Deploy complete."
}

# ── Main ─────────────────────────────────────────────────
case "${1:-}" in
  setup)
    setup_server
    ;;
  deploy|start)
    deploy
    ;;
  stop)
    teardown
    ;;
  logs)
    logs_app
    ;;
  status)
    status_app
    ;;
  restart)
    docker restart "${CONTAINER}"
    ;;
  *)
    echo "Usage: $0 {setup|deploy|stop|restart|logs|status}"
    echo ""
    echo "  setup   — Install Docker on a fresh server (Ubuntu/Debian)"
    echo "  deploy  — Build image + run container (first time or updates)"
    echo "  stop    — Stop and remove the container"
    echo "  restart — Restart the container"
    echo "  logs    — Tail live logs"
    echo "  status  — Show container status"
    exit 1
    ;;
esac