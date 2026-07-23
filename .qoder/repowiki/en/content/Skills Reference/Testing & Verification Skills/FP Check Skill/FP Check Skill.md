# FP Check Skill

<cite>
**Referenced Files in This Document**
- [SKILL.md](file://skills/fp-check/SKILL.md)
- [bug-class-verification.md](file://skills/fp-check/references/bug-class-verification.md)
- [deep-verification.md](file://skills/fp-check/references/deep-verification.md)
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)
</cite>

## Update Summary
**Changes Made**
- Updated security model to reflect read-only operations only
- Enhanced verification workflow documentation with security constraints
- Added security considerations section for automated code analysis
- Updated troubleshooting guide with security-related guidance

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Security Model](#security-model)
5. [Architecture Overview](#architecture-overview)
6. [Detailed Component Analysis](#detailed-component-analysis)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Conclusion](#conclusion)
12. [Appendices](#appendices)

## Introduction
This document provides comprehensive reference material for the FP Check skill, which enables functional programming verification capabilities across codebases. It consolidates guidance on bug class verification, deep verification techniques, evidence templates, false positive pattern recognition, gate review processes, and standard verification procedures. The goal is to help practitioners define robust verification rules, integrate them with functional languages, detect common anti-patterns, and execute repeatable verification workflows that improve reliability and maintainability.

**Updated** Security enhancement now restricts all operations to read-only tools only, following the principle of least privilege for automated code analysis tasks.

## Project Structure
The FP Check skill is organized as a modular set of references under a dedicated directory. The primary entry point describes the skill's purpose and scope, while the references folder contains detailed methodology and operational guidance.

```mermaid
graph TB
subgraph "FP Check Skill"
A["SKILL.md"]
B["references/bug-class-verification.md"]
C["references/deep-verification.md"]
D["references/evidence-templates.md"]
E["references/false-positive-patterns.md"]
F["references/gate-reviews.md"]
G["references/standard-verification.md"]
end
A --> B
A --> C
A --> D
A --> E
A --> F
A --> G
```

**Diagram sources**
- [SKILL.md](file://skills/fp-check/SKILL.md)
- [bug-class-verification.md](file://skills/fp-check/references/bug-class-verification.md)
- [deep-verification.md](file://skills/fp-check/references/deep-verification.md)
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)

**Section sources**
- [SKILL.md](file://skills/fp-check/SKILL.md)

## Core Components
The FP Check skill centers around six core components:

- Bug Class Verification: Defines how to identify, classify, and verify functional programming-related defects.
- Deep Verification: Provides advanced techniques for thorough analysis beyond surface-level checks.
- Evidence Templates: Standardized formats for capturing findings, context, and remediation steps.
- False Positive Pattern Recognition: Catalogs patterns that commonly lead to misclassification and how to avoid them.
- Gate Reviews: Describes quality gates and decision criteria for releasing or blocking changes.
- Standard Verification Procedures: Step-by-step workflows for consistent execution of verification tasks.

These components collectively form a cohesive methodology for verifying functional correctness and style adherence in functional programming contexts.

**Updated** All components now operate under strict read-only permissions, ensuring no modification capabilities during analysis.

**Section sources**
- [bug-class-verification.md](file://skills/fp-check/references/bug-class-verification.md)
- [deep-verification.md](file://skills/fp-check/references/deep-verification.md)
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)

## Security Model
The FP Check skill operates under a strict security model that enforces read-only access principles:

### Permission Restrictions
- **Read-Only Operations**: All verification tools are restricted to read-only file system access
- **No Write Capabilities**: Explicit removal of write, edit, and bash execution capabilities
- **Principle of Least Privilege**: Automated code analysis tasks operate with minimal required permissions
- **Isolated Execution Environment**: Verification runs occur in sandboxed environments

### Security Benefits
- Prevents accidental code modifications during analysis
- Reduces attack surface for potential vulnerabilities
- Ensures auditability of verification processes
- Maintains integrity of source code repositories

### Operational Constraints
- File system access limited to reading code artifacts
- No shell command execution capabilities
- No network access unless explicitly configured
- Temporary files created only in secure, isolated directories

**Section sources**
- [SKILL.md](file://skills/fp-check/SKILL.md)

## Architecture Overview
At a high level, the FP Check skill orchestrates verification through a secure pipeline:

- Input: Code artifacts from functional programming languages (e.g., Haskell, OCaml, Scala, Clojure).
- Rule Engine: Applies rule definitions derived from bug classes and anti-pattern catalogs.
- Evidence Capture: Produces structured findings using evidence templates.
- Review Gates: Enforces quality thresholds and approvals before release.
- Output: Verified results, actionable insights, and compliance reports.

```mermaid
flowchart TD
Start(["Start Verification"]) --> LoadRules["Load Rule Definitions<br/>from Bug Classes and Anti-Patterns"]
LoadRules --> AnalyzeCode["Analyze Functional Code Artifacts<br/>(Read-Only Access)"]
AnalyzeCode --> DetectIssues{"Issues Detected?"}
DetectIssues --> |No| GenerateReport["Generate Clean Report"]
DetectIssues --> |Yes| ApplyDeepVerify["Apply Deep Verification Techniques<br/>(Sandboxed Environment)"]
ApplyDeepVerify --> Classify["Classify Findings by Bug Class"]
Classify --> TemplateEvidence["Populate Evidence Templates"]
TemplateEvidence --> GateReview["Gate Review Process"]
GateReview --> Decision{"Approved?"}
Decision --> |Yes| Publish["Publish Verified Results"]
Decision --> |No| Remediate["Remediate and Re-run"]
Remediate --> AnalyzeCode
Publish --> End(["End"])
GenerateReport --> End
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

## Detailed Component Analysis

### Bug Class Verification
This component defines how to categorize and verify functional programming defects. It includes:

- Defining bug classes specific to functional paradigms (e.g., improper use of monads, unsafe state leakage, incorrect handling of partial functions).
- Establishing detection criteria and severity levels.
- Mapping each bug class to concrete rule definitions and test cases.
- Providing examples of typical violations and their impact.

Operational guidance covers:

- How to author new bug classes.
- How to validate rule coverage.
- How to triage and prioritize findings.

**Updated** All bug class verification now operates within read-only constraints, ensuring no accidental modifications during classification.

**Section sources**
- [bug-class-verification.md](file://skills/fp-check/references/bug-class-verification.md)

### Deep Verification
Deep verification extends basic checks with more rigorous analysis methods:

- Static analysis enhancements tailored to functional constructs.
- Symbolic reasoning where applicable.
- Cross-file and cross-module dependency checks.
- Integration with language-specific toolchains.

It also outlines when to escalate from standard checks to deep verification and how to interpret deeper findings.

**Updated** Deep verification techniques now execute in isolated, read-only environments to prevent any side effects during analysis.

**Section sources**
- [deep-verification.md](file://skills/fp-check/references/deep-verification.md)

### Evidence Templates
Standardized evidence templates ensure consistency and clarity in reporting:

- Required fields for each finding (context, location, classification, severity).
- Guidance on attaching relevant snippets and logs.
- Examples of well-formed evidence entries.
- Best practices for reproducibility and auditability.

Templates support downstream automation and human review alike.

**Section sources**
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)

### False Positive Pattern Recognition
This section catalogs patterns that often cause false positives:

- Common misclassifications in functional idioms.
- Contextual nuances that require additional disambiguation.
- Strategies to refine rules and reduce noise.
- Feedback loops to continuously improve accuracy.

Practitioners can use this catalog to tune rule sets and minimize unnecessary alerts.

**Section sources**
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)

### Gate Reviews
Gate reviews formalize quality checkpoints:

- Criteria for passing verification gates.
- Roles and responsibilities during review.
- Escalation paths for unresolved issues.
- Documentation requirements for approvals.

Gates ensure that only verified and compliant changes proceed.

**Section sources**
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)

### Standard Verification Procedures
Standard procedures provide repeatable workflows:

- Pre-flight checks and environment setup.
- Execution steps for running verifications.
- Interpretation of outputs and next actions.
- Post-run cleanup and reporting.

These procedures help teams achieve consistent outcomes across environments and contributors.

**Updated** All verification procedures now enforce read-only access policies and include security validation steps.

**Section sources**
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)

## Dependency Analysis
The FP Check skill's references are interdependent:

- SKILL.md serves as the entry point and links to all reference materials.
- Bug class definitions inform rule creation and detection logic.
- Deep verification builds upon bug classes and anti-pattern knowledge.
- Evidence templates standardize output produced by verification runs.
- False positive patterns guide refinement of rules and templates.
- Gate reviews consume evidence and decisions to enforce quality.
- Standard procedures orchestrate the entire process end-to-end.

```mermaid
graph TB
S["SKILL.md"]
B["Bug Class Verification"]
D["Deep Verification"]
E["Evidence Templates"]
F["False Positive Patterns"]
G["Gate Reviews"]
V["Standard Verification"]
S --> B
S --> D
S --> E
S --> F
S --> G
S --> V
B --> D
B --> E
F --> D
E --> G
D --> G
V --> G
```

**Diagram sources**
- [SKILL.md](file://skills/fp-check/SKILL.md)
- [bug-class-verification.md](file://skills/fp-check/references/bug-class-verification.md)
- [deep-verification.md](file://skills/fp-check/references/deep-verification.md)
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)

**Section sources**
- [SKILL.md](file://skills/fp-check/SKILL.md)
- [bug-class-verification.md](file://skills/fp-check/references/bug-class-verification.md)
- [deep-verification.md](file://skills/fp-check/references/deep-verification.md)
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)

## Performance Considerations
- Prefer incremental verification to limit scope and speed up feedback cycles.
- Cache intermediate results where possible to avoid redundant work.
- Use targeted rule sets for specific modules or PRs rather than full scans.
- Balance depth vs. breadth; escalate to deep verification selectively.
- Monitor false positive rates and refine rules to reduce overhead.
- Leverage read-only caching mechanisms to improve performance without compromising security.

**Updated** Performance optimizations now account for read-only operation constraints and sandboxed execution environments.

## Security Considerations
The FP Check skill implements comprehensive security measures to protect codebases during analysis:

### Read-Only Enforcement
- All file system operations are restricted to read-only access
- No write, edit, or delete capabilities available to verification tools
- Shell command execution is disabled to prevent arbitrary code execution
- Network access is blocked unless explicitly configured for external dependencies

### Isolation and Sandboxing
- Verification processes run in isolated containers or virtual environments
- Temporary files are created in secure, ephemeral directories
- Memory isolation prevents data leakage between verification runs
- Resource limits prevent denial-of-service attacks

### Audit and Compliance
- Complete audit trails for all verification activities
- Immutable evidence storage for compliance requirements
- Security scanning of verification tool configurations
- Regular security assessments of the verification pipeline

### Best Practices
- Always use the latest version of verification tools
- Review security configurations regularly
- Monitor for unusual activity during verification runs
- Implement proper access controls for verification infrastructure

## Troubleshooting Guide
Common issues and resolutions:

- Misclassified findings: Consult false positive patterns to adjust rule conditions and add contextual guards.
- Incomplete evidence: Ensure evidence templates capture required fields and reproducible context.
- Gate failures: Review gate criteria and remediation steps; re-run verification after fixes.
- Slow runs: Narrow scope, enable caching, and split large jobs into smaller tasks.
- Permission errors: Verify read-only access configuration and ensure proper file permissions are set.
- Security policy violations: Review security configurations and ensure compliance with organizational policies.

**Updated** Added security-related troubleshooting scenarios and solutions.

**Section sources**
- [false-positive-patterns.md](file://skills/fp-check/references/false-positive-patterns.md)
- [evidence-templates.md](file://skills/fp-check/references/evidence-templates.md)
- [gate-reviews.md](file://skills/fp-check/references/gate-reviews.md)
- [standard-verification.md](file://skills/fp-check/references/standard-verification.md)

## Conclusion
The FP Check skill offers a structured approach to verifying functional programming code through well-defined bug classes, deep verification techniques, standardized evidence, false positive mitigation, gate reviews, and repeatable procedures. By adopting these practices and operating under strict read-only security constraints, teams can improve reliability, reduce risk, and maintain high standards across functional codebases while ensuring complete security and auditability.

**Updated** The enhanced security model ensures that all verification activities maintain the highest standards of safety and compliance.

## Appendices

### Verification Workflow Sequence
A practical sequence for executing verification:

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant Runner as "Verification Runner"
participant Rules as "Rule Engine"
participant Evidence as "Evidence Collector"
participant Gate as "Gate Reviewer"
Dev->>Runner : "Initiate verification"
Runner->>Rules : "Load bug classes and anti-patterns"
Rules-->>Runner : "Ready"
Runner->>Runner : "Analyze code artifacts (Read-Only)"
Runner->>Evidence : "Capture findings via templates"
Evidence-->>Runner : "Structured evidence"
Runner->>Gate : "Submit for gate review"
Gate-->>Dev : "Decision (approve / remediate)"
alt "Remediate"
Dev->>Runner : "Fix issues and re-run"
else "Approve"
Dev->>Dev : "Proceed with integration"
end
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

### Security Configuration Reference
Key security settings for FP Check skill deployment:

- **File System Permissions**: Read-only access to target directories
- **Network Access**: Disabled by default, configurable for external dependencies
- **Shell Execution**: Completely disabled to prevent arbitrary command execution
- **Memory Limits**: Configurable per verification task to prevent resource exhaustion
- **Audit Logging**: Enabled by default for all verification activities
- **Temporary Storage**: Isolated and automatically cleaned after verification completion