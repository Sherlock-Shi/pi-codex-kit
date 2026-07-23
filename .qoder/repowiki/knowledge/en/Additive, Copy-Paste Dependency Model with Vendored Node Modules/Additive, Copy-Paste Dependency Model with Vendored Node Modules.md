---
kind: dependency_management
name: Additive, Copy-Paste Dependency Model with Vendored Node Modules
category: dependency_management
scope:
    - '**'
source_files:
    - hooks/README.md
    - mcp-servers/README.md
    - skills/README.md
---

This repository does not declare its own runtime dependencies — it is a distribution kit of configuration, hooks, and skill definitions that consumers install into their own Codex environment. Dependencies are managed entirely by the end user's machine through an additive, copy-paste model rather than a centralized manifest.

**Runtime dependency: Node.js (v18+)**
The entire kit requires Node.js on PATH; all hook scripts (`hooks/*.mjs`) and the pi-lens MCP server are executed via `node`. No `package.json`, `go.mod`, or other lockfile exists in this repo because the kit itself has no transitive dependencies to pin.

**Vendoring strategy for pi-lens MCP server**
Consumers install the pi-lens MCP server into a per-user vendor directory (`~/.codex/vendor/pi-lens/`) using a pinned npm command:
```
npm install --omit=peer --no-audit --no-fund pi-lens@3.8.71 typescript-language-server@^5.1.3
```
- `pi-lens` is pinned to an exact version (`3.8.71`) for reproducibility.
- `typescript-language-server` uses a caret range (`^5.1.3`) allowing patch-level updates.
- `--omit=peer` avoids installing peer deps into the vendor tree; `--no-audit --no-fund` suppress network calls during install.
- The resulting `node_modules/` under `~/.codex/vendor/pi-lens/` is the only vendored artifact — there is no `package-lock.json` committed here, so each consumer gets a fresh lockfile in their own vendor directory.

**External binary dependency: rtk (Rust Token Killer)**
The RTK hook (`hooks/rtk-pretooluse.mjs`) depends on the external `rtk` binary being available on PATH or at `~/.local/bin/rtk[.exe]`, overridable via the `RTK_BIN` environment variable. This dependency is intentionally optional: if `rtk` is missing or errors, the hook silently falls back to running the original command unchanged.

**No package manager lockfiles in this repo**
There is no `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `go.mod`, `Cargo.toml`, `requirements.txt`, or any other dependency manifest checked into the repository. The kit ships as plain `.mjs` scripts and Markdown skills — consumers bring their own dependency resolution.

**Rules developers should follow**
- Do not add new runtime dependencies to the kit without documenting them in the relevant `README.md` under Prerequisites.
- When pinning npm packages for the vendored pi-lens install, prefer exact versions for stability (as done with `pi-lens@3.8.71`) and document the install command verbatim in `mcp-servers/README.md`.
- Keep hook scripts free of `require()` / `import` statements that would pull in third-party modules — they must run against whatever Node.js the user already has installed.
- Treat `rtk` as an optional dependency: always guard against its absence and fall back gracefully.