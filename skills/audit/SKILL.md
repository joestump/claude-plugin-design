---
name: audit
description: Comprehensive audit of design artifact alignment across the project. Use when the user says "audit the architecture", "full drift report", or wants a thorough review of spec compliance and ADR adherence.
allowed-tools: Read, Glob, Grep, Task, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, AskUserQuestion
argument-hint: [scope] [--review]
---

# Comprehensive Design Audit

You are performing a deep, comprehensive audit of design artifact alignment across the project or a specified scope. This skill covers all six drift categories and produces a structured report with prioritized findings.

## Process

1. **Parse arguments**: Extract the scope and flags from `$ARGUMENTS`.
   - Scope can be a topic keyword (`security`, `api`, `database`), a directory path (`src/`), or omitted for a full project audit.
   - Check for the `--review` flag.
   - If scope matches nothing, report: "No design artifacts or source files matched the scope \"{scope}\". Try a broader scope, or run `/design:audit` without a scope for a full project audit."

2. **Locate design artifacts**:
   - Scan `docs/adrs/` for ADR files. If the directory does not exist, report: "The docs/adrs/ directory does not exist. Run `/design:adr [description]` to create your first ADR."
   - Scan `docs/openspec/specs/` for spec files. If the directory does not exist, report: "The docs/openspec/specs/ directory does not exist. Run `/design:spec [capability]` to create your first spec."
   - If neither ADRs nor specs exist, report: "No design artifacts found. Create an ADR with `/design:adr` or a spec with `/design:spec` first."
   - It is valid for only ADRs or only specs to exist -- proceed with whatever is available and note which categories cannot be checked.

3. **Choose execution mode**: Check if `$ARGUMENTS` contains `--review`.

   **Default (no `--review`)**: Single-agent mode.
   - Perform the full analysis yourself across all six categories.
   - Self-review the findings for accuracy and completeness before producing the report.
   - Verify that severity assignments follow the rules in this document.

   **With `--review`**: Team review mode.
   - Tell the user: "Creating an audit team to analyze and review findings. This takes a few minutes."
   - Create a Claude Team with `TeamCreate`:
     - Spawn an **auditor** agent (`general-purpose`) to perform the full analysis and write the audit report
     - Spawn a **reviewer** agent (`general-purpose`) to validate the auditor's findings for accuracy, completeness, and correct severity assignments
   - If `TeamCreate` fails, fall back to single-agent mode and tell the user: "Team creation failed. Proceeding with single-agent audit and self-review."

4. **Analyze across all six categories**:

   **Code vs. Specification Drift**: Does the implementation match spec requirements and scenarios?
   - Read each spec's requirements and scenarios
   - Find implementing code files by semantic relevance
   - Check MUST/SHALL requirements -- violations are `[CRITICAL]`
   - Check SHOULD/RECOMMENDED requirements -- violations are `[WARNING]`
   - Check scenario coverage -- missing scenarios are `[WARNING]`

   **Code vs. ADR Drift**: Does the implementation follow accepted ADR decisions?
   - Read each accepted ADR's decision outcome and consequences
   - Find implementing code files
   - Check that the chosen approach is implemented -- violations are `[CRITICAL]`
   - Check architectural constraints -- violations are `[WARNING]`

   **ADR vs. Spec Inconsistencies**: Are ADR decisions consistent with spec requirements?
   - Cross-reference ADR decisions with related spec requirements
   - Check for contradictions -- contradictions are `[CRITICAL]`
   - Check for terminology or approach mismatches -- mismatches are `[WARNING]`

   **Coverage Gaps**: What code areas have no governing ADR or spec?
   - Scan source directories for code files
   - Identify files and directories not referenced by any ADR or spec
   - All coverage gaps are `[INFO]`

   **Stale Artifacts**: Do artifact statuses match implementation reality?
   - Check for ADRs with status `proposed` that have existing implementations -- `[WARNING]`
   - Check for specs with status `draft` that have deployed implementations -- `[WARNING]`
   - Check for `accepted` ADRs whose decisions have been overridden in code -- `[WARNING]`

   **Policy Violations**: Are specs internally consistent in their use of RFC 2119 keywords?
   - Check for SHOULD where MUST appears intended (e.g., security requirements using SHOULD instead of MUST) -- `[INFO]`
   - Check for contradictory requirements within the same spec -- `[CRITICAL]`
   - Check for requirements that are untestable or ambiguous -- `[INFO]`

