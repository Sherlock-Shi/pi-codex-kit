# Wiki Server — Security Vetting

## Runtime data flow

The wiki server is a **local child process** communicating via **stdio** (JSON-RPC 2.0). It:

- Makes **zero outbound network calls** at runtime (after initial model download)
- Stores all data in a local SQLite database (`<wikiRoot>/wiki.db`)
- Computes embeddings locally using a cached ONNX model
- Has no telemetry, analytics, or upload mechanism

```
Codex agent ──stdio──► node server.mjs ──► SQLite + local ONNX inference ──stdio──► back
                        (no network)
```

## Install-time / first-use network activity

| What | When | Source | Size |
|------|------|--------|------|
| npm dependencies (better-sqlite3, @xenova/transformers) | `npm install` | npm registry | ~5MB |
| Embedding model (all-MiniLM-L6-v2, quantized ONNX) | First `wiki_ingest` or `wiki_query` call | HuggingFace CDN (huggingface.co) | ~80MB |

The model downloads once and caches in the transformers.js cache directory. After that, all operations are fully offline.

## Data isolation

- Wiki data lives in `<wikiRoot>/wiki.db` — a file the user controls
- The server never reads files outside the paths explicitly passed via tool arguments
- No data is shared between different `wikiRoot` directories
- The embedding model runs in-process (WASM/ONNX) — no separate service

## Agent policy note

When Codex invokes `wiki_*` tools, this is a **local database operation**. Source file content passed to `wiki_ingest` is processed locally and stored in the local SQLite DB. No content leaves the machine.

## Audit commands

```bash
# Verify no network at runtime (while server is active)
# Linux/macOS
lsof -i -P -n | grep node | grep -v "127.0.0.1"
# Windows
Get-NetTCPConnection -OwningProcess (Get-Process node).Id | Where-Object { $_.RemoteAddress -ne "127.0.0.1" }

# Verify database integrity
sqlite3 <wikiRoot>/wiki.db "PRAGMA integrity_check;"
```

## Residual risk

| Risk | Mitigation |
|------|------------|
| HuggingFace CDN compromise (model download) | Model is quantized ONNX — inspect hash before first use; transformers.js caches immutably |
| npm supply chain | Pin versions in package.json; run `npm audit` after install |
| SQLite file tampering | User controls file permissions on `<wikiRoot>/` |
