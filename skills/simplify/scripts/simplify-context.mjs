#!/usr/bin/env node
/**
 * pi-codex-kit — simplify-context.mjs
 *
 * Standalone port of pi-simplify@0.2.3 (git-diff.ts + prompt-builder.ts).
 * Zero dependencies beyond Node + git. Detects changed files and their changed
 * line ranges, then prints the scoped review brief (Principles/Scope/Process).
 *
 * Usage:
 *   node simplify-context.mjs [--staged] [--ref=<ref>|--ref <ref>] [files...]
 *
 * Defaults to diffing against HEAD (uncommitted changes). Falls back to
 * HEAD~1 when HEAD has no diff (matches pi-simplify behavior).
 */
import { spawnSync } from "node:child_process";

const STATUS_MAP = { M: "modified", A: "added", R: "renamed", C: "copied" };

function parseArgs(argv) {
  const files = [];
  let ref = "HEAD";
  let staged = false;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--staged") staged = true;
    else if (token.startsWith("--ref=")) ref = token.slice("--ref=".length);
    else if (token === "--ref") ref = argv[++i] || ref;
    else if (token === "--") { /* remaining are files */ }
    else files.push(token);
  }
  return { files, ref, staged };
}

function runGit(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  return { code: r.status == null ? 1 : r.status, stdout: r.stdout || "" };
}

function parseDiffOutput(stdout) {
  const files = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const statusCode = parts[0] && parts[0][0];
    if (!statusCode) continue;
    const status = STATUS_MAP[statusCode];
    if (!status) continue;
    // Renamed (R100\told\tnew) and copied (C100\told\tnew) have two paths; use the new one.
    const p = status === "renamed" || status === "copied" ? parts[2] : parts[1];
    if (p) files.push({ path: p, status });
  }
  return files;
}

function parseChangedLines(stdout) {
  const ranges = [];
  for (const line of stdout.split("\n")) {
    const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!match || !match[1]) continue;
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    if (count === 0) continue;
    const end = start + count - 1;
    const previous = ranges[ranges.length - 1];
    if (previous && start <= previous.end + 1) {
      ranges[ranges.length - 1] = { start: previous.start, end: Math.max(previous.end, end) };
    } else {
      ranges.push({ start, end });
    }
  }
  return ranges;
}

function diffArgs(options, ref, filePath) {
  const args = ["diff", "--unified=0", "--no-ext-diff"];
  if (options.staged && ref !== "HEAD~1") args.push("--cached");
  else args.push(ref);
  args.push("--", filePath);
  return args;
}

function addChangedLines(cwd, options, files, ref) {
  return files.map((file) => {
    if (file.status === "added") return file;
    const result = runGit(diffArgs(options, ref, file.path), cwd);
    return result.code === 0 ? { ...file, changedLines: parseChangedLines(result.stdout) } : file;
  });
}

function getChangedFiles(cwd, options) {
  if (options.files.length > 0) {
    const files = options.files.map((p) => ({ path: p, status: "modified" }));
    return addChangedLines(cwd, options, files, options.ref);
  }

  const args = ["diff", "--name-status"];
  if (options.staged) args.push("--cached");
  else args.push(options.ref);

  const result = runGit(args, cwd);
  if (result.code === 0) {
    const files = parseDiffOutput(result.stdout);
    if (files.length > 0) return addChangedLines(cwd, options, files, options.ref);
  }

  // Fallback: diff against previous commit (matches pi-simplify).
  const fallback = runGit(["diff", "--name-status", "HEAD~1"], cwd);
  if (fallback.code === 0) {
    const files = parseDiffOutput(fallback.stdout);
    return addChangedLines(cwd, options, files, "HEAD~1");
  }
  return [];
}

function formatFile(file) {
  if (file.status === "added") return `- ${file.path} (added; entire file is in scope)`;
  if (file.changedLines === undefined) {
    return `- ${file.path} (${file.status}; changed lines unavailable — inspect git diff before editing)`;
  }
  if (file.changedLines.length === 0) {
    return `- ${file.path} (${file.status}; deletions only — no current lines to simplify)`;
  }
  const ranges = file.changedLines.map(({ start, end }) => (start === end ? `${start}` : `${start}-${end}`));
  return `- ${file.path} (${file.status}; changed lines: ${ranges.join(", ")})`;
}

function buildSimplifyPrompt(files) {
  const fileList = files.map(formatFile).join("\n");
  return `Review the following recently changed files and apply simplification improvements.

## Principles

- **Preserve functionality**: Never change what the code does. All existing tests must continue to pass.
- **Apply project standards**: Follow any conventions from CLAUDE.md or AGENTS.md in this project.
- **Enhance clarity**: Reduce unnecessary complexity and nesting, eliminate redundant code and abstractions, improve variable and function names, and consolidate related logic. Keep valuable comments that explain design rationale, business rules, non-obvious behaviour, or intent. Remove only truly redundant noise, such as \`// increment i\` above \`i++\`. Avoid nested ternary operators: prefer switch statements or if/else chains for multiple conditions.
- **Maintain balance**: Do not over-simplify. Avoid overly clever solutions that are hard to understand. Do not combine too many concerns into single functions. Do not remove helpful abstractions. Prioritize readability over fewer lines.

## Scope

Only review and modify the changed lines listed below. Changed line numbers refer to
the current file contents. You may read surrounding code for context, but must not
edit it. For added files, the entire file is considered changed.
${fileList}

## Process

1. Read each file listed above and inspect its changed lines
2. Identify concrete improvements within those lines (dead code, unclear names, redundant logic, inconsistent patterns)
3. Apply changes one file at a time, keeping every edit within the listed line ranges
4. After all changes, run existing tests to verify nothing is broken
5. Summarize what you changed and why

Do NOT add new features, change public APIs, or refactor code outside the listed
line ranges. If a worthwhile simplification would require editing unchanged code,
leave it alone and mention it in the summary instead.`;
}

const options = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const files = getChangedFiles(cwd, options);

if (files.length === 0) {
  console.log("No changed files found. Specify file paths or make some changes first.");
  process.exit(0);
}

console.log(buildSimplifyPrompt(files));
