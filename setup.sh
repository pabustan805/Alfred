#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ENV_EXAMPLE="$FRONTEND_DIR/.env.example"
ENV_FILE="$FRONTEND_DIR/.env"

log() {
  printf '\n%s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but was not found in PATH." >&2
    exit 1
  fi
}

log "🔧 Alfred local setup"

require_command node
node -e "const major=parseInt(process.versions.node.split('.')[0],10); if(major<18){console.error('Node.js 18+ is required. Found '+process.version); process.exit(1);}" || {
  echo "Please install Node.js version 18 or newer before continuing." >&2
  exit 1
}

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: frontend workspace not found at $FRONTEND_DIR" >&2
  exit 1
fi

PACKAGE_MANAGER=""
if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PACKAGE_MANAGER="npm"
else
  echo "Error: neither pnpm nor npm is available. Install one of them to continue." >&2
  exit 1
fi

log "📁 Ensuring frontend environment file"
if [ -f "$ENV_EXAMPLE" ] && [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "Created frontend/.env from .env.example (update the values as needed)."
else
  echo "frontend/.env already exists or template missing; skipping copy."
fi

log "📦 Installing frontend dependencies with $PACKAGE_MANAGER"
pushd "$FRONTEND_DIR" >/dev/null
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
  pnpm install
  pnpm run build
else
  npm install
  npm run build
fi
popd >/dev/null

log "✅ Setup complete"
echo "Next steps:"
echo "  1. Update frontend/.env with your API URL and environment name."
echo "  2. Start the dev server with '$PACKAGE_MANAGER run dev' from the frontend directory."
echo "  3. Run tests anytime with '$PACKAGE_MANAGER test'."
