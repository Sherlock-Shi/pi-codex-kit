# Semgrep Server

Warm-cache semgrep MCP server for security scanning. Eliminates the 5-15s cold start by caching scan results for unchanged files. Part of pi-codex-kit.

## Prerequisites

- **Node.js** on PATH (v18+)
- **semgrep** on PATH (`pip install semgrep` or `brew install semgrep`)

## Install

```bash
# macOS / Linux
mkdir -p ~/.codex/vendor/semgrep-server && cd ~/.codex/vendor/semgrep-server
cp -R <kit>/mcp-servers/semgrep-server/* .
# No npm install needed — zero dependencies

# Windows (PowerShell)
New-Item -ItemType Directory -Force ~/.codex/vendor/semgrep-server | Out-Null
Copy-Item -Recurse <kit>\mcp-servers\semgrep-server\* ~/.codex/vendor/semgrep-server/
```

## Register in `config.toml`

```toml
[mcp_servers.semgrep]
command = "node"
args = ["C:/Users/YOU/.codex/vendor/semgrep-server/server.mjs"]
startup_timeout_sec = 15
```

macOS/Linux:
```toml
[mcp_servers.semgrep]
command = "node"
args = ["/home/you/.codex/vendor/semgrep-server/server.mjs"]
startup_timeout_sec = 15
```

## Available tools (4)

| Tool | Purpose |
|------|---------|
| `semgrep_scan` | Run a scan with warm cache — structured findings with severity, CWE, remediation |
| `semgrep_list_rules` | Show semgrep version, config, and rule catalog reference |
| `semgrep_explain` | Explain a finding by rule ID — CWE mapping + registry link |
| `semgrep_status` | Health check: binary available, version, cache state |

## Verify

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server.mjs
```

Expected: JSON with 4 tools listed.

## Rollback

1. Remove the `[mcp_servers.semgrep]` block from `config.toml`.
2. Delete `~/.codex/vendor/semgrep-server/`.
