#!/usr/bin/env bash
# Start the prelegal stack on Linux.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
docker compose up -d --build
echo "Prelegal is running at http://localhost:8000"