5. **Produce the audit report** using the standard format:

   ```
   ## Design Audit Report

   Scope: {scope or "Full project"}
   Analyzed: {N} ADRs, {M} specs, {P} source files
   Total findings: {X} ({C} critical, {W} warning, {I} info)

   ---

   ### Code vs. Specification Drift

   | Severity | Finding | Spec | Location |
   |----------|---------|------|----------|
   | [CRITICAL] | {description} | SPEC-XXXX | src/path/file.ts:NN |

   ### Code vs. ADR Drift

   | Severity | Finding | ADR | Location |
   |----------|---------|-----|----------|
   | [WARNING] | {description} | ADR-XXXX | src/path/file.ts:NN |

   ### ADR vs. Spec Inconsistencies

   | Severity | Finding | ADR | Spec |
   |----------|---------|-----|------|
   | [CRITICAL] | {description} | ADR-XXXX | SPEC-XXXX |

   ### Coverage Gaps

   | Severity | Area | Description |
   |----------|------|-------------|
   | [INFO] | src/path/ | {description} |

   ### Stale Artifacts

   | Severity | Artifact | Issue |
   |----------|----------|-------|
   | [WARNING] | ADR-XXXX | {description} |

   ### Policy Violations

   | Severity | Finding | Source | Location |
   |----------|---------|--------|----------|
   | [INFO] | {description} | SPEC-XXXX | docs/openspec/specs/path/spec.md |

   ---

   ### Summary

   | Category | Critical | Warning | Info | Total |
   |----------|----------|---------|------|-------|
   | Code vs. Spec | N | N | N | N |
   | Code vs. ADR | N | N | N | N |
   | ADR vs. Spec | N | N | N | N |
   | Coverage Gaps | N | N | N | N |
   | Stale Artifacts | N | N | N | N |
   | Policy Violations | N | N | N | N |
   | **Total** | **N** | **N** | **N** | **N** |

   ### Recommended Actions
   1. [CRITICAL] {action}
   2. [WARNING] {action}
   3. [INFO] {action}
   ```

6. **Add recommended actions** at the end, ordered by severity:
   - For stale artifact findings, suggest `/design:status` to update
   - For coverage gaps suggesting missing ADRs, suggest `/design:adr`
   - For coverage gaps suggesting missing specs, suggest `/design:spec`
   - Never suggest `/design:check` (audit is a superset of check)

7. **Handle clean results**: If no drift is found across any category:

   ```
   ## Design Audit Report

   Scope: {scope or "Full project"}
   Analyzed: {N} ADRs, {M} specs, {P} source files

   No drift detected. All implementation aligns with governing ADRs and specs.
   ```

### Team Handoff Protocol (only for `--review` mode)

1. The auditor performs the full analysis and writes the audit report
2. The auditor sends a message to the reviewer: "Audit report ready for review"
3. The reviewer validates the findings by:
   - Checking that each finding is accurate (the drift actually exists)
   - Checking that severity assignments follow the rules
   - Checking for findings the auditor may have missed
   - Verifying the summary matrix counts are correct
4. The reviewer either:
   a. Sends "APPROVED" to the lead, or
   b. Sends specific revision requests to the auditor (e.g., "Finding #3 severity should be WARNING not CRITICAL because the requirement uses SHOULD")
5. Maximum 2 revision rounds. After that, the reviewer approves with noted concerns.
6. The lead agent presents the final report only after receiving "APPROVED"
7. Clean up the team with `TeamDelete` when done.

## Severity Assignment Rules

- A finding that contradicts a MUST, SHALL, or MUST NOT requirement is always `[CRITICAL]`
- A finding that contradicts a SHOULD or RECOMMENDED requirement is always `[WARNING]`
- A coverage gap (no governing artifact) is always `[INFO]`
- A stale artifact (status does not match reality) is `[WARNING]`
- An inconsistency between ADR and spec (e.g., ADR says X, spec says Y) is `[CRITICAL]`
- A contradictory requirement within the same spec is `[CRITICAL]`
- An internally inconsistent RFC 2119 keyword usage is `[INFO]`
- An untestable or ambiguous requirement is `[INFO]`

## Rules

- Analyze ALL six drift categories. This is a comprehensive audit, not a quick check.
- When scope is provided, filter artifacts and code to only those relevant to the scope. When scope is omitted, audit the entire project.
- In single-agent mode, self-review all findings before producing the final report. Verify each finding is accurate and severity is correctly assigned.
- In `--review` mode, follow the team handoff protocol exactly. Do not present the report until the reviewer sends "APPROVED".
- Omit any category section from the report if it has zero findings (but always include it in the summary matrix with zeros).
- Always use full artifact identifiers in output: `ADR-0001`, `SPEC-0002`, `Req 3`. Do not abbreviate.
- Include file paths with line numbers in the Location column when possible (e.g., `src/auth/login.ts:45`).
- Use `##` for the top-level heading (report title) and `###` for sections within the report.
- The Recommended Actions list must be ordered by severity (critical first, then warning, then info).
- Present findings within each category ordered by severity (critical first).
