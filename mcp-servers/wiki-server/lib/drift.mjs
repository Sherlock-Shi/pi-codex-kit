/**
 * wiki-server — Drift detection via content hashing.
 *
 * Tracks per-file content hashes in _meta.yaml. On demand, recomputes
 * hashes and identifies stale modules whose source files have changed
 * since last indexing. No file watcher needed — purely on-demand.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { toYaml, parseSimpleYaml } from "./filestore.mjs";

/** Directories excluded from drift scanning. */
const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", ".svn", ".hg", "__pycache__",
  ".codex-wiki", ".qoder", "dist", "build", ".next",
  "coverage", ".cache", ".turbo",
]);

/** Source file extensions tracked for drift. */
const TRACKED_EXTENSIONS = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
  ".py", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h",
  ".cs", ".php", ".swift", ".kt", ".scala", ".sh", ".ps1",
  ".md", ".yaml", ".yml", ".json", ".toml",
]);

/**
 * Compute SHA-256 hash of a file's content.
 * @param {string} filePath - Absolute path
 * @returns {string} "sha256:<hex16>"
 */
export function hashFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  return "sha256:" + createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

/**
 * Read _meta.yaml from the wiki root.
 * @param {string} wikiRoot
 * @returns {object} Meta object with sources, generation info
 */
export function readMeta(wikiRoot) {
  const metaPath = join(wikiRoot, "_meta.yaml");
  if (!existsSync(metaPath)) {
    return { schema_version: 1, sources: {}, generation: {} };
  }
  const raw = readFileSync(metaPath, "utf8");
  const parsed = parseSimpleYaml(raw);
  return {
    schema_version: parsed.schema_version || 1,
    sources: parsed.sources || {},
    generation: parsed.generation || {},
  };
}

/**
 * Write _meta.yaml to the wiki root.
 * @param {string} wikiRoot
 * @param {object} meta
 */
export function writeMeta(wikiRoot, meta) {
  const metaPath = join(wikiRoot, "_meta.yaml");
  const yaml = toYaml({
    schema_version: meta.schema_version || 1,
    updated_at: new Date().toISOString(),
    sources: meta.sources || {},
    generation: meta.generation || {},
  });
  writeFileSync(metaPath, yaml, "utf8");
}

/**
 * Index all source files in the project and store hashes in _meta.yaml.
 * @param {string} projectRoot - Absolute path to the project
 * @param {string} wikiRoot - Absolute path to wiki root
 * @param {object} [options]
 * @param {string[]} [options.exclude] - Additional exclude patterns
 * @param {number} [options.maxFiles=2000] - Safety cap
 * @returns {{ indexed: number, modules: string[] }}
 */
export function indexProject(projectRoot, wikiRoot, options = {}) {
  const { exclude = [], maxFiles = 2000 } = options;
  const meta = readMeta(wikiRoot);
  const sources = {};
  let count = 0;

  scanFiles(projectRoot, projectRoot, sources, count, maxFiles, exclude);
  count = Object.keys(sources).length;

  meta.sources = sources;
  meta.generation.last_full_index = new Date().toISOString();
  writeMeta(wikiRoot, meta);

  // Derive unique modules
  const modules = [...new Set(Object.values(sources).map(s => s.module))];
  return { indexed: count, modules };
}

/**
 * Detect drift: compare current file hashes against stored _meta.yaml.
 * @param {string} projectRoot
 * @param {string} wikiRoot
 * @returns {{ stale: Array<{file, module, oldHash, newHash}>, added: string[], removed: string[], clean: boolean }}
 */
