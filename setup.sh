#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_ENV_EXAMPLE="$FRONTEND_DIR/.env.example"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
MIGRATIONS_DIR="$BACKEND_DIR/migrations"
MIGRATION_FILES=("0001_create_audit_log.sql" "0002_init_auth.sql" "0003_scripts_notifications.sql")

log() {
  printf '\n%s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but was not found in PATH." >&2
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  local file="$2"
  if [ -f "$file" ]; then
    local line
    line="$(grep -E "^${key}=" "$file" | tail -1 || true)"
    if [ -n "$line" ]; then
      local value="${line#*=}"
      value="${value%\"}"
      value="${value#\"}"
      echo "$value"
    fi
  fi
}

log "🔧 Alfred local setup"

require_command node
node -e "const major=parseInt(process.versions.node.split('.')[0],10); if(major<18){console.error('Node.js 18+ is required. Found '+process.version); process.exit(1);}" || {
  echo "Please install Node.js version 18 or newer before continuing." >&2
  exit 1
}

require_command pnpm
require_command psql

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: frontend workspace not found at $FRONTEND_DIR" >&2
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: backend workspace not found at $BACKEND_DIR" >&2
  exit 1
fi

log "📁 Ensuring frontend environment file"
if [ -f "$FRONTEND_ENV_EXAMPLE" ] && [ ! -f "$FRONTEND_ENV_FILE" ]; then
  cp "$FRONTEND_ENV_EXAMPLE" "$FRONTEND_ENV_FILE"
  echo "Created frontend/.env from .env.example (update the values as needed)."
else
  echo "frontend/.env already exists or template missing; skipping copy."
fi

log "📦 Installing frontend dependencies with pnpm"
pushd "$FRONTEND_DIR" >/dev/null
pnpm install
pnpm run build
popd >/dev/null

log "🧱 Installing backend dependencies with pnpm"
pushd "$BACKEND_DIR" >/dev/null
pnpm install
popd >/dev/null

log "🗄️ Preparing database connection"
DATABASE_URL_VALUE="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL_VALUE" ]; then
  DATABASE_URL_VALUE="$(read_env_value 'DATABASE_URL' "$BACKEND_ENV_FILE")"
fi
if [ -z "$DATABASE_URL_VALUE" ]; then
  DATABASE_URL_VALUE="postgres://postgres:postgres@localhost:5432/alfred"
  log "⚠️ DATABASE_URL not set; defaulting to $DATABASE_URL_VALUE"
fi

if ! (cd "$BACKEND_DIR" && pnpm exec psql "$DATABASE_URL_VALUE" -c 'SELECT 1;' >/dev/null 2>&1); then
  echo "Error: Unable to connect to database at $DATABASE_URL_VALUE. Ensure the database exists and Postgres is running." >&2
  exit 1
fi

log "📜 Running backend migrations"
for file in "${MIGRATION_FILES[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$file" ]; then
    log "  • Applying $file"
    (cd "$BACKEND_DIR" && pnpm exec psql "$DATABASE_URL_VALUE" -f "migrations/$file")
  else
    echo "Warning: migration file $file not found; skipping." >&2
  fi
done

log "✅ Setup complete"
echo "Next steps:"
echo "  1. Update frontend/.env and backend/.env with any environment-specific values."
echo "  2. Ensure Postgres is running (e.g., via 'brew services start postgresql@14')."
echo "  3. Start backend: 'cd backend && pnpm run dev'."
echo "  4. Start frontend: 'cd frontend && pnpm run dev'."
echo "  5. Run tests anytime with 'pnpm test' inside either workspace."
