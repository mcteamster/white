#!/bin/bash
# Run all test files in the repo.
# Usage: bash tests/run.sh [--unit]
# --unit: run unit tests only (Game.test.ts and booster.test.ts)
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TSX="$REPO_ROOT/node_modules/.bin/tsx"

if [ ! -f "$TSX" ]; then
  echo "tsx not found — run 'npm install' first"
  exit 1
fi

echo "=== Running unit tests ==="
echo ""
echo "--- core/src/Game.test.ts ---"
"$TSX" "$REPO_ROOT/core/src/Game.test.ts"

echo "--- core/src/booster.test.ts ---"
"$TSX" "$REPO_ROOT/core/src/booster.test.ts"

echo ""
echo "=== All tests passed ==="
