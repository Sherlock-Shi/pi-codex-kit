---
name: knowledge-engine
description: "Generate, update, and maintain a structured knowledge base (Repo Wiki + Knowledge Cards) for a codebase. Mirrors Qoder's Knowledge Engine: auto-generates module-aware documentation, detects code drift, supports incremental regeneration, human-edit protection, and resumable workflows. Use when the user wants to generate project knowledge, update stale docs, query the knowledge base, or manage knowledge cards."
---

# Knowledge Engine

Generate and maintain a structured, module-aware knowledge base for any codebase. Produces two artifact types:

- **Repo Wiki** — structured documentation pages (architecture, guides, references)
- **Knowledge Cards** — high-density per-module units (overview, architecture, conventions, tech stack)

Inspired by [Qoder's Knowledge Engine](https://docs.qoder.com/user-guide/knowledge-engine/overview). Adapted for Codex as an agent-orchestrated, file-first, git-shareable system.

## When to Use

- "Generate knowledge for this project" / "Build the wiki"
- "Update the knowledge base" / "What's stale?"
- "What does the wiki say about X?" / "Query the knowledge base"
- "Generate knowledge cards for the hooks module"
- "Sync the wiki after git pull"
- "Lint the knowledge base"
- "Modify/supplement/rewrite the architecture card for module Y"

## When NOT to Use

- One-off code questions (just answer directly)
- Real-time data that changes faster than you can maintain pages
- Non-code knowledge management (use `llm-wiki` for general research wikis)

## Architecture

```
<project>/.codex-wiki/
├── wiki_plan.yaml          ← pre-generation config (user-editable)
├── _index.yaml             ← module tree (generated)
├── _meta.yaml              ← content hashes, generation progress
├── en/
│   ├── content/            ← Repo Wiki pages
│   │   ├── System Overview.md
│   │   └── <section>/<page>.md
│   └── knowledge/          ← Knowledge Cards (per-module)
│       ├── <module-dir>/
│       │   ├── _module.yaml
│       │   ├── overview.md
│       │   ├── architecture_design.md
│       │   ├── coding_conventions.md
│       │   └── tech_stack.md
│       └── ...
├── wiki.db                 ← derived search index (gitignored)
└── .gitignore
```

**Storage model**: Markdown + YAML on disk is the source of truth (git-friendly, human-editable). SQLite (`wiki.db`) is a derived index for fast FTS + vector search — rebuildable at any time from files.

## MCP Tools (wiki-server)

Requires the wiki-server MCP (see `mcp-servers/wiki-server/README.md`).

### Knowledge Engine Tools

| Tool | Purpose |
|------|---------|
| `wiki_scan_project` | Analyze project structure → produce module tree (`_index.yaml`) |
| `wiki_generate_cards` | Scaffold knowledge card files for a module |
| `wiki_write_card` | Write/update a knowledge card (respects human-edit protection) |
| `wiki_read_card` | Read a knowledge card with metadata |
| `wiki_detect_drift` | Compare content hashes → list stale modules |
| `wiki_index_project` | Hash all source files → store in `_meta.yaml` |
| `wiki_export_page` | Write a wiki page to disk as markdown with frontmatter |
| `wiki_import_page` | Import a markdown file into the search index |
| `wiki_rebuild_index` | Rebuild SQLite index from on-disk files |
| `wiki_save_progress` | Save generation progress (resumability) |
| `wiki_read_progress` | Read saved progress |

### Legacy Tools (still available)

| Tool | Purpose |
|------|---------|
| `wiki_query` | Semantic + keyword search across indexed pages |
| `wiki_page_read` | Read a page by slug |
| `wiki_page_write` | Create/update a page in the index |
| `wiki_ingest` | Ingest a raw source file |
| `wiki_lint` | Health-check: orphans, broken links |
| `wiki_status` | Dashboard: page counts, last operation |

## Operations

### Generate (first-time)

Full knowledge base generation from scratch:

1. **Scan** the project: call `wiki_scan_project` with `projectRoot` and `wikiRoot` (`<project>/.codex-wiki`)
2. **Read** `wiki_plan.yaml` for scope/guidance (if user configured it)
3. **Index** source files: call `wiki_index_project` to hash all tracked files
4. **For each module** in the module tree (from `_index.yaml`):
   a. Call `wiki_generate_cards` to scaffold card files
   b. **Read** the module's source files to understand its purpose
   c. **Write** each knowledge card with real content via `wiki_write_card`:
      - `overview` — purpose, responsibilities, boundaries, key exports
      - `architecture_design` — patterns, component relationships, data flow
      - `coding_conventions` — naming, style, interface agreements
      - `tech_stack` — frameworks, libraries, versions
   d. **Save progress** via `wiki_save_progress` after each module
5. **Generate wiki pages** in `en/content/`:
   - System Overview (top-level architecture)
   - One page per major section/module group
   - Cross-reference pages as needed
6. **Export** wiki pages via `wiki_export_page`
7. **Rebuild index**: call `wiki_rebuild_index` to make everything searchable

**Resumability**: If interrupted, call `wiki_read_progress` on next invocation to find where you left off. Skip completed modules; retry failed ones.

**Self-correction**: After writing a card, verify it is non-empty and >50 chars. If validation fails, retry once. If still failing, mark module as failed and continue.

### Update (incremental)

Regenerate only what changed:

1. **Detect drift**: call `wiki_detect_drift` with `projectRoot` and `wikiRoot`
2. If `clean: true` → report "Knowledge base is up to date" and stop
3. For each module in `affectedModules`:
   a. Check human-edit protection: call `wiki_read_card` — if `humanModified: true`, skip and note it
   b. Re-read the module's source files
   c. Regenerate cards via `wiki_write_card`
   d. Update related wiki pages via `wiki_export_page`
4. **Re-index**: call `wiki_index_project` to update hashes
5. **Rebuild search index**: call `wiki_rebuild_index`
6. Report summary: N modules updated, M skipped (human-protected), K pages refreshed

### Modify

Targeted edit of a specific card or page:

1. Identify the target (module + card type, or wiki page slug)
2. Read current content via `wiki_read_card` or `wiki_page_read`
3. Apply the user's requested modification
4. Write back via `wiki_write_card` (with `force: true` if overriding protection) or `wiki_export_page`
5. Rebuild index if content changed significantly

### Supplement

Append new content to existing knowledge:

1. Read the existing card/page
2. Append the new section/content
3. Write back (preserving existing content)
4. Update index

### Rewrite

Complete rewrite of a card/page (resets human-edit protection):

1. Read the module's current source files fresh
2. Generate entirely new content
3. Write via `wiki_write_card` with `force: true`
4. This resets `human_modified: false` — the card is back under auto-management

### Sync (after git pull)

When a team member pulls updated `.codex-wiki/` from remote:

1. Call `wiki_rebuild_index` to re-index all on-disk files
2. Report: N pages imported into search index

### Query

Answer questions using the knowledge base:

1. Call `wiki_query` with the question
2. Read relevant pages/cards from results
3. Synthesize an answer with citations to wiki pages
4. Optionally file valuable syntheses back as new pages

### Lint

Health-check the knowledge base:

1. Call `wiki_lint` for structural issues (orphans, broken links)
2. Call `wiki_detect_drift` for staleness
3. Check for modules missing cards (compare `_index.yaml` modules vs. knowledge directories)
4. Report findings and suggest fixes

## wiki_plan.yaml — Pre-Generation Configuration

Users can create/edit `<project>/.codex-wiki/wiki_plan.yaml` before generation:

```yaml
version: 1

repowiki:
  template: ""              # "architecture" | "product_requirement" | ""
  notes:
    - text: "Focus on hook/skill interaction patterns"
      author: "user"
  documents:                # optional page allowlist
    - title: "System Overview"
      goal: "High-level architecture"
    - title: "Hook System"
      goal: "Codex lifecycle integration"
      parent: "System Overview"

knowledgecard:
  notes:
    - text: "Focus on security boundaries and additive install model"

scope:
  include: []               # empty = all files
  exclude:
    - "**/node_modules/**"
    - ".qoder/**"
```

**Behavior**:
- `scope.include/exclude`: Controls which files are visible during generation
- `repowiki.documents`: When provided, ONLY listed pages are generated
- `repowiki.notes`: Injected as guidance during wiki page generation
- `knowledgecard.notes`: Injected as guidance during card generation
- `repowiki.template`: Controls output format emphasis

## Human-Edit Protection

Every generated file carries YAML frontmatter:

```yaml
---
title: "Architecture & Design"
type: architecture_design
module: hooks
generated: true
generated_at: "2026-07-23T15:38:24Z"
content_hash: "sha256:abc123..."
human_modified: false
---
```

**Rules**:
- On Update, if `content_hash` doesn't match the file body → user edited it → set `human_modified: true`
- Files with `human_modified: true` are NEVER overwritten by automatic Update
- User can reset via Rewrite operation (explicitly opts back into auto-generation)
- Always inform the user when skipping a protected file

## Conventions

- Wiki pages use relative markdown links for cross-references
- Every generated file has YAML frontmatter with provenance metadata
- One concept per page; split if a page covers two unrelated things
- Prefer updating existing pages over creating new ones
- Flag uncertainty explicitly: "Source A claims X, but Source B suggests Y"
- Module directory names in `knowledge/` use ` — ` to represent path separators (e.g. `skills — audit-code/`)

## Tips

- **Git sharing**: Commit `.codex-wiki/` (except `wiki.db`) to share knowledge with the team
- **Resumability**: Generation saves progress after each module — safe to interrupt and resume
- **wiki_plan.yaml**: Configure before first generation to control scope and focus
- **Incremental updates**: Run Update after significant code changes, not after every commit
- The human's job: configure scope, direct focus, review generated content, make corrections
- The agent's job: analyze code, generate knowledge, detect drift, maintain consistency
