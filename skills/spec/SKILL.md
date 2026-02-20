---
name: spec
description: Create a specification with requirements, scenarios, and design rationale. Use when the user wants to write a spec, formalize requirements, convert an ADR to a specification, or says "create a spec".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, WebFetch, WebSearch, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, AskUserQuestion
argument-hint: [capability name or ADR reference] [--review]
---

# Create an OpenSpec Specification

You are creating an OpenSpec specification consisting of BOTH a `spec.md` and `design.md`.

**You MUST ALWAYS create BOTH files. Never one without the other.**

## Process

1. **Determine the capability name**: Use kebab-case (e.g., `web-dashboard`, `webhook-trigger`). If converting from an ADR, derive from the ADR title. If `$ARGUMENTS` is empty (ignoring flags like `--review`), use `AskUserQuestion` to ask the user what capability they want to specify.

2. **Check for existing directory**: If `docs/openspec/specs/{capability-name}/` already exists, use `AskUserQuestion` to ask whether to overwrite or choose a different name. Create `docs/openspec/specs/` if it does not exist.

3. **Determine the next SPEC number**: Scan `docs/openspec/specs/` for existing spec.md files, find the highest SPEC number used, and increment. SPEC numbers are formatted as `SPEC-XXXX` (e.g., SPEC-0001). Start at SPEC-0001 if none exist. **IMPORTANT**: The prefix is `SPEC-`, NOT `RFC-`. Do not confuse spec numbering with RFC 2119 (which is a language standard for requirements keywords).

4. **Choose drafting mode**: Check if `$ARGUMENTS` contains `--review`.

   **Default (no `--review`)**: Single-agent mode. Research the codebase (read relevant files, understand the current architecture), draft both spec.md and design.md directly, self-review against the architect's checklist in the Rules section, then write both files.

   **With `--review`**: Team review mode.
   - Tell the user: "Creating a drafting team to write and review the spec. This takes a minute or two."
   - Create a Claude Team with `TeamCreate` to draft and review:
     - Spawn a **spec-writer** agent (`general-purpose`) to write both spec.md and design.md based on the user's description or ADR: `$ARGUMENTS`. **Remind the spec-writer that specs use `SPEC-XXXX` numbering, NOT `RFC-XXXX`.**
     - Spawn an **architect** agent (`general-purpose`) to review both documents for completeness, accuracy, RFC 2119 keyword compliance, and proper scenario format. **The architect MUST verify the spec uses `SPEC-XXXX` numbering, not `RFC-XXXX`.**
     - The architect MUST review and approve BOTH documents before they are finalized
     - If converting from an ADR, the spec-writer should read the ADR and use it as the basis
     - If `TeamCreate` fails, fall back to single-agent mode: draft both files directly, then self-review against the architect's checklist in the Rules section before writing.

5. **Write both files**:
   - `docs/openspec/specs/{capability-name}/spec.md`
   - `docs/openspec/specs/{capability-name}/design.md`

6. **Clean up** the team when done (if `--review` was used).

7. **Summarize** what happened (files created, spec documented, review outcome).

