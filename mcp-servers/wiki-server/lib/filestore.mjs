/**
 * wiki-server — File-first persistence layer.
 *
 * All knowledge lives as markdown + YAML on disk (git-friendly, human-editable).
 * SQLite is treated as a derived index (rebuildable from files).
 *
 * Directory layout managed:
 *   <wikiRoot>/
 *   ├── wiki_plan.yaml
 *   ├── _index.yaml
 *   ├── _meta.yaml
 *   ├── en/
 *   │   ├── content/       ← Repo Wiki pages
 *   │   └── knowledge/     ← Knowledge Cards (per-module)
 *   ├── wiki.db            ← derived index (gitignored)
 *   └── .gitignore
 */
import {
  mkdirSync, writeFileSync, readFileSync, existsSync,
  readdirSync, statSync, unlinkSync,
} from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { createHash } from "node:crypto";

// --- Frontmatter ---

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse YAML frontmatter from markdown content.
 * Returns { data: object, body: string }.
 */
export function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { data: {}, body: content };
  const data = parseSimpleYaml(match[1]);
  const body = content.slice(match[0].length);
  return { data, body };
}

/**
 * Serialize frontmatter + body into a markdown file content string.
 */
export function serializeFrontmatter(data, body) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n") + body;
}

/**
 * Compute SHA-256 hash of content (hex, prefixed).
 */
export function contentHash(content) {
  return "sha256:" + createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

// --- Wiki Root Initialization ---

/**
 * Ensure the .codex-wiki directory structure exists.
 * Creates directories and .gitignore if missing.
 * @param {string} wikiRoot - Absolute path to the wiki root
 * @param {string} [locale="en"] - Language directory
 */
export function initWikiRoot(wikiRoot, locale = "en") {
  mkdirSync(wikiRoot, { recursive: true });
  mkdirSync(join(wikiRoot, locale, "content"), { recursive: true });
  mkdirSync(join(wikiRoot, locale, "knowledge"), { recursive: true });

  // .gitignore — wiki.db is a derived index, not source of truth
  const gitignorePath = join(wikiRoot, ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, [
      "# Derived index — rebuildable from markdown/YAML files",
      "wiki.db",
      "wiki.db-wal",
      "wiki.db-shm",
      "node_modules/",
      "",
    ].join("\n"), "utf8");
  }
}

// --- Index YAML (_index.yaml) ---

/**
 * Write the module tree index file.
 * @param {string} wikiRoot
 * @param {object} modules - Module tree from scanner
 * @param {string} [locale="en"]
 */
export function writeIndex(wikiRoot, modules, locale = "en") {
  const index = {
    schema_version: 1,
    locale: `${locale}-US`,
    exported_at: new Date().toISOString(),
    modules,
  };
  const yaml = toYaml(index);
  writeFileSync(join(wikiRoot, "_index.yaml"), yaml, "utf8");
}

/**
 * Read the module tree index file.
 * @param {string} wikiRoot
 * @returns {object|null}
 */
export function readIndex(wikiRoot) {
  const indexPath = join(wikiRoot, "_index.yaml");
  if (!existsSync(indexPath)) return null;
  return parseSimpleYaml(readFileSync(indexPath, "utf8"));
}

// --- Page Export / Import ---

/**
 * Export a wiki page to disk as a markdown file with frontmatter.
 * @param {string} wikiRoot
 * @param {object} page - { slug, title, type, content, links }
 * @param {string} [locale="en"]
 * @returns {string} Absolute path to the written file
 */
export function exportPage(wikiRoot, page, locale = "en") {
  const { slug, title, type, content, links = [] } = page;
  const filePath = pageFilePath(wikiRoot, slug, locale);
  mkdirSync(dirname(filePath), { recursive: true });

  const hash = contentHash(content);
  const frontmatter = {
    title,
    type,
    generated: true,
    generated_at: new Date().toISOString(),
    content_hash: hash,
    human_modified: false,
    links: links.join(", "),
  };

  const fileContent = serializeFrontmatter(frontmatter, content);
  writeFileSync(filePath, fileContent, "utf8");
  return filePath;
}

/**
 * Import a markdown file from disk into a page object.
 * Reads frontmatter for metadata.
 * @param {string} filePath - Absolute path to the markdown file
 * @param {string} wikiRoot - Wiki root for computing slug
 * @param {string} [locale="en"]
 * @returns {object} Page object { slug, title, type, content, links, frontmatter }
 */
export function importPage(filePath, wikiRoot, locale = "en") {
  const raw = readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);

  const contentDir = join(wikiRoot, locale, "content");
  const knowledgeDir = join(wikiRoot, locale, "knowledge");

  let slug;
  if (filePath.startsWith(contentDir)) {
    slug = "content/" + relative(contentDir, filePath).replace(/\\/g, "/").replace(/\.md$/, "");
  } else if (filePath.startsWith(knowledgeDir)) {
    slug = "knowledge/" + relative(knowledgeDir, filePath).replace(/\\/g, "/").replace(/\.md$/, "");
  } else {
    slug = relative(wikiRoot, filePath).replace(/\\/g, "/").replace(/\.md$/, "");
  }

  const links = data.links
    ? String(data.links).split(",").map(s => s.trim()).filter(Boolean)
    : [];

  return {
    slug,
    title: data.title || basename(filePath, ".md"),
    type: data.type || "overview",
    content: body,
    links,
    frontmatter: data,
  };
}

