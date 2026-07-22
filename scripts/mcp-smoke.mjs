#!/usr/bin/env node
/**
 * pi-codex-kit — pi-lens MCP server smoke test.
 *
 * Spawns the pi-lens MCP stdio server, performs the MCP handshake
 * (initialize -> initialized -> tools/list), and prints the registered tools.
 * Read-only: starts the server process but issues no analysis calls.
 *
 * Usage: node mcp-smoke.mjs <path-to-server.js>
 * Exit 0 if tools/list returns >=1 tool, else 1.
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";

const serverPath = process.argv[2];
if (!serverPath) {
  console.error("usage: node mcp-smoke.mjs <path-to-server.js>");
  process.exit(1);
}
if (!fs.existsSync(serverPath)) {
  console.error("server not found: " + serverPath);
  process.exit(1);
}

const TIMEOUT_MS = 45000;
const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

let stdoutBuf = "";
const pending = new Map(); // id -> {resolve, reject}
let toolNames = null;

const timer = setTimeout(() => {
  finish(false, "timeout waiting for tools/list");
}, TIMEOUT_MS);

function finish(ok, message) {
  clearTimeout(timer);
  try { child.kill(); } catch { /* ignore */ }
  if (ok) {
    console.log("SMOKE OK: " + (toolNames ? toolNames.length : 0) + " tools");
    if (toolNames) console.log(toolNames.join("\n"));
    process.exit(0);
  } else {
    console.error("SMOKE FAIL: " + message);
    process.exit(1);
  }
}

child.stdout.on("data", (chunk) => {
  stdoutBuf += chunk.toString("utf8");
  let idx;
  while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
    const line = stdoutBuf.slice(0, idx).trim();
    stdoutBuf = stdoutBuf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const p = msg.id != null ? pending.get(msg.id) : null;
    if (p) {
      pending.delete(msg.id);
      p.resolve(msg);
    }
  }
});

child.stderr.on("data", () => { /* server logs go to stderr; ignore for smoke */ });
child.on("error", (e) => finish(false, "spawn error: " + e.message));
child.on("exit", (code) => {
  if (toolNames == null) finish(false, "server exited early (code " + code + ")");
});

function request(id, method, params) {
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

(async () => {
  try {
    const init = await request(1, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "pi-codex-kit-smoke", version: "1.0.0" },
    });
    if (init.error) return finish(false, "initialize error: " + JSON.stringify(init.error));
    notify("notifications/initialized", {});

    const list = await request(2, "tools/list", {});
    if (list.error) return finish(false, "tools/list error: " + JSON.stringify(list.error));
    toolNames = (list.result && list.result.tools ? list.result.tools : []).map((t) => t.name);
    finish(toolNames.length > 0, toolNames.length ? "" : "no tools returned");
  } catch (e) {
    finish(false, e && e.message ? e.message : String(e));
  }
})();
