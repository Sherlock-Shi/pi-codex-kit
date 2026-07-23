# Agent Framework

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [skills/README.md](file://skills/README.md)
- [skills/audit-code/SKILL.md](file://skills/audit-code/SKILL.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/code-reviewer/SKILL.md](file://skills/code-reviewer/SKILL.md)
- [skills/code-reviewer/agents/openai.yaml](file://skills/code-reviewer/agents/openai.yaml)
- [skills/deepen-architecture/SKILL.md](file://skills/deepen-architecture/SKILL.md)
- [skills/deepen-architecture/agents/openai.yaml](file://skills/deepen-architecture/agents/openai.yaml)
- [skills/develop-tdd/SKILL.md](file://skills/develop-tdd/SKILL.md)
- [skills/develop-tdd/agents/openai.yaml](file://skills/develop-tdd/agents/openai.yaml)
- [skills/differential-review/SKILL.md](file://skills/differential-review/SKILL.md)
- [skills/differential-review/agents/openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [skills/enforce-first/SKILL.md](file://skills/enforce-first/SKILL.md)
- [skills/enforce-first/agents/openai.yaml](file://skills/enforce-first/agents/openai.yaml)
- [skills/fp-check/SKILL.md](file://skills/fp-check/SKILL.md)
- [skills/fp-check/agents/openai.yaml](file://skills/fp-check/agents/openai.yaml)
- [skills/pi-lens-ast-grep/SKILL.md](file://skills/pi-lens-ast-grep/SKILL.md)
- [skills/pi-lens-ast-grep/agents/openai.yaml](file://skills/pi-lens-ast-grep/agents/openai.yaml)
- [skills/pi-lens-lsp-navigation/SKILL.md](file://skills/pi-lens-lsp-navigation/SKILL.md)
- [skills/pi-lens-lsp-navigation/agents/openai.yaml](file://skills/pi-lens-lsp-navigation/agents/openai.yaml)
- [skills/pi-lens-write-ast-grep-rule/SKILL.md](file://skills/pi-lens-write-ast-grep-rule/SKILL.md)
- [skills/pi-lens-write-ast-grep-rule/agents/openai.yaml](file://skills/pi-lens-write-ast-grep-rule/agents/openai.yaml)
- [skills/pi-lens-write-tree-sitter-rule/SKILL.md](file://skills/pi-lens-write-tree-sitter-rule/SKILL.md)
- [skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml](file://skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml)
- [skills/request-review/SKILL.md](file://skills/request-review/SKILL.md)
- [skills/request-review/agents/openai.yaml](file://skills/request-review/agents/openai.yaml)
- [skills/respond-review/SKILL.md](file://skills/respond-review/SKILL.md)
- [skills/respond-review/agents/openai.yaml](file://skills/respond-review/agents/openai.yaml)
- [skills/simplify/SKILL.md](file://skills/simplify/SKILL.md)
- [skills/simplify/agents/openai.yaml](file://skills/simplify/agents/openai.yaml)
- [skills/variant-analysis/SKILL.md](file://skills/variant-analysis/SKILL.md)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)
- [skills/verify-work/SKILL.md](file://skills/verify-work/SKILL.md)
- [skills/verify-work/agents/openai.yaml](file://skills/verify-work/agents/openai.yaml)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion

## Introduction
This document explains the agent framework architecture used to configure, manage, and integrate AI agents with skills. It focuses on OpenAI agent setup, prompt engineering patterns, model selection strategies, communication protocols between skills and agents, response processing, error handling, security considerations, rate limiting, and performance optimization for AI model interactions. The content is derived from the repository’s skill definitions and their associated OpenAI agent configuration files.

## Project Structure
The project organizes capabilities as “skills.” Each skill includes:
- A SKILL.md describing purpose, inputs, outputs, and usage.
- An agents/openai.yaml defining how an OpenAI agent is configured for that skill.

```mermaid
graph TB
subgraph "Skills"
S1["audit-code"]
S2["code-reviewer"]
S3["deepen-architecture"]
S4["develop-tdd"]
S5["differential-review"]
S6["enforce-first"]
S7["fp-check"]
S8["pi-lens-ast-grep"]
S9["pi-lens-lsp-navigation"]
S10["pi-lens-write-ast-grep-rule"]
S11["pi-lens-write-tree-sitter-rule"]
S12["request-review"]
S13["respond-review"]
S14["simplify"]
S15["variant-analysis"]
S16["verify-work"]
end
subgraph "Agent Configurations"
C1["audit-code/agents/openai.yaml"]
C2["code-reviewer/agents/openai.yaml"]
C3["deepen-architecture/agents/openai.yaml"]
C4["develop-tdd/agents/openai.yaml"]
C5["differential-review/agents/openai.yaml"]
C6["enforce-first/agents/openai.yaml"]
C7["fp-check/agents/openai.yaml"]
C8["pi-lens-ast-grep/agents/openai.yaml"]
C9["pi-lens-lsp-navigation/agents/openai.yaml"]
C10["pi-lens-write-ast-grep-rule/agents/openai.yaml"]
C11["pi-lens-write-tree-sitter-rule/agents/openai.yaml"]
C12["request-review/agents/openai.yaml"]
C13["respond-review/agents/openai.yaml"]
C14["simplify/agents/openai.yaml"]
C15["variant-analysis/agents/openai.yaml"]
C16["verify-work/agents/openai.yaml"]
end
S1 --> C1
S2 --> C2
S3 --> C3
S4 --> C4
S5 --> C5
S6 --> C6
S7 --> C7
S8 --> C8
S9 --> C9
S10 --> C10
S11 --> C11
S12 --> C12
S13 --> C13
S14 --> C14
S15 --> C15
S16 --> C16
```

**Diagram sources**
- [skills/README.md](file://skills/README.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/code-reviewer/agents/openai.yaml](file://skills/code-reviewer/agents/openai.yaml)
- [skills/deepen-architecture/agents/openai.yaml](file://skills/deepen-architecture/agents/openai.yaml)
- [skills/develop-tdd/agents/openai.yaml](file://skills/develop-tdd/agents/openai.yaml)
- [skills/differential-review/agents/openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [skills/enforce-first/agents/openai.yaml](file://skills/enforce-first/agents/openai.yaml)
- [skills/fp-check/agents/openai.yaml](file://skills/fp-check/agents/openai.yaml)
- [skills/pi-lens-ast-grep/agents/openai.yaml](file://skills/pi-lens-ast-grep/agents/openai.yaml)
- [skills/pi-lens-lsp-navigation/agents/openai.yaml](file://skills/pi-lens-lsp-navigation/agents/openai.yaml)
- [skills/pi-lens-write-ast-grep-rule/agents/openai.yaml](file://skills/pi-lens-write-ast-grep-rule/agents/openai.yaml)
- [skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml](file://skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml)
- [skills/request-review/agents/openai.yaml](file://skills/request-review/agents/openai.yaml)
- [skills/respond-review/agents/openai.yaml](file://skills/respond-review/agents/openai.yaml)
- [skills/simplify/agents/openai.yaml](file://skills/simplify/agents/openai.yaml)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)
- [skills/verify-work/agents/openai.yaml](file://skills/verify-work/agents/openai.yaml)

**Section sources**
- [README.md](file://README.md)
- [skills/README.md](file://skills/README.md)

## Core Components
- Skills: Encapsulate domain-specific workflows (e.g., code review, TDD development, AST rule generation). Each skill defines its intent and expected interaction via a SKILL.md.
- Agent Configuration: Each skill ships an agents/openai.yaml that configures an OpenAI agent tailored to the skill’s task. These files define model selection, prompts, and behavior parameters.
- Integration Pattern: The runtime loads a skill’s SKILL.md for user-facing instructions and uses the corresponding openai.yaml to instantiate and run the agent.

Key responsibilities:
- Skill definition: Purpose, inputs, outputs, and usage guidance.
- Agent configuration: Model choice, system prompts, temperature/top_p, and other parameters.
- Orchestration: Invoking the configured agent with context provided by the skill.

**Section sources**
- [skills/audit-code/SKILL.md](file://skills/audit-code/SKILL.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/code-reviewer/SKILL.md](file://skills/code-reviewer/SKILL.md)
- [skills/code-reviewer/agents/openai.yaml](file://skills/code-reviewer/agents/openai.yaml)
- [skills/deepen-architecture/SKILL.md](file://skills/deepen-architecture/SKILL.md)
- [skills/deepen-architecture/agents/openai.yaml](file://skills/deepen-architecture/agents/openai.yaml)
- [skills/develop-tdd/SKILL.md](file://skills/develop-tdd/SKILL.md)
- [skills/develop-tdd/agents/openai.yaml](file://skills/develop-tdd/agents/openai.yaml)
- [skills/differential-review/SKILL.md](file://skills/differential-review/SKILL.md)
- [skills/differential-review/agents/openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [skills/enforce-first/SKILL.md](file://skills/enforce-first/SKILL.md)
- [skills/enforce-first/agents/openai.yaml](file://skills/enforce-first/agents/openai.yaml)
- [skills/fp-check/SKILL.md](file://skills/fp-check/SKILL.md)
- [skills/fp-check/agents/openai.yaml](file://skills/fp-check/agents/openai.yaml)
- [skills/pi-lens-ast-grep/SKILL.md](file://skills/pi-lens-ast-grep/SKILL.md)
- [skills/pi-lens-ast-grep/agents/openai.yaml](file://skills/pi-lens-ast-grep/agents/openai.yaml)
- [skills/pi-lens-lsp-navigation/SKILL.md](file://skills/pi-lens-lsp-navigation/SKILL.md)
- [skills/pi-lens-lsp-navigation/agents/openai.yaml](file://skills/pi-lens-lsp-navigation/agents/openai.yaml)
- [skills/pi-lens-write-ast-grep-rule/SKILL.md](file://skills/pi-lens-write-ast-grep-rule/SKILL.md)
- [skills/pi-lens-write-ast-grep-rule/agents/openai.yaml](file://skills/pi-lens-write-ast-grep-rule/agents/openai.yaml)
- [skills/pi-lens-write-tree-sitter-rule/SKILL.md](file://skills/pi-lens-write-tree-sitter-rule/SKILL.md)
- [skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml](file://skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml)
- [skills/request-review/SKILL.md](file://skills/request-review/SKILL.md)
- [skills/request-review/agents/openai.yaml](file://skills/request-review/agents/openai.yaml)
- [skills/respond-review/SKILL.md](file://skills/respond-review/SKILL.md)
- [skills/respond-review/agents/openai.yaml](file://skills/respond-review/agents/openai.yaml)
- [skills/simplify/SKILL.md](file://skills/simplify/SKILL.md)
- [skills/simplify/agents/openai.yaml](file://skills/simplify/agents/openai.yaml)
- [skills/variant-analysis/SKILL.md](file://skills/variant-analysis/SKILL.md)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)
- [skills/verify-work/SKILL.md](file://skills/verify-work/SKILL.md)
- [skills/verify-work/agents/openai.yaml](file://skills/verify-work/agents/openai.yaml)

## Architecture Overview
The agent framework follows a skill-driven pattern:
- User invokes a skill.
- The runtime reads the skill’s SKILL.md for behavior and context.
- The runtime loads the skill’s agents/openai.yaml to configure the OpenAI agent.
- The agent executes using the specified model and prompts, returning structured responses consumed by the skill.

```mermaid
sequenceDiagram
participant User as "User"
participant Runtime as "Skill Runtime"
participant Skill as "SKILL.md"
participant AgentCfg as "openai.yaml"
participant LLM as "OpenAI API"
User->>Runtime : "Invoke skill"
Runtime->>Skill : "Load skill description and inputs"
Runtime->>AgentCfg : "Load agent configuration"
Runtime->>LLM : "Send request with model and prompts"
LLM-->>Runtime : "Return response"
Runtime-->>User : "Present result per skill"
```

**Diagram sources**
- [skills/audit-code/SKILL.md](file://skills/audit-code/SKILL.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/code-reviewer/SKILL.md](file://skills/code-reviewer/SKILL.md)
- [skills/code-reviewer/agents/openai.yaml](file://skills/code-reviewer/agents/openai.yaml)
- [skills/variant-analysis/SKILL.md](file://skills/variant-analysis/SKILL.md)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)

## Detailed Component Analysis

### OpenAI Agent Setup and Model Selection
- Each skill provides an agents/openai.yaml that specifies the OpenAI agent configuration.
- Model selection strategy:
  - Choose models based on capability needs (reasoning depth, speed, cost).
  - Use stronger models for complex analysis (e.g., variant analysis, deepening architecture).
  - Use faster, lighter models for routine tasks (e.g., navigation, simple checks).
- Prompt engineering patterns:
  - System-level instructions to constrain output format and scope.
  - Task-specific guidance embedded in prompts or referenced documents.
  - Structured outputs for downstream processing.

Examples across skills:
- Code-focused skills (audit-code, code-reviewer, enforce-first) emphasize precision and consistency.
- Analytical skills (deepen-architecture, differential-review, fp-check) require deeper reasoning and structured evidence.
- Tool-oriented skills (pi-lens-* variants) focus on generating rules and navigating codebases.
- Workflow skills (develop-tdd, simplify, verify-work, request-review, respond-review) orchestrate multi-step processes.

**Section sources**
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/code-reviewer/agents/openai.yaml](file://skills/code-reviewer/agents/openai.yaml)
- [skills/deepen-architecture/agents/openai.yaml](file://skills/deepen-architecture/agents/openai.yaml)
- [skills/develop-tdd/agents/openai.yaml](file://skills/develop-tdd/agents/openai.yaml)
- [skills/differential-review/agents/openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [skills/enforce-first/agents/openai.yaml](file://skills/enforce-first/agents/openai.yaml)
- [skills/fp-check/agents/openai.yaml](file://skills/fp-check/agents/openai.yaml)
- [skills/pi-lens-ast-grep/agents/openai.yaml](file://skills/pi-lens-ast-grep/agents/openai.yaml)
- [skills/pi-lens-lsp-navigation/agents/openai.yaml](file://skills/pi-lens-lsp-navigation/agents/openai.yaml)
- [skills/pi-lens-write-ast-grep-rule/agents/openai.yaml](file://skills/pi-lens-write-ast-grep-rule/agents/openai.yaml)
- [skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml](file://skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml)
- [skills/request-review/agents/openai.yaml](file://skills/request-review/agents/openai.yaml)
- [skills/respond-review/agents/openai.yaml](file://skills/respond-review/agents/openai.yaml)
- [skills/simplify/agents/openai.yaml](file://skills/simplify/agents/openai.yaml)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)
- [skills/verify-work/agents/openai.yaml](file://skills/verify-work/agents/openai.yaml)

### Communication Protocol Between Skills and Agents
- Input assembly:
  - The runtime gathers context defined in the SKILL.md (inputs, references, constraints).
  - The runtime merges this context with the agent configuration from openai.yaml.
- Request construction:
  - The runtime builds a request payload including model selection, system/user messages, and parameters.
- Response processing:
  - The runtime parses the response according to the skill’s expectations (structured text, artifacts, or tool calls).
  - The skill may post-process results into actionable outputs (reports, diffs, suggestions).

```mermaid
flowchart TD
Start(["Start"]) --> LoadSkill["Load SKILL.md"]
LoadSkill --> LoadConfig["Load openai.yaml"]
LoadConfig --> BuildRequest["Assemble request<br/>with model and prompts"]
BuildRequest --> CallAPI["Call OpenAI API"]
CallAPI --> ParseResponse{"Parse response"}
ParseResponse --> |Success| PostProcess["Post-process per skill"]
ParseResponse --> |Error| HandleError["Handle error and retry/fallback"]
PostProcess --> Deliver["Deliver result to user"]
HandleError --> Deliver
Deliver --> End(["End"])
```

**Diagram sources**
- [skills/audit-code/SKILL.md](file://skills/audit-code/SKILL.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/variant-analysis/SKILL.md](file://skills/variant-analysis/SKILL.md)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)

**Section sources**
- [skills/audit-code/SKILL.md](file://skills/audit-code/SKILL.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/variant-analysis/SKILL.md](file://skills/variant-analysis/SKILL.md)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)

### Error Handling and Retry Strategy
- Common errors:
  - Rate limits, transient network failures, invalid requests, and model unavailability.
- Strategies:
  - Exponential backoff with jitter for retries.
  - Circuit breaker to avoid cascading failures under sustained errors.
  - Fallback to alternative models or reduced-complexity prompts when primary model fails.
- Observability:
  - Log request metadata (model, tokens, latency) without sensitive data.
  - Surface actionable errors to users with clear next steps.

[No sources needed since this section provides general guidance]

### Security Considerations
- Secrets management:
  - Store API keys securely; never embed secrets in configuration files.
- Data minimization:
  - Send only necessary context to the model; redact sensitive information.
- Output validation:
  - Validate and sanitize model outputs before executing actions or writing files.
- Access control:
  - Restrict which skills can perform write operations or external calls.

[No sources needed since this section provides general guidance]

### Rate Limiting and Cost Control
- Throttling:
  - Enforce per-user and global rate limits at the runtime layer.
- Budget controls:
  - Track token usage per skill invocation; cap costs per session or project.
- Model tiering:
  - Route low-priority tasks to cheaper models; reserve premium models for high-value work.

[No sources needed since this section provides general guidance]

### Performance Optimization
- Prompt efficiency:
  - Keep prompts concise; use references and templates to reduce repetition.
- Context window management:
  - Chunk large inputs; summarize prior context when needed.
- Parallelism:
  - Run independent skills concurrently where safe.
- Caching:
  - Cache deterministic results (e.g., static analysis outputs) to avoid redundant model calls.

[No sources needed since this section provides general guidance]

## Dependency Analysis
The dependency graph shows each skill depending on its own OpenAI agent configuration. There are no cross-skill dependencies in the configuration layer; integration occurs at the runtime level.

```mermaid
graph LR
Audit["audit-code/SKILL.md"] --> ACfg["audit-code/agents/openai.yaml"]
Review["code-reviewer/SKILL.md"] --> RCfg["code-reviewer/agents/openai.yaml"]
Deepen["deepen-architecture/SKILL.md"] --> DCfg["deepen-architecture/agents/openai.yaml"]
TDD["develop-tdd/SKILL.md"] --> TDDCfg["develop-tdd/agents/openai.yaml"]
Diff["differential-review/SKILL.md"] --> DFCfg["differential-review/agents/openai.yaml"]
Enforce["enforce-first/SKILL.md"] --> EFCfg["enforce-first/agents/openai.yaml"]
FP["fp-check/SKILL.md"] --> FPCfg["fp-check/agents/openai.yaml"]
AstGrep["pi-lens-ast-grep/SKILL.md"] --> AGCfg["pi-lens-ast-grep/agents/openai.yaml"]
LSP["pi-lens-lsp-navigation/SKILL.md"] --> LCfg["pi-lens-lsp-navigation/agents/openai.yaml"]
WriteAG["pi-lens-write-ast-grep-rule/SKILL.md"] --> WAGCfg["pi-lens-write-ast-grep-rule/agents/openai.yaml"]
WriteTS["pi-lens-write-tree-sitter-rule/SKILL.md"] --> WTCfg["pi-lens-write-tree-sitter-rule/agents/openai.yaml"]
ReqRev["request-review/SKILL.md"] --> RRCfg["request-review/agents/openai.yaml"]
RespRev["respond-review/SKILL.md"] --> SRCfg["respond-review/agents/openai.yaml"]
Simplify["simplify/SKILL.md"] --> SCfg["simplify/agents/openai.yaml"]
Variant["variant-analysis/SKILL.md"] --> VACfg["variant-analysis/agents/openai.yaml"]
Verify["verify-work/SKILL.md"] --> VFCfg["verify-work/agents/openai.yaml"]
```

**Diagram sources**
- [skills/audit-code/SKILL.md](file://skills/audit-code/SKILL.md)
- [skills/audit-code/agents/openai.yaml](file://skills/audit-code/agents/openai.yaml)
- [skills/code-reviewer/SKILL.md](file://skills/code-reviewer/SKILL.md)
- [skills/code-reviewer/agents/openai.yaml](file://skills/code-reviewer/agents/openai.yaml)
- [skills/deepen-architecture/SKILL.md](file://skills/deepen-architecture/SKILL.md)
- [skills/deepen-architecture/agents/openai.yaml](file://skills/deepen-architecture/agents/openai.yaml)
- [skills/develop-tdd/SKILL.md](file://skills/develop-tdd/SKILL.md)
- [skills/develop-tdd/agents/openai.yaml](file://skills/develop-tdd/agents/openai.yaml)
- [skills/differential-review/SKILL.md](file://skills/differential-review/SKILL.md)
- [skills/differential-review/agents/openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [skills/enforce-first/SKILL.md](file://skills/enforce-first/SKILL.md)
- [skills/enforce-first/agents/openai.yaml](file://skills/enforce-first/agents/openai.yaml)
- [skills/fp-check/SKILL.md](file://skills/fp-check/SKILL.md)
- [skills/fp-check/agents/openai.yaml](file://skills/fp-check/agents/openai.yaml)
- [skills/pi-lens-ast-grep/SKILL.md](file://skills/pi-lens-ast-grep/SKILL.md)
- [skills/pi-lens-ast-grep/agents/openai.yaml](file://skills/pi-lens-ast-grep/agents/openai.yaml)
- [skills/pi-lens-lsp-navigation/SKILL.md](file://skills/pi-lens-lsp-navigation/SKILL.md)
- [skills/pi-lens-lsp-navigation/agents/openai.yaml](file://skills/pi-lens-lsp-navigation/agents/openai.yaml)
- [skills/pi-lens-write-ast-grep-rule/SKILL.md](file://skills/pi-lens-write-ast-grep-rule/SKILL.md)
- [skills/pi-lens-write-ast-grep-rule/agents/openai.yaml](file://skills/pi-lens-write-ast-grep-rule/agents/openai.yaml)
- [skills/pi-lens-write-tree-sitter-rule/SKILL.md](file://skills/pi-lens-write-tree-sitter-rule/SKILL.md)
- [skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml](file://skills/pi-lens-write-tree-sitter-rule/agents/openai.yaml)
- [skills/request-review/SKILL.md](file://skills/request-review/SKILL.md)
- [skills/request-review/agents/openai.yaml](file://skills/request-review/agents/openai.yaml)
- [skills/respond-review/SKILL.md](file://skills/respond-review/SKILL.md)
- [skills/respond-review/agents/openai.yaml](file://skills/respond-review/agents/openai.yaml)
- [skills/simplify/SKILL.md](file://skills/simplify/SKILL.md)
- [skills/simplify/agents/openai.yaml](file://skills/simplify/agents/openai.yaml)
- [skills/variant-analysis/SKILL.md](file://skills/variant-analysis/SKILL.md)
- [skills/variant-analysis/agents/openai.yaml](file://skills/variant-analysis/agents/openai.yaml)
- [skills/verify-work/SKILL.md](file://skills/verify-work/SKILL.md)
- [skills/verify-work/agents/openai.yaml](file://skills/verify-work/agents/openai.yaml)

**Section sources**
- [skills/README.md](file://skills/README.md)

## Performance Considerations
- Prefer smaller, focused prompts to reduce token consumption and latency.
- Use model tiering to balance quality and cost.
- Implement caching for stable, deterministic outputs.
- Monitor latency and throughput; adjust concurrency and timeouts accordingly.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Symptom: Frequent rate limit errors
  - Action: Reduce concurrency, implement exponential backoff, and consider switching to a lower-tier model temporarily.
- Symptom: Inconsistent or malformed outputs
  - Action: Strengthen system prompts, enforce structured output formats, and add validation layers.
- Symptom: High latency
  - Action: Shorten context windows, pre-summarize inputs, and cache repeated computations.
- Symptom: Security warnings
  - Action: Redact sensitive data, validate outputs, and restrict write permissions.

[No sources needed since this section provides general guidance]

## Conclusion
The agent framework leverages a clean separation between skill definitions and OpenAI agent configurations. This design enables consistent prompt engineering, flexible model selection, and robust integration patterns. By applying the recommended practices for security, rate limiting, and performance, teams can scale AI-assisted workflows reliably across diverse coding tasks.

[No sources needed since this section summarizes without analyzing specific files]