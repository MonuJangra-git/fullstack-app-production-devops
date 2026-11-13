#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" && -f "$ROOT_DIR/.env" ]]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ROOT_DIR/.env" | head -n 1)"
  export DATABASE_URL
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set." >&2
  echo "Set DATABASE_URL or add it to .env before running this script." >&2
  exit 1
fi

if [[ "$DATABASE_URL" == *@postgres:* ]] && ! getent hosts postgres >/dev/null 2>&1; then
  DATABASE_URL="${DATABASE_URL/@postgres:/@127.0.0.1:}"
  export DATABASE_URL
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm is required but was not found in PATH." >&2
  exit 1
fi

echo "Applying Drizzle schema to the configured database..."
pnpm --filter @workspace/db push
echo "Database schema applied successfully."
