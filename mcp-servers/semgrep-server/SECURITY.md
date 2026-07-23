# Semgrep Server — Security Vetting

## Runtime data flow

The semgrep server is a **local child process** communicating via **stdio** (JSON-RPC 2.0). It:

- Makes **zero outbound network calls** — semgrep runs with `--metrics=off`
- Spawns `semgrep` as a local subprocess for each scan
- Caches results in-memory only (cleared on process restart)
- Has no telemetry, analytics, or upload mechanism

```
Codex agent ──stdio──► node server.mjs ──► semgrep CLI (local) ──stdio──► back
                        (no network)         (no network: --metrics=off)
```

## Install-time activity

**None.** The server has zero npm dependencies. It wraps the pre-installed `semgrep` binary. No downloads occur at install or runtime.

Note: `semgrep --config auto` downloads rules from the Semgrep Registry on first use (standard semgrep behavior, not specific to this server). Use a local config YAML to avoid this.

## Data isolation

- Semgrep scans only the paths explicitly passed via `semgrep_scan` arguments
- Scan results are returned over stdio — never written to disk by the server
- In-memory cache is keyed by file mtime — no file content is stored in the cache key
- The server never reads files outside the specified scan paths

## Agent policy note

When Codex invokes `semgrep_scan`, this is a **local static analysis operation**. Source code is read by the local semgrep binary and analyzed locally. No code is transmitted over any network (`--metrics=off` disables semgrep's telemetry).

## Audit commands

```bash
# Verify semgrep runs offline
semgrep scan --config auto --json --metrics=off . 2>&1 | grep -i "metrics\|upload\|send"
# Expected: no output (metrics disabled)

# Verify server has no network imports
grep -r "fetch\(\|https\?://\|net\.connect" ~/.codex/vendor/semgrep-server/
# Expected: no matches
```

## Residual risk

| Risk | Mitigation |
|------|------------|
| semgrep binary compromise | Install from official source (`pip install semgrep`); verify with `semgrep --version` |
| `--config auto` downloads rules from registry | Use local YAML configs for air-gapped environments |
| In-memory cache serves stale results | 5-minute TTL; cache cleared on server restart |
