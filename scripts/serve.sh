#!/usr/bin/env bash
# Build the frontend and serve the whole app (API + static files) from one FastAPI process.
#
#   ./scripts/serve.sh              # http://localhost:8000
#   PORT=9000 ./scripts/serve.sh
#
# This is the deploy shape: a single uvicorn process, SQLite and photos under backend/data.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PORT="${PORT:-8000}"

log() { printf '\033[1;32m[serve]\033[0m %s\n' "$*"; }

if [[ ! -x "$BACKEND/.venv/bin/uvicorn" ]]; then
  log "Installing backend dependencies"
  python3 -m venv "$BACKEND/.venv"
  "$BACKEND/.venv/bin/pip" install --quiet --upgrade pip
  "$BACKEND/.venv/bin/pip" install --quiet -e "$BACKEND"
fi

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  log "Installing frontend dependencies"
  (cd "$FRONTEND" && npm install --silent)
fi

log "Building frontend"
(cd "$FRONTEND" && npm run build --silent)

log "Serving on http://0.0.0.0:$PORT"
cd "$BACKEND"
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
