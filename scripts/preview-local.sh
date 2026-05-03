#!/usr/bin/env bash
# Local preview: Express + SQLite (no Docker).
# Usage: bash scripts/preview-local.sh
#        PORT=3001 bash scripts/preview-local.sh

set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3000}"
export PORT

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN &>/dev/null; then
    echo "Port ${PORT} is already in use. Try: PORT=3001 bash scripts/preview-local.sh" >&2
    exit 1
  fi
fi

echo "poetry-app → http://127.0.0.1:${PORT}/"
exec node server.js
