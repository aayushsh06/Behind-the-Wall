#!/usr/bin/env bash
# Start the FastAPI backend and the Vite frontend together with live reload.
#
#   ./scripts/dev.sh            # localhost only
#   ./scripts/dev.sh --lan      # also reachable from phones on the same Wi-Fi
#
# Installs dependencies on first run. Ctrl+C stops both processes.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"
HOST="127.0.0.1"

for arg in "$@"; do
  case "$arg" in
    --lan) HOST="0.0.0.0" ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

log() { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }

ensure_backend() {
  if [[ ! -x "$BACKEND/.venv/bin/uvicorn" ]]; then
    log "Creating Python virtualenv and installing backend dependencies"
    python3 -m venv "$BACKEND/.venv"
    "$BACKEND/.venv/bin/pip" install --quiet --upgrade pip
    "$BACKEND/.venv/bin/pip" install --quiet -e "$BACKEND[dev]"
  fi
}

ensure_frontend() {
  if [[ ! -d "$FRONTEND/node_modules" ]]; then
    log "Installing frontend dependencies"
    (cd "$FRONTEND" && npm install --silent)
  fi
}

PIDS=()
cleanup() {
  log "Stopping"
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ensure_backend
ensure_frontend

log "API  -> http://localhost:$API_PORT  (docs at /docs)"
(cd "$BACKEND" && exec .venv/bin/uvicorn app.main:app --reload --host "$HOST" --port "$API_PORT") &
PIDS+=($!)

log "Web  -> http://localhost:$WEB_PORT"
(cd "$FRONTEND" && VITE_API_PROXY_TARGET="http://127.0.0.1:$API_PORT" exec npm run dev --silent -- --host "$HOST" --port "$WEB_PORT") &
PIDS+=($!)

if [[ "$HOST" == "0.0.0.0" ]]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || true)"
  [[ -n "$LAN_IP" ]] && log "On your phone open http://$LAN_IP:$WEB_PORT"
fi

wait
