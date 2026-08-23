#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

trap 'kill 0' EXIT

cd "$ROOT/backend"
npm start &

cd "$ROOT/frontend"
python3 -m http.server 8080 &

wait