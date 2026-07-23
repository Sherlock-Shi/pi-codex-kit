# Differential Review Skill

<cite>
**Referenced Files in This Document**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)
</cite>

## Update Summary
**Changes Made**
- Updated methodology section to reflect the replacement of unsafe git checkout operations with read-only git show commands
- Enhanced security considerations and environment portability documentation
- Added safety-focused workflow guidance for diff analysis

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Security and Safety Enhancements](#security-and-safety-enhancements)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
The differential-review skill focuses on change-focused code reviews with adversarial testing capabilities. It provides a structured methodology for analyzing diffs, identifying risky changes, and applying adversarial strategies to uncover latent defects. The skill also defines pattern recognition techniques and standardized reporting formats to ensure consistent, actionable review outcomes. **Updated** to emphasize safe, read-only operations that improve security and portability across different environments.

## Project Structure
The skill is organized as a self-contained module under the skills directory:
- SKILL.md: High-level overview, usage, and integration notes
- methodology.md: Step-by-step process for diff analysis and review workflow
- adversarial.md: Adversarial testing strategies and scenario design
- patterns.md: Pattern catalog and guidance for recognizing risky or anti-pattern changes
- reporting.md: Output templates and structure for review reports
- agents/openai.yaml: Agent configuration for model invocation and behavior tuning

```mermaid
graph TB
subgraph "Differential Review Skill"
A["SKILL.md"]
B["methodology.md"]
C["adversarial.md"]
D["patterns.md"]
E["reporting.md"]
F["agents/openai.yaml"]
end
A --> B
A --> C
A --> D
A --> E
B --> C
B --> D
B --> E
C --> D
C --> E
D --> E
F --> A
```

**Diagram sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

**Section sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

## Core Components
- Change Analysis Methodology: Defines how to scope diffs, prioritize risk areas, and validate impact across modules using safe, read-only operations.
- Adversarial Testing Strategies: Provides techniques to stress-test changes by simulating edge cases, failure modes, and misuse scenarios.
- Pattern Recognition Catalog: Enumerates common risky patterns and anti-patterns that often emerge in diffs.
- Reporting Format: Standardizes outputs for clarity, traceability, and actionability.
- Agent Configuration: Controls model parameters and behavior for automated assistance during review.
- **Security-First Operations**: Ensures all repository interactions use read-only commands to prevent accidental modifications and improve cross-environment compatibility.

**Section sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

## Architecture Overview
The skill orchestrates a pipeline from diff ingestion through adversarial evaluation to report generation. The agent configuration tunes the model's behavior to align with the skill's standards. **Updated** to emphasize read-only operations throughout the workflow.

```mermaid
sequenceDiagram
participant User as "Reviewer"
participant Skill as "Differential Review Skill"
participant Agent as "Agent (openai.yaml)"
participant Repo as "Codebase/Diff"
participant Report as "Report Generator"
User->>Skill : "Provide diff and context"
Skill->>Repo : "Extract changed files using read-only git show"
Skill->>Agent : "Invoke analysis with configured parameters"
Agent-->>Skill : "Insights and flagged items"
Skill->>Skill : "Apply methodology and pattern checks"
Skill->>Agent : "Run adversarial scenarios"
Agent-->>Skill : "Adversarial findings"
Skill->>Report : "Assemble standardized report"
Report-->>User : "Review output"
```

**Diagram sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

## Detailed Component Analysis

### Change Analysis Methodology
This component outlines the stepwise approach to reviewing diffs using safe, read-only operations:
- Scope identification: Determine affected components and dependencies without modifying the working tree.
- Risk triage: Prioritize high-impact changes based on complexity and exposure.
- Validation strategy: Define tests, assertions, and verification steps.
- Impact assessment: Evaluate cross-module effects and regression risks.
- **Safe Diff Extraction**: Utilize `git show` commands instead of `git checkout` to prevent accidental repository state changes and improve portability across different environments.

```mermaid
flowchart TD
Start(["Start Diff Review"]) --> SafeOps["Use Read-Only Git Show Commands"]
SafeOps --> Scope["Identify Scope and Dependencies"]
Scope --> Triage["Triage Risk Areas"]
Triage --> Validate["Define Validation Strategy"]
Validate --> Assess["Assess Cross-Module Impact"]
Assess --> Iterate{"Additional Changes?"}
Iterate --> |Yes| Scope
Iterate --> |No| Proceed["Proceed to Adversarial Testing"]
```

**Diagram sources**
- [methodology.md](file://skills/differential-review/methodology.md)

**Section sources**
- [methodology.md](file://skills/differential-review/methodology.md)

### Adversarial Testing Strategies
Adversarial testing aims to break assumptions embedded in changes by constructing targeted scenarios:
- Edge-case injection: Stress inputs at boundaries and limits.
- Failure-mode simulation: Introduce faults, timeouts, and inconsistent states.
- Misuse modeling: Exercise APIs and interfaces with invalid or unexpected usage.
- Regression probing: Revisit previously fixed issues to ensure stability.

```mermaid
flowchart TD
A["Select Change Under Test"] --> B["Design Adversarial Scenarios"]
B --> C["Inject Faults and Edge Cases"]
C --> D["Execute Tests and Observe Behavior"]
D --> E{"Defects Found?"}
E --> |Yes| F["Document Findings and Remediation"]
E --> |No| G["Confirm Stability and Close"]
```

**Diagram sources**
- [adversarial.md](file://skills/differential-review/adversarial.md)

**Section sources**
- [adversarial.md](file://skills/differential-review/adversarial.md)

### Pattern Recognition Techniques
Pattern recognition accelerates detection of risky changes by matching known anti-patterns and problematic structures:
- Common pitfalls: Identify recurring mistakes in logic, error handling, and concurrency.
- Structural red flags: Detect overly complex conditionals, hidden side effects, and tight coupling.
- Security-sensitive patterns: Flag unsafe operations, privilege escalations, and data exposure.
- Custom patterns: Encourage team-specific definitions aligned with domain constraints.

```mermaid
classDiagram
class PatternCatalog {
+string name
+string description
+string[] languages
+severity level
+exampleRefs string[]
}
class Analyzer {
+scanDiff(diff) PatternMatch[]
+matchPatterns(patterns, changes) PatternMatch[]
+prioritizeMatches(matches) PatternMatch[]
}
class PatternMatch {
+string file
+int line
+string snippet
+string rationale
}
Analyzer --> PatternCatalog : "uses"
Analyzer --> PatternMatch : "produces"
```

**Diagram sources**
- [patterns.md](file://skills/differential-review/patterns.md)

**Section sources**
- [patterns.md](file://skills/differential-review/patterns.md)

### Reporting Formats
Standardized reporting ensures consistency and actionability:
- Summary: High-level overview of changes and overall risk posture.
- Findings: Structured entries with severity, location, and rationale.
- Recommendations: Concrete remediation steps and references.
- Evidence: Links to diffs, logs, and test results supporting each finding.

```mermaid
flowchart TD
R0["Collect Inputs"] --> R1["Draft Summary"]
R1 --> R2["Enumerate Findings"]
R2 --> R3["Attach Evidence"]
R3 --> R4["Propose Recommendations"]
R4 --> R5["Finalize Report"]
```

**Diagram sources**
- [reporting.md](file://skills/differential-review/reporting.md)

**Section sources**
- [reporting.md](file://skills/differential-review/reporting.md)

### Agent Configuration
The agent configuration controls model invocation and behavior alignment with the skill's standards:
- Model selection and parameters: Tune temperature, max tokens, and other runtime settings.
- Prompt scaffolding: Embed methodology, adversarial prompts, and pattern instructions.
- Output constraints: Enforce structured responses compatible with the reporting format.

```mermaid
graph TB
Cfg["openai.yaml"] --> Params["Model Parameters"]
Cfg --> Prompts["Prompt Templates"]
Cfg --> Constraints["Output Schema"]
Params --> Run["Execution"]
Prompts --> Run
Constraints --> Run
```

**Diagram sources**
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [SKILL.md](file://skills/differential-review/SKILL.md)

**Section sources**
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)
- [SKILL.md](file://skills/differential-review/SKILL.md)

## Dependency Analysis
The skill's internal dependencies are cohesive and focused:
- SKILL.md orchestrates usage and ties together methodology, adversarial testing, patterns, and reporting.
- Methodology drives the flow into adversarial testing and pattern checks.
- Patterns inform both analysis and reporting.
- Reporting consolidates insights from all components.
- Agent configuration influences execution behavior across the pipeline.

```mermaid
graph LR
SKILL["SKILL.md"] --> METH["methodology.md"]
SKILL --> ADV["adversarial.md"]
SKILL --> PAT["patterns.md"]
SKILL --> REP["reporting.md"]
METH --> ADV
METH --> PAT
METH --> REP
ADV --> PAT
ADV --> REP
PAT --> REP
CFG["agents/openai.yaml"] --> SKILL
```

**Diagram sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

**Section sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

## Performance Considerations
- Scope diffs precisely to reduce noise and improve focus.
- Pre-filter low-risk changes using heuristics before invoking adversarial testing.
- Cache pattern matches where possible to avoid redundant scans.
- Batch adversarial scenarios to minimize overhead while maintaining coverage.
- Use agent configuration to balance depth and speed according to review urgency.
- **Optimize read-only operations**: Leverage efficient git show commands to minimize I/O overhead while maintaining safety guarantees.

## Security and Safety Enhancements
**New Section** - This section documents the critical security improvements made to the differential-review skill.

### Safe Repository Operations
The skill now exclusively uses read-only git operations to eliminate the risk of accidental repository modifications:

#### Previous Approach (Deprecated)
- Used `git checkout` commands that could modify working tree state
- Required write permissions to repository directories
- Potentially dangerous in shared or CI/CD environments
- Limited portability across different deployment contexts

#### Current Approach (Recommended)
- Uses `git show` commands for all repository access
- Maintains read-only access to repository contents
- Eliminates risk of unintended state modifications
- Improves compatibility across diverse environments including restricted CI/CD pipelines
- Supports containerized and ephemeral execution contexts

### Security Benefits
- **Isolation**: No modification of source code or repository metadata
- **Auditability**: All operations are transparent and non-destructive
- **Portability**: Works consistently across different permission models and deployment strategies
- **Reproducibility**: Same results regardless of local repository state variations

### Implementation Guidelines
When integrating the differential-review skill:
- Ensure git is available in the execution environment
- Verify read-only access to target repositories
- Configure appropriate git credentials for private repositories
- Use temporary directories for any intermediate processing needs

**Section sources**
- [methodology.md](file://skills/differential-review/methodology.md)
- [SKILL.md](file://skills/differential-review/SKILL.md)

## Troubleshooting Guide
- If reports lack actionable details, verify that evidence attachments and rationale fields are populated per the reporting format.
- If adversarial scenarios produce false positives, refine scenario constraints and add negative examples to the pattern catalog.
- If agent outputs drift from expected structure, adjust prompt scaffolding and output constraints in the agent configuration.
- If analysis misses critical areas, expand scope identification and dependency mapping in the methodology.
- **Git Operation Issues**: If encountering permission errors, ensure read-only access to repositories and verify git availability in the execution environment.
- **Environment Compatibility**: If experiencing portability issues, confirm that the environment supports standard git show operations without requiring write permissions.

**Section sources**
- [reporting.md](file://skills/differential-review/reporting.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)

## Conclusion
The differential-review skill provides a comprehensive framework for change-focused code reviews. By combining rigorous methodology, adversarial testing, robust pattern recognition, and standardized reporting, it enables teams to detect and mitigate risks early. With configurable agent behavior and enhanced security through read-only operations, the skill adapts to varying project needs while maintaining consistent quality, traceability, and safety across diverse deployment environments.

## Appendices

### Workflow Integration Checklist
- Prepare diffs and related context (tests, logs, prior issues).
- Configure agent parameters for desired depth and speed.
- Execute methodology steps using safe, read-only git operations.
- Run adversarial scenarios and apply pattern checks.
- Document findings and generate standardized reports.
- **Verify Environment Compatibility**: Ensure git is available and read-only access is properly configured.

**Section sources**
- [SKILL.md](file://skills/differential-review/SKILL.md)
- [methodology.md](file://skills/differential-review/methodology.md)
- [adversarial.md](file://skills/differential-review/adversarial.md)
- [patterns.md](file://skills/differential-review/patterns.md)
- [reporting.md](file://skills/differential-review/reporting.md)
- [openai.yaml](file://skills/differential-review/agents/openai.yaml)