8. **Sprint planning** (offer after spec creation):
   After the spec is written (and approved if `--review`), offer to break it down into trackable work items. Use `AskUserQuestion` to ask: "Want me to plan a sprint from this spec? I'll break requirements into issues with acceptance criteria."

   If the user says yes:

   **8.1: Detect available issue trackers.**

   First, check for a saved preference: read `.design.json` in the project root. If it contains a `"tracker"` key, use that tracker directly (and `"tracker_config"` for settings like owner/repo). If the saved tracker's tools are no longer available, warn the user and fall through to detection.

   If no saved preference, detect trackers:
   - **Beads**: Look for a `.beads/` directory in the project root, or run `bd --version` to check if Beads is installed. Beads is the preferred tracker for AI-agent workflows.
   - **GitHub**: Check if GitHub MCP tools are available (tools matching `mcp__github__*` or `mcp__*github*`), or if `gh` CLI is available via `gh --version`.
   - **GitLab**: Check if GitLab MCP tools are available (tools matching `mcp__*gitlab*`), or if `glab` CLI is available via `glab --version`.
   - **Gitea**: Check if Gitea MCP tools are available (tools matching `mcp__gitea__*` or `mcp__*gitea*`).
   - **Jira**: Check if Jira MCP tools are available (tools matching `mcp__*jira*`).
   - **Linear**: Check if Linear MCP tools are available (tools matching `mcp__*linear*`).

   If multiple trackers are found, use `AskUserQuestion` to let the user choose. Offer to save the choice to `.design.json`.

   > **Tip**: For planning against existing specs, use `/design:plan` — it provides a dedicated workflow for breaking specs into issues with full tracker detection and preference persistence.

   **If none are found**, generate a `tasks.md` file as a durable openspec artifact instead (per ADR-0007 and SPEC-0006). Write it to `docs/openspec/specs/{capability-name}/tasks.md`, co-located with `spec.md` and `design.md`. Follow these rules:

   - **Derive tasks from spec requirements**: Read the `spec.md` just created. Each `### Requirement:` section MUST produce at least one task. Complex requirements with multiple scenarios MAY produce multiple tasks or a dedicated section.
   - **Use numbered section headings**: Group tasks under `## N. Section Title` headings (e.g., `## 1. Setup`, `## 2. Core Implementation`). Order sections so prerequisite work appears in earlier sections.
   - **Use checkbox task format**: Every task MUST be a checkbox item: `- [ ] X.Y Task description` where `X` is the section number and `Y` is the sequential task number within that section.
   - **Reference governing requirements**: Each task SHOULD reference the spec requirement or scenario it implements (e.g., "Implement REQ Tracker Detection Fallback").
   - **Keep tasks session-sized**: Each task SHALL be small enough to complete in one coding session and SHALL have a verifiable completion criterion.
   - **Completion tracking**: When a task is completed, the checkbox is updated from `- [ ]` to `- [x]`. Downstream tooling can parse these to compute progress percentage.

   **tasks.md template:**

   ```markdown
   # Tasks: {Capability Title}

   > Generated from SPEC-XXXX. See [spec.md](./spec.md) and [design.md](./design.md).

   ## 1. Setup

   - [ ] 1.1 Create new module structure (REQ "{Requirement Name}")
   - [ ] 1.2 Add dependencies to package.json

   ## 2. Core Implementation

   - [ ] 2.1 Implement data export function (REQ "{Requirement Name}")
   - [ ] 2.2 Add CSV formatting utilities (REQ "{Requirement Name}", Scenario "{Scenario Name}")

   ## 3. Testing & Validation

   - [ ] 3.1 Add unit tests for export function
   - [ ] 3.2 Validate against spec scenarios
   ```

   **8.2: Break down requirements into issues.** Read the spec.md just created and for each `### Requirement:` section:
   - Create an **epic** for the specification itself (e.g., "Implement {Capability Title}")
   - Create a **task** for each requirement, as a child of the epic
   - For complex requirements with multiple scenarios, create **sub-tasks**

   **8.3: Write acceptance criteria.** Each issue MUST include:
   - A reference to the spec and requirement number (e.g., "Implements SPEC-0003, Requirement: JWT Token Generation")
   - Acceptance criteria derived from the requirement's WHEN/THEN scenarios
   - Links to governing ADRs if the spec references them in its Overview
   - Example format:
     ```
     ## Acceptance Criteria
     - [ ] Per SPEC-0003 REQ "JWT Token Generation": tokens MUST use RS256 signing
     - [ ] Per SPEC-0003 Scenario "Token expiry": WHEN token age exceeds TTL THEN refresh endpoint returns new token
     - [ ] Governing: ADR-0001 (chose JWT over sessions)
     ```

   **8.4: Set up dependencies.** If using Beads, use `bd dep add` to link tasks that block each other based on the requirement relationships.

   **8.5: Report the plan.** Summarize what was created: number of epics, tasks, sub-tasks, and where the user can find them.

9. **CLAUDE.md integration**: Check if this is the first spec (i.e., `docs/openspec/specs/` was just created or contains only this new directory). If so:
   - Check if a `CLAUDE.md` exists in the project root
   - If it exists, check if it already references `docs/openspec/specs/`
   - If no reference exists, ask the user: "I can add an Architecture Context section to your CLAUDE.md so future sessions know about your specs. Shall I?"
   - If the user says yes, append an `## Architecture Context` section with `- Specifications are in docs/openspec/specs/`
   - If `CLAUDE.md` doesn't exist, suggest creating one

