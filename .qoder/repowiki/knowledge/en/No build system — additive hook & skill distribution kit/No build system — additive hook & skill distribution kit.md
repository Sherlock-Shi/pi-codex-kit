---
kind: build_system
name: No build system — additive hook & skill distribution kit
category: build_system
scope:
    - '**'
---

This repository does not contain a build system. It is a collection of standalone, copy-paste enhancement artifacts for OpenAI Codex: Node.js lifecycle hooks (`hooks/*.mjs`), MCP server registration instructions (`mcp-servers/README.md`), and slash-command skill definitions under `skills/`. There are no Makefiles, Dockerfiles, CI pipelines, package manifests, or compilation scripts in the repo. Distribution is manual — users copy files into their own `~/.codex/` tree and edit `hooks.json` / `config.toml` per the READMEs. The only executable code shipped here is two small Node.js modules that run as Codex hooks; they have no bundling, versioning, or release automation.