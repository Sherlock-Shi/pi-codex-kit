/**
 * wiki-server — SQLite persistence layer.
 *
 * Schema: pages, links, log_entries + FTS5 virtual table.
 * All operations are synchronous (better-sqlite3) — no async needed.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('entity','concept','source','analysis','index','log','overview')),
  content TEXT NOT NULL,
  sources_count INTEGER DEFAULT 0,
  updated TEXT NOT NULL DEFAULT (datetime('now')),
  embedding BLOB
);

CREATE TABLE IF NOT EXISTS links (
  from_slug TEXT NOT NULL REFERENCES pages(slug) ON DELETE CASCADE,
  to_slug TEXT NOT NULL REFERENCES pages(slug) ON DELETE CASCADE,
  PRIMARY KEY (from_slug, to_slug)
);

CREATE TABLE IF NOT EXISTS log_entries (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  op TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  title, content, content='pages', content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
  INSERT INTO pages_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO pages_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
`;

/** Open (or create) the wiki database at wikiRoot/wiki.db */
export function openDb(wikiRoot) {
  mkdirSync(wikiRoot, { recursive: true });
  const dbPath = join(wikiRoot, "wiki.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/** Upsert a page. Returns the page row. */
export function upsertPage(db, { slug, title, type, content, embedding }) {
  const stmt = db.prepare(`
    INSERT INTO pages (slug, title, type, content, embedding, updated)
    VALUES (@slug, @title, @type, @content, @embedding, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      title = @title, type = @type, content = @content,
      embedding = @embedding, updated = datetime('now')
  `);
  stmt.run({ slug, title, type, content, embedding: embedding ?? null });
  return db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug);
}

/** Get a page by slug. */
export function getPage(db, slug) {
  return db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug);
}

/** Delete a page by slug. */
export function deletePage(db, slug) {
  return db.prepare("DELETE FROM pages WHERE slug = ?").run(slug);
}

/** List all pages (optionally filtered by type). */
export function listPages(db, type) {
  if (type) return db.prepare("SELECT * FROM pages WHERE type = ? ORDER BY updated DESC").all(type);
  return db.prepare("SELECT * FROM pages ORDER BY updated DESC").all();
}

/** Full-text search. Returns matching pages ranked by BM25. */
export function ftsSearch(db, query, limit = 10) {
  return db.prepare(`
    SELECT p.*, rank FROM pages_fts f
    JOIN pages p ON p.id = f.rowid
    WHERE pages_fts MATCH ?
    ORDER BY rank LIMIT ?
  `).all(query, limit);
}

/** Get all pages with embeddings (for vector search). */
export function getEmbeddedPages(db) {
  return db.prepare("SELECT slug, title, type, embedding FROM pages WHERE embedding IS NOT NULL").all();
}

/** Set links for a page (replaces existing outbound links). */
export function setLinks(db, fromSlug, toSlugs) {
  db.prepare("DELETE FROM links WHERE from_slug = ?").run(fromSlug);
  const insert = db.prepare("INSERT OR IGNORE INTO links (from_slug, to_slug) VALUES (?, ?)");
  for (const to of toSlugs) insert.run(fromSlug, to);
}

/** Get inbound + outbound links for a slug. */
export function getLinks(db, slug) {
  const outbound = db.prepare("SELECT to_slug FROM links WHERE from_slug = ?").all(slug).map(r => r.to_slug);
  const inbound = db.prepare("SELECT from_slug FROM links WHERE to_slug = ?").all(slug).map(r => r.from_slug);
  return { inbound, outbound };
}

/** Find orphan pages (no inbound or outbound links). */
export function findOrphans(db) {
  return db.prepare(`
    SELECT p.slug, p.title FROM pages p
    WHERE p.slug NOT IN (SELECT from_slug FROM links)
      AND p.slug NOT IN (SELECT to_slug FROM links)
      AND p.type NOT IN ('index', 'log', 'overview')
  `).all();
}

/** Append a log entry. */
export function addLog(db, op, title, detail) {
  db.prepare("INSERT INTO log_entries (op, title, detail) VALUES (?, ?, ?)").run(op, title, detail ?? null);
}

/** Get recent log entries. */
export function getLog(db, limit = 20) {
  return db.prepare("SELECT * FROM log_entries ORDER ts DESC LIMIT ?").all(limit);
}

/** Page counts by type. */
export function getStatus(db) {
  const counts = db.prepare("SELECT type, COUNT(*) as count FROM pages GROUP BY type").all();
  const total = db.prepare("SELECT COUNT(*) as count FROM pages").get().count;
  const lastLog = db.prepare("SELECT * FROM log_entries ORDER BY ts DESC LIMIT 1").get();
  return { total, counts, lastOperation: lastLog ?? null };
}
