# MCP Servers

MCP (Model Context Protocol) servers that extend Codex with additional tool capabilities.

## pi-lens

[pi-lens](https://www.npmjs.com/package/pi-lens) is a code-quality MCP server providing 16 `pilens_*` tools for static analysis, AST search/replace, LSP navigation, and project-wide diagnostics — all running locally.

### Security

**pi-lens MCP is local-only at runtime.** The server communicates via stdio (local child process) — zero outbound network calls, no telemetry, no data upload. File contents never leave your machine.

At install time, tree-sitter WASM grammars are downloaded from `unpkg.com` (npm CDN) with sha256 hash verification. The pi extension's auto-install policy (30+ tools from GitHub) is **not active** in MCP mode.

Full trust-boundary documentation: [SECURITY.md](SECURITY.md)

### Prerequisites

- **Node.js** on PATH (v18+)

### Install

#### 1. Install the server (self-contained)

Pick a vendor directory and install pi-lens there. This keeps it isolated from your other projects:

```bash
# macOS / Linux
mkdir -p ~/.codex/vendor/pi-lens && cd ~/.codex/vendor/pi-lens
npm init -y
npm install --omit=peer --no-fund pi-lens@3.8.71 typescript-language-server@^5.1.3

# Windows (PowerShell)
New-Item -ItemType Directory -Force ~/.codex/vendor/pi-lens | Out-Null
Set-Location ~/.codex/vendor/pi-lens
npm init -y
npm install --omit=peer --no-fund pi-lens@3.8.71 "typescript-language-server@^5.1.3"
```

After install, the server entry point is at:
```
~/.codex/vendor/pi-lens/node_modules/pi-lens/dist/mcp/server.js
```

> **What was downloaded:** The `prepare` script fetched 12 tree-sitter WASM grammars from `unpkg.com` (each sha256-verified against `grammars.lock.json`). The `@ast-grep/cli` postinstall downloaded the `sg` binary via npm optional deps. No data was sent — only artifacts received. See [SECURITY.md](SECURITY.md) for details.

#### 2. Register in `config.toml`

Add this block to `~/.codex/config.toml` (anywhere at top level). Replace the path with your actual absolute path using **forward slashes**:

```toml
[mcp_servers.pi-lens]
command = "node"
args = ["C:/Users/YOU/.codex/vendor/pi-lens/node_modules/pi-lens/dist/mcp/server.js"]
startup_timeout_sec = 30
```

macOS/Linux example:
```toml
[mcp_servers.pi-lens]
command = "node"
args = ["/home/you/.codex/vendor/pi-lens/node_modules/pi-lens/dist/mcp/server.js"]
startup_timeout_sec = 30
```

> **Important:** This is *your* config file — only add the block above. Never reformat, reorder, or regenerate the rest of `config.toml`.

#### 3. Environment variables (optional)

| Variable | Purpose |
|----------|---------|
| `PI_LENS_MCP_CWD` | Sets the working directory for analysis (defaults to `process.cwd()`). Useful if Codex launches the server from a different directory than your project. |
| `CODEX_KIT_LENS_REMINDER` | Set to `0` to disable the PostToolUse reminder hook (see `../hooks/README.md`). |

### Agent authorization

When Codex asks permission to invoke a `pilens_*` tool on a file, **this is a local analysis** — the file content is passed to a local child process over stdio and analyzed on your machine. No data is transmitted over any network.

It is safe to approve pi-lens tool calls for nonpublic/proprietary code. If your agent's policy engine rejects these calls citing "external service" concerns, this is a false positive — the MCP transport is stdio (local process), not HTTP. See [SECURITY.md](SECURITY.md) for the full analysis.

### Verify

1. Open Codex and run `/mcp` — pi-lens should show as connected with 16 tools.
2. Quick smoke test (optional):
   ```bash
   node ~/.codex/vendor/pi-lens/node_modules/pi-lens/dist/mcp/server.js --help
   ```

### Available tools (16)

`pilens_session_start`, `pilens_turn_end`, `pilens_analyze`, `pilens_diagnostics`, `pilens_project_scan`, `pilens_ast_grep_search`, `pilens_ast_grep_replace`, `pilens_lsp_navigation`, `pilens_lsp_diagnostics`, and more.

### Rollback

1. Remove the `[mcp_servers.pi-lens]` block from `~/.codex/config.toml`.
2. Delete `~/.codex/vendor/pi-lens/`.

---

## wiki-server

Persistent knowledge-base server with SQLite + FTS5 + local vector embeddings. Provides 6 `wiki_*` tools for building and querying a structured, interlinked wiki (based on [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)).

Full install instructions: [wiki-server/README.md](wiki-server/README.md)
Security vetting: [wiki-server/SECURITY.md](wiki-server/SECURITY.md)

---

## semgrep-server

Warm-cache semgrep security scanning. Wraps the `semgrep` CLI with result caching to eliminate cold-start latency. Provides 4 `semgrep_*` tools. Zero npm dependencies.

Full install instructions: [semgrep-server/README.md](semgrep-server/README.md)
Security vetting: [semgrep-server/SECURITY.md](semgrep-server/SECURITY.md)
