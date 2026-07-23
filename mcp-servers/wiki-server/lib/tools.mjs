/**
 * wiki-server — MCP tool definitions and handlers.
 *
 * Original tools (backward-compatible): wiki_ingest, wiki_query, wiki_lint,
 *   wiki_page_read, wiki_page_write, wiki_status
 *
 * Knowledge Engine tools (v2): wiki_scan_project, wiki_export_page,
 *   wiki_import_page, wiki_rebuild_index, wiki_generate_cards,
 *   wiki_detect_drift
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import * as db from "./db.mjs";
import { embed, embeddingToBuffer, vectorSearch } from "./embeddings.mjs";
import { scanProject } from "./scanner.mjs";
import {
  initWikiRoot, writeIndex, readIndex, exportPage, importPage,
  findMarkdownFiles, readWikiPlan, ensureWikiPlan, toYaml,
} from "./filestore.mjs";
import { scaffoldCards, readCard, writeCard, listCards, CARD_TYPES } from "./cards.mjs";
import { detectDrift, indexProject, readMeta, writeMeta, markModulesIndexed, saveProgress, readProgress } from "./drift.mjs";

/** MCP tool schema definitions (returned by tools/list). */
export const TOOLS = [
  // --- Original tools (backward-compatible) ---
  {
    name: "wiki_ingest",
    description: "Ingest a raw source file into the wiki. Reads the file, creates a source summary page, and updates related entity/concept pages. Returns a summary of changes.",
    inputSchema: {
      type: "object",
      properties: {
        sourcePath: { type: "string", description: "Absolute path to the source file to ingest" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory (contains wiki.db)" },
        summary: { type: "string", description: "Agent-written summary of the source content" },
        entities: { type: "array", items: { type: "string" }, description: "Entity slugs to update/create from this source" },
        concepts: { type: "array", items: { type: "string" }, description: "Concept slugs to update/create from this source" },
      },
      required: ["sourcePath", "wikiRoot", "summary"],
    },
  },
  {
    name: "wiki_query",
    description: "Query the wiki using semantic + keyword search. Returns relevant pages with citations.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question to search for" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        topK: { type: "number", description: "Number of results to return (default 5)" },
      },
      required: ["question", "wikiRoot"],
    },
  },
  {
    name: "wiki_lint",
    description: "Health-check the wiki: find orphans, missing cross-references, and index drift.",
    inputSchema: {
      type: "object",
      properties: {
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
      },
      required: ["wikiRoot"],
    },
  },
  {
    name: "wiki_page_read",
    description: "Read a specific wiki page by slug. Returns content, metadata, and link graph.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Page slug (e.g. 'entities/alan-turing')" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
      },
      required: ["slug", "wikiRoot"],
    },
  },
  {
    name: "wiki_page_write",
    description: "Create or update a wiki page. Computes embedding and updates the link graph.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Page slug (e.g. 'concepts/computability')" },
        title: { type: "string", description: "Human-readable page title" },
        type: { type: "string", enum: ["entity", "concept", "source", "analysis", "index", "log", "overview"], description: "Page type" },
        content: { type: "string", description: "Markdown content for the page" },
        links: { type: "array", items: { type: "string" }, description: "Slugs of related pages to link to" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
      },
      required: ["slug", "title", "type", "content", "wikiRoot"],
    },
  },
  {
    name: "wiki_status",
    description: "Get wiki dashboard: page counts by type, last operation, total pages.",
    inputSchema: {
      type: "object",
      properties: {
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
      },
      required: ["wikiRoot"],
    },
  },

  // --- Knowledge Engine tools (v2) ---
  {
    name: "wiki_scan_project",
    description: "Analyze a project directory structure and produce a module tree (_index.yaml). Identifies modules by marker files (package.json, README.md, SKILL.md, etc.), infers dependencies, and writes the index to the wiki root.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string", description: "Absolute path to the project to scan" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory (.codex-wiki)" },
        locale: { type: "string", description: "Language code (default 'en')" },
        exclude: { type: "array", items: { type: "string" }, description: "Glob patterns to exclude" },
        maxDepth: { type: "number", description: "Max directory depth to scan (default 4)" },
      },
      required: ["projectRoot", "wikiRoot"],
    },
  },
  {
    name: "wiki_export_page",
    description: "Write a wiki page to disk as a markdown file with YAML frontmatter (file-first persistence). Creates the directory structure as needed.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Page slug (e.g. 'content/System Overview')" },
        title: { type: "string", description: "Human-readable page title" },
        type: { type: "string", description: "Page type (overview, architecture, concept, etc.)" },
        content: { type: "string", description: "Markdown body content" },
        links: { type: "array", items: { type: "string" }, description: "Related page slugs" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        locale: { type: "string", description: "Language code (default 'en')" },
      },
      required: ["slug", "title", "type", "content", "wikiRoot"],
    },
  },
  {
    name: "wiki_import_page",
    description: "Read a markdown file from disk into the wiki index (SQLite FTS + embeddings). Used for git-pull sync — imports file-backed pages into the searchable index.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Absolute path to the markdown file to import" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        locale: { type: "string", description: "Language code (default 'en')" },
      },
      required: ["filePath", "wikiRoot"],
    },
  },
  {
    name: "wiki_rebuild_index",
    description: "Rebuild the SQLite FTS + embedding index from all on-disk markdown/YAML files. Use after git pull or when the index is corrupted/outdated.",
    inputSchema: {
      type: "object",
      properties: {
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        locale: { type: "string", description: "Language code (default 'en')" },
      },
      required: ["wikiRoot"],
    },
  },
  {
    name: "wiki_generate_cards",
    description: "Scaffold knowledge card files for a module (overview, architecture_design, coding_conventions, tech_stack). Creates empty templates with frontmatter. Does not overwrite existing or human-modified cards.",
    inputSchema: {
      type: "object",
      properties: {
        modulePath: { type: "string", description: "Module path key (e.g. 'hooks', 'skills/audit-code', '' for root)" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        locale: { type: "string", description: "Language code (default 'en')" },
        moduleTitle: { type: "string", description: "Human-readable module title" },
        scope: { type: "array", items: { type: "string" }, description: "File paths in scope" },
      },
      required: ["modulePath", "wikiRoot"],
    },
  },
  {
    name: "wiki_write_card",
    description: "Write/update a knowledge card for a module. Respects human-edit protection unless force=true.",
    inputSchema: {
      type: "object",
      properties: {
        modulePath: { type: "string", description: "Module path key" },
        cardType: { type: "string", enum: ["overview", "architecture_design", "coding_conventions", "tech_stack"], description: "Card type to write" },
        content: { type: "string", description: "Markdown content for the card" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        locale: { type: "string", description: "Language code (default 'en')" },
        force: { type: "boolean", description: "Override human-edit protection (default false)" },
      },
      required: ["modulePath", "cardType", "content", "wikiRoot"],
    },
  },
  {
    name: "wiki_read_card",
    description: "Read a knowledge card for a module. Returns content, frontmatter, and human-modified status.",
    inputSchema: {
      type: "object",
      properties: {
        modulePath: { type: "string", description: "Module path key" },
        cardType: { type: "string", enum: ["overview", "architecture_design", "coding_conventions", "tech_stack"], description: "Card type to read" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        locale: { type: "string", description: "Language code (default 'en')" },
      },
      required: ["modulePath", "cardType", "wikiRoot"],
    },
  },
  {
    name: "wiki_detect_drift",
    description: "Compare stored content hashes against current project files. Returns stale modules, added/removed files, and affected module list for incremental regeneration.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string", description: "Absolute path to the project" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
      },
      required: ["projectRoot", "wikiRoot"],
    },
  },
  {
    name: "wiki_index_project",
    description: "Index all source files in the project — compute and store content hashes in _meta.yaml. Call after initial generation or full rebuild.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string", description: "Absolute path to the project" },
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        exclude: { type: "array", items: { type: "string" }, description: "Glob patterns to exclude" },
      },
      required: ["projectRoot", "wikiRoot"],
    },
  },
  {
    name: "wiki_save_progress",
    description: "Save generation progress for resumability. Tracks which modules are pending, completed, or failed.",
    inputSchema: {
      type: "object",
      properties: {
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
        pending: { type: "array", items: { type: "string" }, description: "Module paths still pending" },
        completed: { type: "array", items: { type: "string" }, description: "Module paths completed" },
        failed: { type: "array", items: { type: "string" }, description: "Module paths that failed" },
      },
      required: ["wikiRoot", "pending", "completed"],
    },
  },
  {
    name: "wiki_read_progress",
    description: "Read saved generation progress. Returns pending/completed/failed module lists for resumable workflows.",
    inputSchema: {
      type: "object",
      properties: {
        wikiRoot: { type: "string", description: "Absolute path to the wiki root directory" },
      },
      required: ["wikiRoot"],
    },
  },
];

