#!/usr/bin/env bash
# pi-codex-kit — pi-lens standalone installer (macOS / Linux)
#
# Installs pi-lens@3.8.71 as a SELF-CONTAINED npm package under
# ~/.codex/vendor/pi-lens (no linkage to ~/.pi). Adds typescript-language-server
# so TS diagnostics work through the MCP server.
set -euo pipefail

PIN_VERSION="3.8.71"
VENDOR_ROOT="$HOME/.codex/vendor/pi-lens"
SERVER_JS="$VENDOR_ROOT/node_modules/pi-lens/dist/mcp/server.js"

echo "pi-lens vendor root: $VENDOR_ROOT"

# 1. Node check
if ! command -v node >/dev/null 2>&1; then
  echo "node not found on PATH. Install Node.js and re-run." >&2
  exit 1
fi
echo "node: $(node --version)"

# 2. Install (skip if already present)
if [ -f "$SERVER_JS" ]; then
  echo "pi-lens already installed at $SERVER_JS — skipping npm install."
else
  mkdir -p "$VENDOR_ROOT"
  (
    cd "$VENDOR_ROOT"
    [ -f package.json ] || npm init -y >/dev/null
    echo "Installing pi-lens@$PIN_VERSION + typescript-language-server (--omit=peer)..."
    npm install --omit=peer --no-audit --no-fund "pi-lens@$PIN_VERSION" 'typescript-language-server@^5.1.3'
  )
  [ -f "$SERVER_JS" ] || { echo "install finished but server.js missing: $SERVER_JS" >&2; exit 1; }
fi

# 3. Smoke test
KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE_JS="$KIT_ROOT/scripts/mcp-smoke.mjs"
echo "Smoke-testing MCP server..."
node "$SMOKE_JS" "$SERVER_JS"

echo "pi-lens ready: $SERVER_JS"
