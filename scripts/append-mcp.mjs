#!/usr/bin/env node
/**
 * pi-codex-kit — ADDITIVE, idempotent [mcp_servers.pi-lens] insertion.
 *
 * Honors the AGENT CONTRACT:
 *   - Backs up config.toml to config.toml.bak.<timestamp> before editing.
 *   - No-ops if [mcp_servers.pi-lens] already exists.
 *   - Appends only; never parses/rewrites the rest of the file.
 *
 * Usage: node append-mcp.mjs --config <config.toml> --server <server.js>
 */
import * as fs from "node:fs";
import * as path from "node:path";

function parseArgs(argv) {
  const args = { config: null, server: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config") args.config = argv[++i];
    else if (argv[i] === "--server") args.server = argv[++i];
  }
  return args;
}

const { config, server } = parseArgs(process.argv.slice(2));
if (!config || !server) {
  console.error("usage: node append-mcp.mjs --config <config.toml> --server <server.js>");
  process.exit(1);
}

// Forward slashes avoid TOML backslash-escaping entirely (valid on Windows too).
const serverPath = path.resolve(server).split(path.sep).join("/");

if (!fs.existsSync(config)) {
  console.error("config not found: " + config);
  process.exit(1);
}

const original = fs.readFileSync(config, "utf8");

// Idempotency: already present?
if (/^\s*\[mcp_servers\.pi-lens\]/m.test(original)) {
  console.log("ALREADY PRESENT: [mcp_servers.pi-lens] exists in " + config + " — no changes made.");
  process.exit(0);
}

// Backup first.
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backup = config + ".bak." + ts;
fs.copyFileSync(config, backup);
console.log("backup: " + backup);

const block =
  "\n# Added by pi-codex-kit (additive; remove this block to uninstall)\n" +
  "[mcp_servers.pi-lens]\n" +
  'command = "node"\n' +
  'args = ["' + serverPath + '"]\n' +
  "startup_timeout_sec = 30\n";

// Ensure separation from prior content.
const needsLeadingNewline = original.length > 0 && !original.endsWith("\n");
fs.writeFileSync(config, original + (needsLeadingNewline ? "\n" : "") + block, "utf8");

console.log("APPENDED [mcp_servers.pi-lens] -> " + serverPath);
console.log("verify: diff " + JSON.stringify(backup) + " " + JSON.stringify(config));
