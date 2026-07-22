#!/usr/bin/env node
/**
 * pi-codex-kit — ADDITIVE, idempotent hooks.json merge.
 *
 * Honors the AGENT CONTRACT:
 *   - Backs up hooks.json (if present) before editing.
 *   - Merges template hook groups into the target; skips groups whose
 *     (matcher + command set) already exists. Never removes existing hooks.
 *
 * Usage: node merge-hooks.mjs --target <hooks.json> --template <rendered.json>
 */
import * as fs from "node:fs";

function parseArgs(argv) {
  const args = { target: null, template: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--target") args.target = argv[++i];
    else if (argv[i] === "--template") args.template = argv[++i];
  }
  return args;
}

const { target, template } = parseArgs(process.argv.slice(2));
if (!target || !template) {
  console.error("usage: node merge-hooks.mjs --target <hooks.json> --template <rendered.json>");
  process.exit(1);
}

const tpl = JSON.parse(fs.readFileSync(template, "utf8"));

let existing = { hooks: {} };
let hadFile = false;
if (fs.existsSync(target)) {
  hadFile = true;
  existing = JSON.parse(fs.readFileSync(target, "utf8"));
  if (!existing.hooks || typeof existing.hooks !== "object") existing.hooks = {};
  // Backup before editing.
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = target + ".bak." + ts;
  fs.copyFileSync(target, backup);
  console.log("backup: " + backup);
}

function groupKey(group) {
  const matcher = group.matcher || "";
  const cmds = (group.hooks || [])
    .map((h) => (h && h.command ? h.command : ""))
    .sort()
    .join("|");
  return matcher + "::" + cmds;
}

let added = 0;
let skipped = 0;
for (const [event, groups] of Object.entries(tpl.hooks || {})) {
  if (!Array.isArray(groups)) continue;
  if (!Array.isArray(existing.hooks[event])) existing.hooks[event] = [];
  const haveKeys = new Set(existing.hooks[event].map(groupKey));
  for (const group of groups) {
    const key = groupKey(group);
    if (haveKeys.has(key)) {
      skipped++;
      continue;
    }
    existing.hooks[event].push(group);
    haveKeys.add(key);
    added++;
  }
}

fs.writeFileSync(target, JSON.stringify(existing, null, 2) + "\n", "utf8");
console.log(
  (hadFile ? "MERGED" : "CREATED") + " " + target +
  " — added " + added + " hook group(s), skipped " + skipped + " duplicate(s).",
);