export function detectDrift(projectRoot, wikiRoot) {
  const meta = readMeta(wikiRoot);
  const storedSources = meta.sources || {};

  // Compute current state
  const currentSources = {};
  scanFiles(projectRoot, projectRoot, currentSources, 0, 5000, []);

  const stale = [];
  const added = [];
  const removed = [];

  // Check for modified and removed files
  for (const [filePath, info] of Object.entries(storedSources)) {
    if (!(filePath in currentSources)) {
      removed.push(filePath);
    } else if (currentSources[filePath].hash !== info.hash) {
      stale.push({
        file: filePath,
        module: info.module || currentSources[filePath].module,
        oldHash: info.hash,
        newHash: currentSources[filePath].hash,
      });
    }
  }

  // Check for added files
  for (const filePath of Object.keys(currentSources)) {
    if (!(filePath in storedSources)) {
      added.push(filePath);
    }
  }

  return {
    stale,
    added,
    removed,
    clean: stale.length === 0 && added.length === 0 && removed.length === 0,
    staleModules: [...new Set(stale.map(s => s.module))],
    affectedModules: [...new Set([
      ...stale.map(s => s.module),
      ...added.map(f => deriveModule(f)),
      ...removed.map(f => deriveModule(f)),
    ])],
  };
}

/**
 * Update _meta.yaml after a successful regeneration of specific modules.
 * @param {string} projectRoot
 * @param {string} wikiRoot
 * @param {string[]} modules - Module paths that were regenerated
 */
export function markModulesIndexed(projectRoot, wikiRoot, modules) {
  const meta = readMeta(wikiRoot);
  const moduleSet = new Set(modules);

  // Re-hash files belonging to these modules
  const currentSources = {};
  scanFiles(projectRoot, projectRoot, currentSources, 0, 5000, []);

  for (const [filePath, info] of Object.entries(currentSources)) {
    if (moduleSet.has(info.module)) {
      meta.sources[filePath] = info;
    }
  }

  meta.generation.last_incremental = new Date().toISOString();
  meta.generation.last_modules = modules;
  writeMeta(wikiRoot, meta);
}

/**
 * Record generation progress for resumability.
 * @param {string} wikiRoot
 * @param {object} progress - { pending: string[], completed: string[], failed: string[] }
 */
export function saveProgress(wikiRoot, progress) {
  const meta = readMeta(wikiRoot);
  meta.generation.progress = {
    ...progress,
    updated_at: new Date().toISOString(),
  };
  writeMeta(wikiRoot, meta);
}

/**
 * Read generation progress.
 * @param {string} wikiRoot
 * @returns {{ pending: string[], completed: string[], failed: string[] } | null}
 */
export function readProgress(wikiRoot) {
  const meta = readMeta(wikiRoot);
  return meta.generation?.progress || null;
}

// --- Helpers ---

/**
 * Recursively scan files and compute hashes.
 */
function scanFiles(projectRoot, dir, sources, count, maxFiles, exclude) {
  if (count >= maxFiles) return;

  let entries;
  try { entries = readdirSync(dir); } catch { return; }

  for (const entry of entries) {
    if (count >= maxFiles) break;
    const fullPath = join(dir, entry);

    let st;
    try { st = statSync(fullPath); } catch { continue; }

    if (st.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry) || entry.startsWith(".")) continue;
      scanFiles(projectRoot, fullPath, sources, count, maxFiles, exclude);
    } else if (st.isFile()) {
      const ext = "." + entry.split(".").pop().toLowerCase();
      if (!TRACKED_EXTENSIONS.has(ext)) continue;

      const relPath = relative(projectRoot, fullPath).replace(/\\/g, "/");

      // Check exclude patterns
      if (isExcluded(relPath, exclude)) continue;

      try {
        const hash = hashFile(fullPath);
        sources[relPath] = {
          hash,
          module: deriveModule(relPath),
          last_indexed: new Date().toISOString(),
        };
        count++;
      } catch { /* skip unreadable */ }
    }
  }
}

/**
 * Derive module path from a relative file path.
 * Module = first directory segment (or "" for root files).
 */
function deriveModule(relPath) {
  const parts = relPath.split("/");
  if (parts.length <= 1) return "";
  return parts[0];
}

/**
 * Check if a path matches exclude patterns.
 */
function isExcluded(relPath, patterns) {
  for (const pattern of patterns) {
    const cleaned = pattern.replace(/\*\*/g, "§§").replace(/\*/g, "[^/]*").replace(/§§/g, ".*");
    try {
      const regex = new RegExp(`^${cleaned}$`);
      if (regex.test(relPath)) return true;
    } catch { /* invalid pattern — skip */ }
  }
  return false;
}
