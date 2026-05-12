#!/usr/bin/env bash
# Start the prelegal stack on macOS: build the static frontend on the
# host, then bring up the FastAPI container that serves it.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT/frontend"
if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies..."
  npm ci --no-audit --no-fund
fi
echo "Building static frontend..."
npm run build

cd "$PROJECT_ROOT"
docker compose up -d --build
echo "Prelegal is running at http://localhost:8000"
