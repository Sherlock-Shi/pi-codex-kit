/**
 * wiki-server — MCP tool definitions and handlers.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import * as db from "./db.mjs";
import { embed, embeddingToBuffer, vectorSearch } from "./embeddings.mjs";

/** MCP tool schema definitions (returned by tools/list). */
export const TOOLS = [
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
];

/** Handle a tools/call request. Returns the tool result content. */
export async function handleToolCall(name, args) {
  switch (name) {
    case "wiki_ingest": return handleIngest(args);
    case "wiki_query": return handleQuery(args);
    case "wiki_lint": return handleLint(args);
    case "wiki_page_read": return handlePageRead(args);
    case "wiki_page_write": return handlePageWrite(args);
    case "wiki_status": return handleStatus(args);
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
