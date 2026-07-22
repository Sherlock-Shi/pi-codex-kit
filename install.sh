#!/usr/bin/env bash
# pi-codex-kit — macOS / Linux orchestrator
#
# Applies the kit to this machine. ADDITIVE and idempotent per the AGENT
# CONTRACT in README.md. Phases that touch ~/.codex and ~/.cc-switch are
# individually skippable via env flags:
#   SKIP_PILENS=1 SKIP_MCP=1 SKIP_HOOKS=1 SKIP_SKILLS=1 FORCE_SKILLS=1 ./install.sh
set -euo pipefail

KIT_ROOT="$(cd "$(dirname "$0")" && pwd)"
CODEX_DIR="$HOME/.codex"
CONFIG_TOML="$CODEX_DIR/config.toml"
HOOKS_DIR="$CODEX_DIR/hooks"
HOOKS_JSON="$CODEX_DIR/hooks.json"
VENDOR_ROOT="$CODEX_DIR/vendor/pi-lens"
SERVER_JS="$VENDOR_ROOT/node_modules/pi-lens/dist/mcp/server.js"
CC_SKILLS="$HOME/.cc-switch/skills"

echo "=== pi-codex-kit install ($(uname)) ==="
echo "kit: $KIT_ROOT"

# ---- Phase 0: pre-flight -------------------------------------------------
command -v node >/dev/null 2>&1 || { echo "node not found on PATH." >&2; exit 1; }
echo "node: $(node --version)"
command -v git >/dev/null 2>&1 && echo "$(git --version)" || echo "WARN: git not found (needed for the simplify skill)."

if command -v rtk >/dev/null 2>&1; then
  echo "rtk: $(command -v rtk)"
elif [ -x "$HOME/.local/bin/rtk" ]; then
  echo "rtk: $HOME/.local/bin/rtk"
else
  echo "WARN: rtk not found — the PreToolUse hook will no-op until rtk is installed."
fi

[ -f "$CONFIG_TOML" ] || echo "WARN: no $CONFIG_TOML yet; MCP append will create it."

# ---- Phase 1: pi-lens runtime --------------------------------------------
if [ "${SKIP_PILENS:-0}" = "1" ]; then
  echo; echo "[1/5] pi-lens: SKIPPED"
else
  echo; echo "[1/5] pi-lens standalone install..."
  bash "$KIT_ROOT/pi-lens/install.sh"
fi

# ---- Phase 2: MCP registration (MANUAL - config.toml is never modified) ---
if [ "${SKIP_MCP:-0}" = "1" ]; then
  echo; echo "[2/5] MCP registration: SKIPPED"
else
  echo; echo "[2/5] MCP registration (manual step - this installer does NOT modify config.toml):"
  if [ ! -f "$SERVER_JS" ]; then
    echo "  WARN: server.js not found yet: $SERVER_JS (run phase 1 first, then re-run with SKIP_PILENS=1)." >&2
  else
    echo "  Add this block to $CONFIG_TOML (anywhere at top level):"
    echo ""
    echo "      [mcp_servers.pi-lens]"
    echo "      command = \"node\""
    echo "      args = [\"$SERVER_JS\"]"
    echo "      startup_timeout_sec = 30"
    echo ""
    echo "  (scripts/append-mcp.mjs exists as an OPTIONAL manual helper if you ever want scripted insertion; the installer never runs it.)"
  fi
fi

# ---- Phase 3: hooks -------------------------------------------------------
if [ "${SKIP_HOOKS:-0}" = "1" ]; then
  echo; echo "[3/5] hooks: SKIPPED"
else
  echo; echo "[3/5] Installing hooks..."
  mkdir -p "$HOOKS_DIR"
  cp "$KIT_ROOT/hooks/rtk-pretooluse.mjs" "$HOOKS_DIR/"
  cp "$KIT_ROOT/hooks/lens-reminder.mjs" "$HOOKS_DIR/"

  RENDERED="$(mktemp -t pi-codex-kit-hooks.XXXXXX.json)"
  # shellcheck disable=SC2001
  HOOKS_ESCAPED=$(echo "$HOOKS_DIR" | sed 's/[\/&]/\\&/g')
  sed "s/{{CODEX_HOOKS_DIR}}/$HOOKS_ESCAPED/g" "$KIT_ROOT/codex-config/hooks.template.json" > "$RENDERED"

  node "$KIT_ROOT/scripts/merge-hooks.mjs" --target "$HOOKS_JSON" --template "$RENDERED"
  rm -f "$RENDERED"
  echo "NOTE: open Codex and run /hooks to TRUST the new hooks (one-time)."
fi

# ---- Phase 4: skills -> cc-switch SSOT ------------------------------------
if [ "${SKIP_SKILLS:-0}" = "1" ]; then
  echo; echo "[4/5] skills: SKIPPED"
else
  echo; echo "[4/5] Copying skills into cc-switch SSOT ($CC_SKILLS)..."
  [ -d "$CC_SKILLS" ] || { echo "cc-switch skills dir not found: $CC_SKILLS — is cc-switch installed?" >&2; exit 1; }
  for dir in "$KIT_ROOT"/skills/*/; do
    name="$(basename "$dir")"
    dest="$CC_SKILLS/$name"
    if [ -e "$dest" ] && [ "${FORCE_SKILLS:-0}" != "1" ]; then
      echo "  skip (exists): $name"
      continue
    fi
    cp -R "$dir" "$CC_SKILLS/"
    echo "  copied: $name"
  done
  echo "NOTE: in cc-switch, install each new skill TO CODEX (symlink mode)."
fi

# ---- Phase 5: manual finish reminders -------------------------------------
echo; echo "[5/5] Manual finish:"
echo "  1. cc-switch: install the new skills to Codex (symlink)."
echo "  2. cc-switch prompt manager: APPEND agents-md/coding-glue.md to AGENTS.md."
echo "  3. Codex: run /hooks and trust the new hooks."
echo; echo "Done. See README.md for the verification checklist."
