---
kind: frontend_style
name: No frontend styling system — backend/tooling-only repository
category: frontend_style
scope:
    - '**'
---

This repository contains no frontend styling code whatsoever. There are zero CSS, SCSS, SASS, LESS, Stylus, Tailwind config, theme files, or component-library references anywhere in the codebase. The grep search for common style-related extensions and keywords returned no matches beyond incidental mentions of "style" in skill documentation (e.g., reviewing coding style). The `pi-lens` directory is empty. The project is a Node.js toolkit consisting of lifecycle hooks, MCP server definitions, and slash-command skill YAML/Markdown definitions — it has no UI layer to style.