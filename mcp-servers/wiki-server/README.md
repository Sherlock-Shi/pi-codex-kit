# Wiki Server

Persistent knowledge-base MCP server with SQLite + FTS5 full-text search + local vector embeddings (transformers.js). Part of pi-codex-kit.

**v2.0** adds Knowledge Engine capabilities: project scanning, module trees, knowledge cards, drift detection, file-first persistence, and resumable generation workflows.

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

## Available tools (17)

### Knowledge Engine Tools (v2)

| Tool | Purpose |
|------|---------|  
| `wiki_scan_project` | Analyze project structure → produce module tree (`_index.yaml`) |
| `wiki_generate_cards` | Scaffold knowledge card files for a module (overview, architecture, conventions, tech stack) |
| `wiki_write_card` | Write/update a knowledge card (respects human-edit protection) |
| `wiki_read_card` | Read a knowledge card with metadata and protection status |
| `wiki_detect_drift` | Compare content hashes → list stale modules for incremental update |
| `wiki_index_project` | Hash all source files → store in `_meta.yaml` |
| `wiki_export_page` | Write a wiki page to disk as markdown with YAML frontmatter |
| `wiki_import_page` | Import a markdown file into the search index (for git-pull sync) |
| `wiki_rebuild_index` | Rebuild SQLite FTS + embedding index from on-disk files |
| `wiki_save_progress` | Save generation progress for resumability |
| `wiki_read_progress` | Read saved generation progress |

### Legacy Tools (v1, backward-compatible)

| Tool | Purpose |
|------|---------|  
| `wiki_ingest` | Ingest a source file — creates summary page, updates entities/concepts |
| `wiki_query` | Semantic + keyword search across the wiki |
| `wiki_lint` | Health-check: orphans, broken links, missing embeddings |
| `wiki_page_read` | Read a page by slug with link graph |
| `wiki_page_write` | Create/update a page (auto-computes embedding) |
| `wiki_status` | Dashboard: page counts, last operation |

## Data storage

The wiki uses a **file-first** storage model:

- **Source of truth**: Markdown + YAML files on disk (git-friendly, human-editable)
- **Derived index**: `wiki.db` (SQLite, WAL mode) for fast FTS + vector search — rebuildable from files

Directory layout:
```
<project>/.codex-wiki/
├── wiki_plan.yaml          ← pre-generation config (user-editable)
├── _index.yaml             ← module tree (generated)
├── _meta.yaml              ← content hashes, generation progress
├── en/
│   ├── content/            ← Repo Wiki pages
│   └── knowledge/          ← Knowledge Cards (per-module)
├── wiki.db                 ← derived index (gitignored)
└── .gitignore
```

## Verify

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server.mjs
```

Expected: JSON with 17 tools listed.

## Rollback

1. Remove the `[mcp_servers.wiki]` block from `config.toml`.
2. Delete `~/.codex/vendor/wiki-server/`.
3. Delete any `.codex-wiki/` directories from your projects (optional — they're just data).