/** Handle a tools/call request. Returns the tool result content. */
export async function handleToolCall(name, args) {
  switch (name) {
    // Original tools
    case "wiki_ingest": return handleIngest(args);
    case "wiki_query": return handleQuery(args);
    case "wiki_lint": return handleLint(args);
    case "wiki_page_read": return handlePageRead(args);
    case "wiki_page_write": return handlePageWrite(args);
    case "wiki_status": return handleStatus(args);
    // Knowledge Engine tools (v2)
    case "wiki_scan_project": return handleScanProject(args);
    case "wiki_export_page": return handleExportPage(args);
    case "wiki_import_page": return handleImportPage(args);
    case "wiki_rebuild_index": return handleRebuildIndex(args);
    case "wiki_generate_cards": return handleGenerateCards(args);
    case "wiki_write_card": return handleWriteCard(args);
    case "wiki_read_card": return handleReadCard(args);
    case "wiki_detect_drift": return handleDetectDrift(args);
    case "wiki_index_project": return handleIndexProject(args);
    case "wiki_save_progress": return handleSaveProgress(args);
    case "wiki_read_progress": return handleReadProgress(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleIngest({ sourcePath, wikiRoot, summary, entities = [], concepts = [] }) {
  const database = db.openDb(wikiRoot);
  try {
    const sourceContent = readFileSync(sourcePath, "utf8");
    const slug = `sources/${basename(sourcePath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    // Create source page with embedding
    const emb = await embed(summary);
    db.upsertPage(database, {
      slug, title: basename(sourcePath), type: "source",
      content: summary, embedding: embeddingToBuffer(emb),
    });

    // Create/update entity and concept pages
    const linked = [slug];
    for (const entitySlug of entities) {
      const fullSlug = entitySlug.startsWith("entities/") ? entitySlug : `entities/${entitySlug}`;
      const existing = db.getPage(database, fullSlug);
      const content = existing
        ? `${existing.content}\n\n## From ${basename(sourcePath)}\n${summary.slice(0, 200)}`
        : `# ${entitySlug}\n\n## From ${basename(sourcePath)}\n${summary.slice(0, 200)}`;
      const eEmb = await embed(content.slice(0, 2000));
      db.upsertPage(database, { slug: fullSlug, title: entitySlug, type: "entity", content, embedding: embeddingToBuffer(eEmb) });
      db.setLinks(database, slug, [...(db.getLinks(database, slug).outbound), fullSlug]);
      linked.push(fullSlug);
    }
    for (const conceptSlug of concepts) {
      const fullSlug = conceptSlug.startsWith("concepts/") ? conceptSlug : `concepts/${conceptSlug}`;
      const existing = db.getPage(database, fullSlug);
      const content = existing
        ? `${existing.content}\n\n## From ${basename(sourcePath)}\n${summary.slice(0, 200)}`
        : `# ${conceptSlug}\n\n## From ${basename(sourcePath)}\n${summary.slice(0, 200)}`;
      const cEmb = await embed(content.slice(0, 2000));
      db.upsertPage(database, { slug: fullSlug, title: conceptSlug, type: "concept", content, embedding: embeddingToBuffer(cEmb) });
      db.setLinks(database, slug, [...(db.getLinks(database, slug).outbound), fullSlug]);
      linked.push(fullSlug);
    }

    db.addLog(database, "ingest", basename(sourcePath), `Pages: ${linked.join(", ")}`);
    return { text: JSON.stringify({ ingested: slug, pagesUpdated: linked, total: linked.length }) };
  } finally {
    database.close();
  }
}

async function handleQuery({ question, wikiRoot, topK = 5 }) {
  const database = db.openDb(wikiRoot);
  try {
    // Hybrid search: FTS5 keyword + vector semantic
    let ftsResults = [];
    try { ftsResults = db.ftsSearch(database, question, topK); } catch { /* FTS match syntax error — skip */ }

    const queryEmb = await embed(question);
    const embeddedPages = db.getEmbeddedPages(database);
    const vectorResults = vectorSearch(queryEmb, embeddedPages, topK);

    // Merge and deduplicate by slug, prefer higher score
    const seen = new Set();
    const merged = [];
    for (const r of vectorResults) {
      if (!seen.has(r.slug)) { seen.add(r.slug); merged.push({ slug: r.slug, title: r.title, type: r.type, score: r.score, source: "semantic" }); }
    }
    for (const r of ftsResults) {
      if (!seen.has(r.slug)) { seen.add(r.slug); merged.push({ slug: r.slug, title: r.title, type: r.type, score: null, source: "keyword" }); }
    }

    db.addLog(database, "query", question, `${merged.length} results`);
    return { text: JSON.stringify({ question, results: merged.slice(0, topK) }) };
  } finally {
    database.close();
  }
}

function handleLint({ wikiRoot }) {
  const database = db.openDb(wikiRoot);
  try {
    const orphans = db.findOrphans(database);
    const allPages = db.listPages(database);
    const slugs = new Set(allPages.map(p => p.slug));

    // Find broken links
    const brokenLinks = [];
    for (const page of allPages) {
      const { outbound } = db.getLinks(database, page.slug);
      for (const target of outbound) {
        if (!slugs.has(target)) brokenLinks.push({ from: page.slug, to: target });
      }
    }

    const findings = {
      orphans: orphans.map(o => ({ slug: o.slug, title: o.title })),
      brokenLinks,
      totalPages: allPages.length,
      pagesWithoutEmbedding: allPages.filter(p => !p.embedding).length,
    };

    db.addLog(database, "lint", "Health check", `${orphans.length} orphans, ${brokenLinks.length} broken links`);
    return { text: JSON.stringify(findings) };
  } finally {
    database.close();
  }
}

function handlePageRead({ slug, wikiRoot }) {
  const database = db.openDb(wikiRoot);
  try {
    const page = db.getPage(database, slug);
    if (!page) return { text: JSON.stringify({ error: `Page not found: ${slug}` }) };
    const links = db.getLinks(database, slug);
    return {
      text: JSON.stringify({
        slug: page.slug, title: page.title, type: page.type,
        content: page.content, updated: page.updated,
        sourcesCount: page.sources_count,
        links,
      }),
    };
  } finally {
    database.close();
  }
}

async function handlePageWrite({ slug, title, type, content, links = [], wikiRoot }) {
  const database = db.openDb(wikiRoot);
  try {
    const emb = await embed(content);
    db.upsertPage(database, { slug, title, type, content, embedding: embeddingToBuffer(emb) });
    if (links.length > 0) db.setLinks(database, slug, links);
    const updatedLinks = db.getLinks(database, slug);
    return { text: JSON.stringify({ written: slug, links: updatedLinks }) };
  } finally {
    database.close();
  }
}

function handleStatus({ wikiRoot }) {
  const database = db.openDb(wikiRoot);
  try {
    const status = db.getStatus(database);
    return { text: JSON.stringify(status) };
  } finally {
    database.close();
  }
}

// --- Knowledge Engine tool handlers (v2) ---

function handleScanProject({ projectRoot, wikiRoot, locale = "en", exclude = [], maxDepth = 4 }) {
  initWikiRoot(wikiRoot, locale);
  ensureWikiPlan(wikiRoot);

  const { modules, rootFiles } = scanProject(projectRoot, { exclude, maxDepth });
  writeIndex(wikiRoot, modules, locale);

  const moduleCount = Object.keys(modules).length;
  const childModules = Object.keys(modules).filter(k => k !== "");

  const database = db.openDb(wikiRoot);
  try {
    db.addLog(database, "scan", projectRoot, `${moduleCount} modules found`);
  } finally {
    database.close();
  }

  return { text: JSON.stringify({
    scanned: projectRoot,
    modules: moduleCount,
    moduleTree: childModules,
    rootFiles,
    indexWritten: `${wikiRoot}/_index.yaml`,
  }) };
}

function handleExportPage({ slug, title, type, content, links = [], wikiRoot, locale = "en" }) {
  initWikiRoot(wikiRoot, locale);
  const filePath = exportPage(wikiRoot, { slug, title, type, content, links }, locale);

  // Also index in SQLite for search
  const database = db.openDb(wikiRoot);
  try {
    db.upsertPage(database, { slug, title, type, content, embedding: null });
    if (links.length > 0) db.setLinks(database, slug, links);
  } finally {
    database.close();
  }

  return { text: JSON.stringify({ exported: slug, filePath }) };
}

async function handleImportPage({ filePath, wikiRoot, locale = "en" }) {
  const page = importPage(filePath, wikiRoot, locale);

  // Index in SQLite with embedding
  const database = db.openDb(wikiRoot);
  try {
    const emb = await embed(page.content.slice(0, 2000));
    db.upsertPage(database, {
      slug: page.slug, title: page.title, type: page.type,
      content: page.content, embedding: embeddingToBuffer(emb),
    });
    if (page.links.length > 0) db.setLinks(database, page.slug, page.links);
  } finally {
    database.close();
  }

  return { text: JSON.stringify({ imported: page.slug, title: page.title, type: page.type }) };
}

async function handleRebuildIndex({ wikiRoot, locale = "en" }) {
  const database = db.openDb(wikiRoot);
  try {
    // Clear existing pages
    database.exec("DELETE FROM pages; DELETE FROM links;");

    // Find all markdown files on disk
    const contentDir = `${wikiRoot}/${locale}/content`;
    const knowledgeDir = `${wikiRoot}/${locale}/knowledge`;
    const files = [...findMarkdownFiles(contentDir), ...findMarkdownFiles(knowledgeDir)];

    let imported = 0;
    for (const filePath of files) {
      try {
        const page = importPage(filePath, wikiRoot, locale);
        const emb = await embed(page.content.slice(0, 2000));
        db.upsertPage(database, {
          slug: page.slug, title: page.title, type: page.type,
          content: page.content, embedding: embeddingToBuffer(emb),
        });
        if (page.links.length > 0) db.setLinks(database, page.slug, page.links);
        imported++;
      } catch { /* skip unreadable files */ }
    }

    db.addLog(database, "rebuild_index", wikiRoot, `${imported} pages indexed`);
    return { text: JSON.stringify({ rebuilt: true, pagesIndexed: imported, source: "disk" }) };
  } finally {
    database.close();
  }
}

function handleGenerateCards({ modulePath, wikiRoot, locale = "en", moduleTitle, scope = [] }) {
  initWikiRoot(wikiRoot, locale);
  const moduleInfo = { dir_name: moduleTitle || modulePath, title: moduleTitle || modulePath, scope, source_files: [] };
  const result = scaffoldCards(wikiRoot, modulePath, moduleInfo, locale);
  return { text: JSON.stringify({ module: modulePath, ...result }) };
}

function handleWriteCard({ modulePath, cardType, content, wikiRoot, locale = "en", force = false }) {
  const result = writeCard(wikiRoot, modulePath, cardType, content, locale, force);
  return { text: JSON.stringify({ module: modulePath, cardType, ...result }) };
}

function handleReadCard({ modulePath, cardType, wikiRoot, locale = "en" }) {
  const result = readCard(wikiRoot, modulePath, cardType, locale);
  if (!result) return { text: JSON.stringify({ error: `Card not found: ${modulePath}/${cardType}` }) };
  return { text: JSON.stringify({ module: modulePath, cardType, ...result }) };
}

function handleDetectDrift({ projectRoot, wikiRoot }) {
  const result = detectDrift(projectRoot, wikiRoot);
  return { text: JSON.stringify(result) };
}

function handleIndexProject({ projectRoot, wikiRoot, exclude = [] }) {
  initWikiRoot(wikiRoot);
  const result = indexProject(projectRoot, wikiRoot, { exclude });
  return { text: JSON.stringify(result) };
}

function handleSaveProgress({ wikiRoot, pending, completed, failed = [] }) {
  saveProgress(wikiRoot, { pending, completed, failed });
  return { text: JSON.stringify({ saved: true, pending: pending.length, completed: completed.length, failed: failed.length }) };
}

function handleReadProgress({ wikiRoot }) {
  const progress = readProgress(wikiRoot);
  return { text: JSON.stringify({ progress }) };
}
