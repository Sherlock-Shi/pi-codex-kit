# Wiki Server

Persistent knowledge-base MCP server with SQLite + FTS5 full-text search + local vector embeddings (transformers.js). Part of pi-codex-kit.

## Prerequisites

- **Node.js** on PATH (v18+)

## Install

```bash
# macOS / Linux
mkdir -p ~/.codex/vendor/wiki-server && cd ~/.codex/vendor/wiki-server
# Copy server files from the kit
cp -R <kit>/mcp-servers/wiki-server/* .
npm install

# Windows (PowerShell)
New-Item -ItemType Directory -Force ~/.codex/vendor/wiki-server | Out-Null
Copy-Item -Recurse <kit>\mcp-servers\wiki-server\* ~/.codex/vendor/wiki-server/
Set-Location ~/.codex/vendor/wiki-server
npm install
```

On first `wiki_query` or `wiki_ingest` call, the embedding model (~80MB) downloads from HuggingFace CDN and caches locally. Subsequent calls are fully offline.

## Register in `config.toml`

```toml
[mcp_servers.wiki]
command = "node"
args = ["C:/Users/YOU/.codex/vendor/wiki-server/server.mjs"]
startup_timeout_sec = 30
```

macOS/Linux:
```toml
[mcp_servers.wiki]
command = "node"
args = ["/home/you/.codex/vendor/wiki-server/server.mjs"]
startup_timeout_sec = 30
```

## Available tools (6)

| Tool | Purpose |
|------|---------|
| `wiki_ingest` | Ingest a source file — creates summary page, updates entities/concepts |
| `wiki_query` | Semantic + keyword search across the wiki |
| `wiki_lint` | Health-check: orphans, broken links, missing embeddings |
| `wiki_page_read` | Read a page by slug with link graph |
| `wiki_page_write` | Create/update a page (auto-computes embedding) |
| `wiki_status` | Dashboard: page counts, last operation |

## Data storage

The wiki database lives at `<wikiRoot>/wiki.db` (SQLite, WAL mode). The agent specifies `wikiRoot` per call — typically your project's `wiki/` directory.

## Verify

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server.mjs
```

Expected: JSON with 6 tools listed.

## Rollback

1. Remove the `[mcp_servers.wiki]` block from `config.toml`.
2. Delete `~/.codex/vendor/wiki-server/`.
3. Delete any `wiki.db` files from your projects (optional — they're just data).
