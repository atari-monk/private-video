#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  kill 0 2>/dev/null || true
}

trap cleanup EXIT INT TERM

export PORT="${PORT:-3000}"
export FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-http://localhost:8080}"

cd "$ROOT/backend"
npm start &

cd "$ROOT/frontend"
python3 -m http.server 8080 &

wait