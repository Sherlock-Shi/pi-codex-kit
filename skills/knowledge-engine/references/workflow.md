# Knowledge Engine — Workflow Reference

Detailed step-by-step workflows for each operation. The agent follows these
sequences when executing knowledge-engine tasks.

## Generate Workflow (First-Time)

```
1. wiki_scan_project(projectRoot, wikiRoot)
   → produces _index.yaml with module tree

2. Read wiki_plan.yaml (if exists)
   → extract scope.include, scope.exclude
   → extract repowiki.notes, repowiki.documents
   → extract knowledgecard.notes

3. wiki_index_project(projectRoot, wikiRoot, exclude)
   → hashes all source files into _meta.yaml

4. FOR EACH module in _index.yaml modules:
   │
   ├─ wiki_generate_cards(modulePath, wikiRoot, moduleTitle, scope)
   │  → scaffolds _module.yaml + empty card templates
   │
   ├─ Read module source files (from scope list)
   │  → understand purpose, patterns, conventions, dependencies
   │
   ├─ wiki_write_card(modulePath, "overview", content, wikiRoot)
   ├─ wiki_write_card(modulePath, "architecture_design", content, wikiRoot)
   ├─ wiki_write_card(modulePath, "coding_conventions", content, wikiRoot)
   ├─ wiki_write_card(modulePath, "tech_stack", content, wikiRoot)
   │
   ├─ wiki_save_progress(wikiRoot, pending, completed, failed)
   │  → checkpoint after each module
   │
   └─ VALIDATE: each card >50 chars, non-empty
      → if fail: retry once, then mark failed

5. Generate wiki pages (en/content/):
   ├─ System Overview.md (top-level synthesis)
   ├─ Per-section pages (grouped by module affinity)
   └─ wiki_export_page(slug, title, type, content, links, wikiRoot)

6. wiki_rebuild_index(wikiRoot)
   → makes everything searchable via wiki_query
```

## Update Workflow (Incremental)

```
1. wiki_detect_drift(projectRoot, wikiRoot)
   → returns { stale, added, removed, affectedModules, clean }

2. IF clean → report "up to date" → STOP

3. FOR EACH module in affectedModules:
   │
   ├─ wiki_read_card(modulePath, "overview", wikiRoot)
   │  → check humanModified flag
   │  → IF humanModified: SKIP, note in report
   │
   ├─ Re-read module source files
   ├─ Regenerate card content
   ├─ wiki_write_card(modulePath, cardType, newContent, wikiRoot)
   │
   └─ Update related wiki pages if needed

4. wiki_index_project(projectRoot, wikiRoot)
   → refresh content hashes

5. wiki_rebuild_index(wikiRoot)

6. Report: N updated, M skipped (protected), K pages refreshed
```

## Resume Workflow (After Interruption)

```
1. wiki_read_progress(wikiRoot)
   → returns { pending, completed, failed }

2. IF no progress → start fresh Generate workflow

3. FOR EACH module in pending + failed:
   → execute Generate steps 4a–4d for that module only

4. Continue with Generate steps 5–6
```

## Sync Workflow (After git pull)

```
1. wiki_rebuild_index(wikiRoot)
   → re-indexes all on-disk markdown into SQLite

2. Report: N pages imported
```

## Card Content Guidelines

### overview.md
- Module purpose (1-2 sentences)
- Key responsibilities (bullet list)
- Boundaries (what it does NOT do)
- Key exports / public interface
- Relationship to parent/sibling modules

### architecture_design.md
- Design patterns used
- Component relationships (can include mermaid diagrams)
- Data flow description
- Key architectural decisions and rationale
- Error handling strategy

### coding_conventions.md
- Naming conventions (files, functions, variables)
- Style rules (formatting, imports ordering)
- Interface agreements (function signatures, return types)
- Team-specific standards
- Anti-patterns to avoid

### tech_stack.md
- Runtime requirements (Node version, etc.)
- Dependencies with version constraints
- External tools required
- Build/test commands
- Environment variables

## Validation Rules

A generated card is valid if:
- Content length > 50 characters
- Contains at least one markdown heading (#)
- Does not contain only the scaffold placeholder ("_Pending generation._")

If invalid after retry, mark module as `failed` in progress and continue
with remaining modules. Report failures at the end.

## Human-Edit Detection Logic

```
ON UPDATE for each card file:
  1. Read frontmatter.content_hash (stored at generation time)
  2. Compute hash of current file body
  3. IF hashes differ AND human_modified != true:
     → User edited the file since generation
     → Set human_modified: true in frontmatter
     → SKIP regeneration for this card
  4. IF human_modified == true:
     → Already known to be user-edited
     → SKIP regeneration
  5. IF hashes match:
     → File unchanged since generation
     → Safe to regenerate
```
