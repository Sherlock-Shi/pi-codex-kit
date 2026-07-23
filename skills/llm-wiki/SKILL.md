---
name: llm-wiki
description: "Build and maintain a persistent, structured knowledge base (wiki) from raw sources. The LLM incrementally ingests, cross-references, and synthesizes information into interlinked markdown pages. Use when the user wants to build a wiki, ingest a source, query accumulated knowledge, or lint the knowledge base for health."
---

# LLM Wiki

Build and maintain a persistent, compounding knowledge base. Instead of re-deriving knowledge from raw documents on every question (RAG-style), incrementally build a structured, interlinked wiki that accumulates synthesis over time.

Based on the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) by Andrej Karpathy.

## When to Use

- "Ingest this article/paper/document into the wiki"
- "What does the wiki say about X?" / "Query the knowledge base"
- "Lint the wiki" / "Health-check the knowledge base"
- "Start a new wiki on [topic]"
- Building up structured knowledge over weeks/months of research

## When NOT to Use

- One-off questions that don't need persistent knowledge (just answer directly)
- Code documentation (use standard docs tooling)
- Real-time data that changes faster than you can maintain pages

## Architecture

Three layers:

| Layer | Owner | Purpose |
|-------|-------|---------|
| **Raw sources** (`raw/`) | Human curates | Immutable source documents. Articles, papers, notes, data. The LLM reads but never modifies these. |
| **The wiki** (`wiki/`) | LLM maintains | Generated markdown pages: summaries, entity pages, concept pages, comparisons, index, log. The LLM owns this entirely. |
| **The schema** (this skill + user conventions) | Co-evolved | Tells the LLM how the wiki is structured, what conventions to follow, and what workflows to use. |

### Directory structure

```
<wiki-root>/
├── raw/              ← immutable sources (human adds these)
│   ├── article-1.md
│   ├── paper-2.pdf
│   └── notes-3.md
├── wiki/             ← LLM-maintained (never hand-edit)
│   ├── index.md      ← content catalog
│   ├── log.md        ← chronological record
│   ├── overview.md   ← high-level synthesis
│   ├── entities/     ← one page per entity (person, org, tool)
│   ├── concepts/     ← one page per concept or theme
│   ├── sources/      ← one summary per ingested source
│   └── analyses/     ← filed query results, comparisons
└── SCHEMA.md         ← wiki conventions (co-evolved with user)
```

## MCP Tools (wiki-server)

If the wiki MCP server is installed (see `../mcp-servers/wiki-server/README.md`), use these tools for persistent storage and fast retrieval:

| Tool | Use for |
|------|--------|
| `wiki_ingest` | Ingest a source — creates summary page, updates entities/concepts, computes embeddings |
| `wiki_query` | Semantic + keyword search across all wiki pages |
| `wiki_lint` | Health-check: orphans, broken links, missing embeddings |
| `wiki_page_read` | Read a specific page with its link graph |
| `wiki_page_write` | Create/update a page (auto-computes embedding and updates FTS index) |
| `wiki_status` | Dashboard: page counts by type, last operation |

Pass `wikiRoot` as the absolute path to your wiki directory (the one containing `wiki.db`).

**Fallback:** If the wiki MCP server is not installed, use standard file tools (Read, Write, Glob) to maintain the wiki as markdown files. The workflow below applies either way.

## Operations

### Ingest

When the user adds a new source and says "ingest this":

1. **Read** the source completely
2. **Discuss** key takeaways with the user (brief, 3-5 bullets)
3. **Write** a summary page in `wiki/sources/<source-slug>.md`
4. **Update** `wiki/index.md` with the new page
5. **Update** relevant entity and concept pages across the wiki (a single source might touch 10-15 pages)
6. **Flag** contradictions: if new data conflicts with existing claims, note it explicitly on both pages
7. **Append** to `wiki/log.md`:
   ```
   ## [2026-07-23] ingest | Article Title
   - Summary: wiki/sources/article-title.md
   - Pages updated: entities/foo.md, concepts/bar.md, ...
   - Contradictions: concept X now conflicts with source Y claim
   ```

Prefer ingesting one source at a time with user involvement. Batch-ingest is possible but loses the collaborative filtering benefit.

### Query

When the user asks a question against the wiki:

1. **Read** `wiki/index.md` to find relevant pages
2. **Read** the relevant pages (drill into specifics)
3. **Synthesize** an answer with citations to wiki pages
4. **Optionally file back**: if the answer is a valuable synthesis (comparison, analysis, connection), save it to `wiki/analyses/` and update the index

Good answers compound — they become part of the knowledge base rather than disappearing into chat history.

### Lint

Periodically health-check the wiki:

- [ ] **Contradictions**: pages that make conflicting claims
- [ ] **Stale claims**: assertions superseded by newer sources
- [ ] **Orphans**: pages with no inbound links from other pages
- [ ] **Missing pages**: important concepts mentioned but lacking their own page
- [ ] **Missing cross-references**: related pages that don't link to each other
- [ ] **Data gaps**: topics where more sources would strengthen the synthesis
- [ ] **Index drift**: pages that exist but aren't in the index

Report findings and suggest fixes. Do not auto-fix without user confirmation.

## Index and Log

### index.md

Content-oriented catalog. Each page listed with a link, one-line summary, and metadata:

```markdown
# Wiki Index

## Entities
- [Alan Turing](entities/alan-turing.md) — Mathematician, computing pioneer (3 sources)

## Concepts
- [Computability](concepts/computability.md) — What can and cannot be computed (5 sources)

## Sources
- [On Computable Numbers](sources/on-computable-numbers.md) — 1936 paper, ingested 2026-07-20
```

### log.md

Chronological, append-only. Each entry starts with a parseable prefix:

```markdown
## [2026-07-23] ingest | On Computable Numbers
## [2026-07-23] query | "What's the connection between Turing and Church?"
## [2026-07-24] lint | 3 orphans found, 1 contradiction flagged
```

## Conventions

- Use `[[wikilinks]]` or relative markdown links for cross-references
- Every page has YAML frontmatter: `title`, `type` (entity/concept/source/analysis), `sources` (count), `updated` (date)
- One concept per page; split if a page covers two unrelated things
- Prefer updating existing pages over creating new ones for the same topic
- Flag uncertainty explicitly: "Source A claims X, but Source B suggests Y"

## Tips

- **Obsidian** works great as the viewer — graph view shows the wiki's shape
- **Git** gives version history for free — the wiki is just markdown files
- **qmd** (local markdown search) helps at scale when the index file isn't enough
- **Obsidian Web Clipper** converts web articles to markdown for easy source ingestion
- The human's job: curate sources, direct analysis, ask good questions
- The LLM's job: summarize, cross-reference, file, maintain consistency

## Starting a New Wiki

1. Ask the user for the domain/topic and preferred wiki location
2. Create the directory structure above
3. Write an initial `SCHEMA.md` with domain-specific conventions
4. Create empty `wiki/index.md` and `wiki/log.md`
5. Ask for the first source to ingest
