#!/usr/bin/env node
/**
 * wiki-server — MCP stdio entry point.
 *
 * Persistent knowledge-base server: SQLite + FTS5 + local vector embeddings.
 * Transport: newline-delimited JSON-RPC 2.0 over stdio (MCP stdio framing).
 *
 * stdout carries ONLY JSON-RPC. Diagnostics go to stderr.
 * Part of pi-codex-kit. Local-only — zero outbound network at runtime.
 */
import * as readline from "node:readline";
import { TOOLS, handleToolCall } from "./lib/tools.mjs";

// Redirect any stray console.log to stderr to protect the JSON-RPC stream.
console.log = (...args) => console.error(...args);

const SERVER_NAME = "wiki-server";
const SERVER_VERSION = "2.0.0";
const PROTOCOL_VERSION = "2025-06-18";

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRequest(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      sendResult(id, {
        protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      break;

    case "notifications/initialized":
      // Client acknowledgment — no response needed for notifications.
      break;

    case "ping":
      sendResult(id, {});
      break;

    case "tools/list":
      sendResult(id, { tools: TOOLS });
      break;

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments ?? {};
      if (typeof toolName !== "string") {
        sendError(id, -32602, "tools/call requires a string 'name'");
        break;
      }
      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendResult(id, {
          content: [{ type: "text", text: result.text }],
          isError: false,
        });
      } catch (err) {
        sendResult(id, {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        });
      }
      break;
    }

    default:
      if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
  }
}

// --- stdio transport ---
const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    sendError(null, -32700, "Parse error");
    return;
  }
  handleRequest(msg).catch((err) => {
    console.error(`[wiki-server] unhandled error:`, err);
    if (msg.id !== undefined) sendError(msg.id, -32603, "Internal error");
  });
});

rl.on("close", () => process.exit(0));

console.error(`[wiki-server] v${SERVER_VERSION} ready (${TOOLS.length} tools)`);
