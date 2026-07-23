/**
 * wiki-server — Knowledge Card generation and management.
 *
 * Knowledge Cards are high-density, typed knowledge units per module:
 *   - overview.md          — Module purpose, responsibilities, boundaries
 *   - architecture_design.md — Design patterns, component relationships, data flow
 *   - coding_conventions.md  — Naming, style, interface agreements
 *   - tech_stack.md          — Frameworks, libraries, versions used
 *
 * Cards are scaffolded by this module; actual content is written by the agent
 * via the knowledge-engine skill. This module handles structure, frontmatter,
 * and human-edit protection.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import {
  serializeFrontmatter, parseFrontmatter, contentHash,
  checkHumanModified, markHumanModified, toYaml,
} from "./filestore.mjs";

/** Card types and their descriptions. */
export const CARD_TYPES = {
  overview: {
    file: "overview.md",
    title: "Overview",
    prompt: "Describe the module's purpose, responsibilities, boundaries, and key exports.",
  },
  architecture_design: {
    file: "architecture_design.md",
    title: "Architecture & Design",
    prompt: "Describe design patterns, component relationships, data flow, and key architectural decisions.",
  },
  coding_conventions: {
    file: "coding_conventions.md",
    title: "Coding Conventions",
    prompt: "Document naming conventions, style rules, interface agreements, and team standards.",
  },
  tech_stack: {
    file: "tech_stack.md",
    title: "Tech Stack",
    prompt: "List frameworks, libraries, runtimes, and version constraints used by this module.",
  },
};

/**
 * Scaffold knowledge card files for a module.
 * Creates empty card templates with proper frontmatter if they don't exist.
 * Does NOT overwrite existing cards (especially human-modified ones).
 *
 * @param {string} wikiRoot - Absolute path to wiki root
 * @param {string} modulePath - Module path key (e.g. "hooks", "skills/audit-code")
 * @param {object} moduleInfo - Module metadata { dir_name, title, scope, ... }
 * @param {string} [locale="en"]
 * @returns {{ created: string[], skipped: string[], protected: string[] }}
 */
export function scaffoldCards(wikiRoot, modulePath, moduleInfo, locale = "en") {
  const cardDir = cardDirectory(wikiRoot, modulePath, locale);
  mkdirSync(cardDir, { recursive: true });

  const created = [];
  const skipped = [];
  const protectedFiles = [];

  // Write _module.yaml
  const moduleYamlPath = join(cardDir, "_module.yaml");
  if (!existsSync(moduleYamlPath)) {
    const moduleYaml = toYaml({
      schema_version: 1,
      module_path: modulePath,
      title: moduleInfo.title || moduleInfo.dir_name || basename(modulePath),
      scope: moduleInfo.scope || [],
      source_files: moduleInfo.source_files || [],
      depends_on: moduleInfo.depends_on || [],
      related_to: moduleInfo.related_to || [],
    });
    writeFileSync(moduleYamlPath, moduleYaml, "utf8");
    created.push("_module.yaml");
  } else {
    skipped.push("_module.yaml");
  }

  // Scaffold each card type
  for (const [cardType, meta] of Object.entries(CARD_TYPES)) {
    const cardPath = join(cardDir, meta.file);

    if (existsSync(cardPath)) {
      // Check human-edit protection
      const { humanModified } = checkHumanModified(cardPath);
      if (humanModified) {
        protectedFiles.push(meta.file);
      } else {
        skipped.push(meta.file);
      }
      continue;
    }

    // Create scaffold with frontmatter
    const scaffoldContent = generateScaffold(cardType, moduleInfo);
    const hash = contentHash(scaffoldContent);
    const frontmatter = {
      title: meta.title,
      type: cardType,
      module: modulePath,
      generated: true,
      generated_at: new Date().toISOString(),
      content_hash: hash,
      human_modified: false,
    };

    writeFileSync(cardPath, serializeFrontmatter(frontmatter, scaffoldContent), "utf8");
    created.push(meta.file);
  }

  return { created, skipped, protected: protectedFiles };
}

