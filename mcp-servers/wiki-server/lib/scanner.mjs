/**
 * wiki-server — Project structure scanner.
 *
 * Analyzes a project directory to produce a module tree (_index.yaml)
 * with scope, dependencies, children, and related modules.
 * Module boundaries are detected via marker files (package.json, README.md,
 * _module.yaml, SKILL.md) and directory heuristics.
 */
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";

/** Directories always excluded from scanning. */
const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", ".svn", ".hg", "__pycache__",
  ".codex-wiki", ".qoder", "dist", "build", ".next", ".nuxt",
  "coverage", ".cache", ".turbo", ".vercel",
]);

/** Marker files that indicate a module boundary. */
const MODULE_MARKERS = [
  "package.json", "Cargo.toml", "go.mod", "pyproject.toml",
  "setup.py", "pom.xml", "build.gradle", "SKILL.md",
  "_module.yaml", "README.md",
];

/**
 * Scan a project directory and produce a module tree.
 * @param {string} projectRoot - Absolute path to the project root
 * @param {object} [options]
 * @param {string[]} [options.include] - Glob-like include patterns (empty = all)
 * @param {string[]} [options.exclude] - Glob-like exclude patterns
 * @param {number} [options.maxDepth=4] - Maximum directory depth to scan
 * @returns {{ modules: object, rootFiles: string[] }}
 */
export function scanProject(projectRoot, options = {}) {
  const { include = [], exclude = [], maxDepth = 4 } = options;
  const modules = {};
  const rootFiles = [];

  // Scan root-level files
  const rootEntries = safeReaddir(projectRoot);
  for (const entry of rootEntries) {
    const fullPath = join(projectRoot, entry);
    const st = safeStat(fullPath);
    if (!st) continue;
    if (st.isFile() && !entry.startsWith(".")) {
      rootFiles.push(entry);
    }
  }

  // Discover modules recursively
  discoverModules(projectRoot, projectRoot, modules, 0, maxDepth, exclude);

  // Build the root module entry
  const rootModule = {
    dir_name: basename(projectRoot),
    title: basename(projectRoot),
    scope: rootFiles,
    source_files: rootFiles.filter(f => isSourceFile(f)),
    children: Object.keys(modules).filter(k => k !== "" && !k.includes("/")),
    depends_on: [],
    related_to: [],
  };
  modules[""] = rootModule;

  // Infer dependencies between modules
  inferDependencies(projectRoot, modules);

  return { modules, rootFiles };
}

/**
 * Recursively discover modules in the directory tree.
 */
function discoverModules(projectRoot, dir, modules, depth, maxDepth, exclude) {
  if (depth > maxDepth) return;

  const entries = safeReaddir(dir);
  const relDir = relative(projectRoot, dir).replace(/\\/g, "/");

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const st = safeStat(fullPath);
    if (!st || !st.isDirectory()) continue;
    if (EXCLUDED_DIRS.has(entry)) continue;
    if (entry.startsWith(".")) continue;
    if (isExcluded(relDir ? `${relDir}/${entry}` : entry, exclude)) continue;

    const moduleRelPath = relDir ? `${relDir}/${entry}` : entry;

    // Check if this directory is a module boundary
    if (isModuleBoundary(fullPath)) {
      const scope = collectScope(fullPath, projectRoot);
      const sourceFiles = scope.filter(f => isSourceFile(f));
      const title = deriveModuleTitle(fullPath, entry);

      modules[moduleRelPath] = {
        dir_name: title,
        title,
        scope: scope.map(f => {
          const rel = relative(projectRoot, join(fullPath, f)).replace(/\\/g, "/");
          return rel;
        }),
        source_files: sourceFiles.map(f => {
          const rel = relative(projectRoot, join(fullPath, f)).replace(/\\/g, "/");
          return rel;
        }),
        children: [],
        depends_on: [],
        related_to: [],
      };

      // Discover child modules
      discoverModules(projectRoot, fullPath, modules, depth + 1, maxDepth, exclude);

      // Assign children
      const childPrefix = moduleRelPath + "/";
      modules[moduleRelPath].children = Object.keys(modules).filter(
        k => k.startsWith(childPrefix) && !k.slice(childPrefix.length).includes("/")
      );

      // Add to parent's children
      const parentPath = relDir || "";
      if (modules[parentPath] && !modules[parentPath].children.includes(moduleRelPath)) {
        modules[parentPath].children.push(moduleRelPath);
      }
    } else {
      // Not a module boundary — recurse deeper
      discoverModules(projectRoot, fullPath, modules, depth + 1, maxDepth, exclude);
    }
  }
}

