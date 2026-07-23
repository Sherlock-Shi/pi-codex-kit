/**
 * semgrep-server — MCP tool definitions and handlers.
 */
import { scan, listRules, explainFinding, status } from "./scanner.mjs";

/** MCP tool schema definitions. */
export const TOOLS = [
  {
    name: "semgrep_scan",
    description: "Run a semgrep security scan on specified paths. Returns structured findings with severity, CWE, and remediation. Uses warm cache for unchanged files.",
    inputSchema: {
      type: "object",
      properties: {
        paths: { type: "array", items: { type: "string" }, description: "Files or directories to scan" },
        config: { type: "string", description: "Semgrep config (default: 'auto'). E.g. 'p/python', 'p/owasp-top-ten', or a local YAML path." },
        severity: { type: "string", enum: ["ERROR", "WARNING", "INFO"], description: "Filter findings by minimum severity" },
      },
      required: ["paths"],
    },
  },
  {
    name: "semgrep_list_rules",
    description: "List available semgrep rules and server status. Shows version, config, and rule catalog reference.",
    inputSchema: {
      type: "object",
      properties: {
        config: { type: "string", description: "Semgrep config to inspect (default: 'auto')" },
        language: { type: "string", description: "Filter by language (e.g. 'python', 'javascript', 'go')" },
      },
    },
  },
  {
    name: "semgrep_explain",
    description: "Explain a specific semgrep finding by rule ID. Returns CWE mapping, registry link, and remediation guidance.",
    inputSchema: {
      type: "object",
      properties: {
        findingId: { type: "string", description: "The rule/check ID from a scan finding (e.g. 'python.lang.security.audit.eval-detected')" },
      },
      required: ["findingId"],
    },
  },
  {
    name: "semgrep_status",
    description: "Check semgrep server health: binary availability, version, cache state.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/** Handle a tools/call request. */
export function handleToolCall(name, args) {
  switch (name) {
    case "semgrep_scan": {
      const result = scan(args.paths, { config: args.config, severity: args.severity });
      return { text: JSON.stringify(result) };
    }
    case "semgrep_list_rules": {
      const result = listRules(args.config, args.language);
      return { text: JSON.stringify(result) };
    }
    case "semgrep_explain": {
      const result = explainFinding(args.findingId);
      return { text: JSON.stringify(result) };
    }
    case "semgrep_status": {
      const result = status();
      return { text: JSON.stringify(result) };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