/**
 * Read a knowledge card for a module.
 * @param {string} wikiRoot
 * @param {string} modulePath
 * @param {string} cardType - One of CARD_TYPES keys
 * @param {string} [locale="en"]
 * @returns {{ content: string, frontmatter: object, humanModified: boolean } | null}
 */
export function readCard(wikiRoot, modulePath, cardType, locale = "en") {
  const meta = CARD_TYPES[cardType];
  if (!meta) return null;

  const cardPath = join(cardDirectory(wikiRoot, modulePath, locale), meta.file);
  if (!existsSync(cardPath)) return null;

  const raw = readFileSync(cardPath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const { humanModified } = checkHumanModified(cardPath);

  return { content: body, frontmatter: data, humanModified };
}

/**
 * Write/update a knowledge card for a module.
 * Respects human-edit protection unless force=true.
 * @param {string} wikiRoot
 * @param {string} modulePath
 * @param {string} cardType
 * @param {string} content - New markdown body
 * @param {string} [locale="en"]
 * @param {boolean} [force=false] - Override human-edit protection
 * @returns {{ written: boolean, reason?: string }}
 */
export function writeCard(wikiRoot, modulePath, cardType, content, locale = "en", force = false) {
  const meta = CARD_TYPES[cardType];
  if (!meta) return { written: false, reason: `Unknown card type: ${cardType}` };

  const cardDir = cardDirectory(wikiRoot, modulePath, locale);
  mkdirSync(cardDir, { recursive: true });
  const cardPath = join(cardDir, meta.file);

  // Check protection
  if (existsSync(cardPath) && !force) {
    const { humanModified } = checkHumanModified(cardPath);
    if (humanModified) {
      return { written: false, reason: "Card is human-modified and protected. Use force=true or /knowledge rewrite to override." };
    }
  }

  const hash = contentHash(content);
  const frontmatter = {
    title: meta.title,
    type: cardType,
    module: modulePath,
    generated: true,
    generated_at: new Date().toISOString(),
    content_hash: hash,
    human_modified: false,
  };

  writeFileSync(cardPath, serializeFrontmatter(frontmatter, content), "utf8");
  return { written: true };
}

/**
 * List all cards for a module with their status.
 * @param {string} wikiRoot
 * @param {string} modulePath
 * @param {string} [locale="en"]
 * @returns {Array<{ type: string, file: string, exists: boolean, humanModified: boolean }>}
 */
export function listCards(wikiRoot, modulePath, locale = "en") {
  const cardDir = cardDirectory(wikiRoot, modulePath, locale);
  return Object.entries(CARD_TYPES).map(([cardType, meta]) => {
    const cardPath = join(cardDir, meta.file);
    const exists = existsSync(cardPath);
    let humanModified = false;
    if (exists) {
      humanModified = checkHumanModified(cardPath).humanModified;
    }
    return { type: cardType, file: meta.file, exists, humanModified };
  });
}

// --- Helpers ---

/**
 * Compute the card directory path for a module.
 */
function cardDirectory(wikiRoot, modulePath, locale) {
  // Convert module path to directory name (replace / with —)
  const dirName = modulePath
    ? modulePath.replace(/\//g, " — ")
    : "root";
  return join(wikiRoot, locale, "knowledge", dirName);
}

/**
 * Generate scaffold content for a card type.
 */
function generateScaffold(cardType, moduleInfo) {
  const title = moduleInfo.title || moduleInfo.dir_name || "Module";

  switch (cardType) {
    case "overview":
      return `# ${title} — Overview\n\n<!-- Agent: ${CARD_TYPES.overview.prompt} -->\n\n_Pending generation._\n`;
    case "architecture_design":
      return `# ${title} — Architecture & Design\n\n<!-- Agent: ${CARD_TYPES.architecture_design.prompt} -->\n\n_Pending generation._\n`;
    case "coding_conventions":
      return `# ${title} — Coding Conventions\n\n<!-- Agent: ${CARD_TYPES.coding_conventions.prompt} -->\n\n_Pending generation._\n`;
    case "tech_stack":
      return `# ${title} — Tech Stack\n\n<!-- Agent: ${CARD_TYPES.tech_stack.prompt} -->\n\n_Pending generation._\n`;
    default:
      return `# ${title}\n\n_Pending generation._\n`;
  }
}