/**
 * Check if a directory is a module boundary (has marker files).
 */
function isModuleBoundary(dirPath) {
  return MODULE_MARKERS.some(marker => existsSync(join(dirPath, marker)));
}

/**
 * Collect the scope (file listing) for a module directory.
 * Returns relative paths within the module.
 */
function collectScope(dirPath, projectRoot, maxFiles = 200) {
  const files = [];
  collectFiles(dirPath, dirPath, files, 0, 3, maxFiles);
  return files;
}

function collectFiles(baseDir, dir, files, depth, maxDepth, maxFiles) {
  if (depth > maxDepth || files.length >= maxFiles) return;
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    if (files.length >= maxFiles) break;
    const fullPath = join(dir, entry);
    const st = safeStat(fullPath);
    if (!st) continue;
    if (EXCLUDED_DIRS.has(entry) || entry.startsWith(".")) continue;

    const rel = relative(baseDir, fullPath).replace(/\\/g, "/");
    if (st.isFile()) {
      files.push(rel);
    } else if (st.isDirectory()) {
      collectFiles(baseDir, fullPath, files, depth + 1, maxDepth, maxFiles);
    }
  }
}

/**
 * Derive a human-readable module title from directory contents.
 */
function deriveModuleTitle(dirPath, dirName) {
  // Try package.json name
  const pkgPath = join(dirPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.description) return pkg.description;
      if (pkg.name) return pkg.name;
    } catch { /* fall through */ }
  }

  // Try README.md first heading
  const readmePath = join(dirPath, "README.md");
  if (existsSync(readmePath)) {
    try {
      const content = readFileSync(readmePath, "utf8");
      const match = content.match(/^#\s+(.+)$/m);
      if (match) return match[1].trim();
    } catch { /* fall through */ }
  }

  // Try SKILL.md name field
  const skillPath = join(dirPath, "SKILL.md");
  if (existsSync(skillPath)) {
    try {
      const content = readFileSync(skillPath, "utf8");
      const match = content.match(/^name:\s*(.+)$/m);
      if (match) return match[1].trim();
    } catch { /* fall through */ }
  }

  // Fallback: humanize directory name
  return dirName.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Infer dependencies between modules by scanning import/require statements.
 */
function inferDependencies(projectRoot, modules) {
  const modulePaths = Object.keys(modules).filter(k => k !== "");

  for (const modPath of modulePaths) {
    const mod = modules[modPath];
    if (!mod.source_files || mod.source_files.length === 0) continue;

    const deps = new Set();
    for (const srcFile of mod.source_files.slice(0, 20)) {
      const fullPath = join(projectRoot, srcFile);
      if (!existsSync(fullPath)) continue;
      try {
        const content = readFileSync(fullPath, "utf8");
        // Check if any other module path is referenced
        for (const otherPath of modulePaths) {
          if (otherPath === modPath) continue;
          const dirName = basename(otherPath);
          if (content.includes(dirName) || content.includes(otherPath)) {
            deps.add(otherPath);
          }
        }
      } catch { /* skip unreadable files */ }
    }
    mod.depends_on = [...deps];
  }
}

/**
 * Check if a file is a source file (by extension).
 */
function isSourceFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return [
    ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".py", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h",
    ".cs", ".php", ".swift", ".kt", ".scala", ".sh", ".ps1",
  ].includes(ext);
}

/**
 * Check if a path matches any exclude pattern (simple prefix/glob matching).
 */
function isExcluded(relPath, excludePatterns) {
  for (const pattern of excludePatterns) {
    // Simple glob: ** matches any depth, * matches within segment
    const cleaned = pattern.replace(/\*\*/g, "§§").replace(/\*/g, "[^/]*").replace(/§§/g, ".*");
    const regex = new RegExp(`^${cleaned}$`);
    if (regex.test(relPath)) return true;
  }
  return false;
}

// --- Safe filesystem helpers ---

function safeReaddir(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

function safeStat(path) {
  try { return statSync(path); } catch { return null; }
}