/**
 * Check if a page file has been human-modified (hash mismatch).
 * @param {string} filePath
 * @returns {{ humanModified: boolean, storedHash: string|null, currentHash: string }}
 */
export function checkHumanModified(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const storedHash = data.content_hash || null;
  const currentHash = contentHash(body);
  const humanModified = data.human_modified === true || data.human_modified === "true";

  // If stored hash doesn't match current body and not already flagged, it was human-edited
  const detectedModification = storedHash && storedHash !== currentHash && !humanModified;

  return {
    humanModified: humanModified || detectedModification,
    storedHash,
    currentHash,
  };
}

/**
 * Mark a file as human-modified in its frontmatter.
 */
export function markHumanModified(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  data.human_modified = true;
  data.content_hash = contentHash(body);
  writeFileSync(filePath, serializeFrontmatter(data, body), "utf8");
}

/**
 * Reset human_modified flag (opt back into auto-generation).
 */
export function resetHumanModified(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  data.human_modified = false;
  data.content_hash = contentHash(body);
  data.generated_at = new Date().toISOString();
  writeFileSync(filePath, serializeFrontmatter(data, body), "utf8");
}

// --- File Discovery ---

/**
 * Recursively find all markdown files under a directory.
 * @param {string} dir
 * @returns {string[]} Absolute paths
 */
export function findMarkdownFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

// --- wiki_plan.yaml ---

/**
 * Read wiki_plan.yaml from the wiki root.
 * @param {string} wikiRoot
 * @returns {object|null}
 */
export function readWikiPlan(wikiRoot) {
  const planPath = join(wikiRoot, "wiki_plan.yaml");
  if (!existsSync(planPath)) return null;
  return parseSimpleYaml(readFileSync(planPath, "utf8"));
}

/**
 * Write a default wiki_plan.yaml if none exists.
 */
export function ensureWikiPlan(wikiRoot) {
  const planPath = join(wikiRoot, "wiki_plan.yaml");
  if (existsSync(planPath)) return;
  const defaultPlan = [
    "version: 1",
    "",
    "repowiki:",
    '  template: ""',
    "  notes: []",
    "  documents: []",
    "",
    "knowledgecard:",
    "  notes: []",
    "",
    "scope:",
    "  include: []",
    "  exclude:",
    '    - "**/node_modules/**"',
    '    - ".qoder/**"',
    '    - ".codex-wiki/**"',
    "",
  ].join("\n");
  writeFileSync(planPath, defaultPlan, "utf8");
}

// --- Helpers ---

/**
 * Compute the file path for a page slug within the wiki root.
 */
export function pageFilePath(wikiRoot, slug, locale = "en") {
  // Slugs like "content/System Overview" or "knowledge/hooks/overview"
  return join(wikiRoot, locale, `${slug}.md`);
}

/**
 * Minimal YAML serializer (handles nested objects, arrays, scalars).
 * Not a full YAML implementation — sufficient for our structured data.
 */
export function toYaml(obj, indent = 0) {
  const lines = [];
  const pad = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${pad}${key}: null`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else if (typeof value[0] === "object") {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          lines.push(`${pad}  - ${toYamlInline(item)}`);
        }
      } else {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          lines.push(`${pad}  - ${yamlScalar(item)}`);
        }
      }
    } else if (typeof value === "object") {
      lines.push(`${pad}${key}:`);
      lines.push(toYaml(value, indent + 1));
    } else {
      lines.push(`${pad}${key}: ${yamlScalar(value)}`);
    }
  }
  return lines.join("\n");
}

function toYamlInline(obj) {
  const parts = Object.entries(obj).map(([k, v]) => `${k}: ${yamlScalar(v)}`);
  return `{ ${parts.join(", ")} }`;
}

function yamlScalar(value) {
  if (typeof value === "string") {
    if (value.includes(":") || value.includes("#") || value.includes('"') || value.includes("'") || value.startsWith(" ")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Minimal YAML parser (handles our structured subset).
 * Handles: scalars, arrays, nested objects, quoted strings.
 */
export function parseSimpleYaml(text) {
  const result = {};
  const lines = text.split("\n");
  const stack = [{ obj: result, indent: -1 }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Pop stack to correct level
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    // Array item
    if (trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim();
      if (Array.isArray(parent)) {
        parent.push(parseYamlValue(value));
      }
      continue;
    }

    // Key: value
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (rawValue === "" || rawValue === "[]") {
      // Could be object or array — peek ahead
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith("- ")) {
        const arr = [];
        parent[key] = arr;
        stack.push({ obj: arr, indent });
      } else if (rawValue === "[]") {
        parent[key] = [];
      } else {
        const obj = {};
        parent[key] = obj;
        stack.push({ obj, indent });
      }
    } else {
      parent[key] = parseYamlValue(rawValue);
    }
  }
  return result;
}

function parseYamlValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (raw === "[]") return [];
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  // Strip quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}