### Team Handoff Protocol (only for `--review` mode)
1. The spec-writer writes both spec.md and design.md to the target path
2. The spec-writer sends a message to the architect: "Draft ready for review at [path]"
3. The architect reads both files, reviews against the checklist below, and either:
   a. Sends "APPROVED" to the lead, or
   b. Sends specific revision requests to the spec-writer
4. Maximum 2 revision rounds. After that, the architect approves with noted concerns.
5. The lead agent finalizes only after receiving "APPROVED"

## spec.md Template

```markdown
# SPEC-XXXX: {Capability Title}

## Overview

{Brief description of what this capability does and why it exists. If derived from an ADR, reference it here (e.g., "See ADR-0003").}

## Requirements

### Requirement: {Descriptive Name}

{Description using RFC 2119 keywords. Every normative statement MUST use SHALL, MUST, MUST NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, RECOMMENDED, or OPTIONAL per RFC 2119.}

#### Scenario: {Scenario Name}

- **WHEN** {precondition or trigger}
- **THEN** {expected outcome}

#### Scenario: {Another Scenario}

- **WHEN** {precondition or trigger}
- **THEN** {expected outcome}

### Requirement: {Another Requirement}

{Description with RFC 2119 keywords.}

#### Scenario: {Scenario Name}

- **WHEN** {precondition or trigger}
- **THEN** {expected outcome}
```

## design.md Template

```markdown
# Design: {Capability Title}

## Context

{Background, current state, constraints, stakeholders. Reference the spec and any related ADRs.}

## Goals / Non-Goals

### Goals
- {goal 1}
- {goal 2}

### Non-Goals
- {non-goal 1}
- {non-goal 2}

## Decisions

### {Decision 1 Title}

**Choice**: {what was decided}
**Rationale**: {why this over alternatives}
**Alternatives considered**:
- {alternative A}: {why rejected}
- {alternative B}: {why rejected}

### {Decision 2 Title}

**Choice**: {what was decided}
**Rationale**: {why}

## Architecture

{High-level architecture description. MUST include at least one Mermaid diagram.}

```mermaid
{Mermaid diagram: C4 context/container for system-level, sequence for flows, ERD for data models.}
```

## Risks / Trade-offs

- **{Risk 1}** → {Mitigation}
- **{Risk 2}** → {Mitigation}

## Migration Plan

{Steps to deploy, rollback strategy if applicable. Omit if greenfield.}

## Open Questions

- {question 1}
- {question 2}
```

## Rules

- You MUST ALWAYS create BOTH spec.md AND design.md -- never one without the other
- spec.md MUST use RFC 2119 language (SHALL, MUST, MUST NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, RECOMMENDED, OPTIONAL) for ALL normative requirements
- spec.md MUST use spec numbering: SPEC-XXXX (sequential, zero-padded to 4 digits). NEVER use RFC-XXXX -- "RFC 2119" refers to the requirements language standard, NOT the spec numbering scheme
- Scenarios MUST use exactly 4 hashtags (`####`) -- using 3 hashtags or bullets will cause silent failures in downstream tooling
- Every requirement MUST have at least one scenario
- design.md focuses on HOW and WHY -- architecture and rationale, not line-by-line implementation details
- Self-review (default) or architect review (`--review`) MUST check for:
  - RFC 2119 compliance (every normative statement uses the proper keywords)
  - Scenario format correctness (exactly `####` level headings with WHEN/THEN)
  - Completeness of both documents
  - Alignment between spec requirements and design decisions
- If converting from an ADR, reference the ADR number in the spec's Overview section
- design.md MUST include at least one Mermaid architecture diagram. Prefer C4 context/container diagrams for system-level, sequence diagrams for flows, and ERDs for data models.
- When implementing code governed by this spec, agents SHOULD leave governing comments referencing the spec and requirement numbers: `// Governing: SPEC-XXXX REQ "Requirement Name", ADR-XXXX`
