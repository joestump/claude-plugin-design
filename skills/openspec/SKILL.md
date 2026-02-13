---
name: openspec
description: Create or update an OpenSpec specification. Use when the user wants to write a spec, convert an ADR to a spec, says "create a spec", "write an openspec", or approves an ADR for implementation.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, WebFetch, WebSearch, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, AskUserQuestion
argument-hint: [capability name or ADR reference]
---

# Create an OpenSpec Specification

You are creating an OpenSpec specification consisting of BOTH a `spec.md` and `design.md`.

**You MUST ALWAYS create BOTH files. Never one without the other.**

## Process

1. **Determine the capability name**: Use kebab-case (e.g., `web-dashboard`, `webhook-trigger`). If converting from an ADR, derive from the ADR title.

2. **Determine the next RFC number**: Scan `openspec/specs/` for existing spec.md files, find the highest RFC number used, and increment. RFC numbers are formatted as `RFC-XXXX` (e.g., RFC-0001). Start at RFC-0001 if none exist.

3. **Create a Claude Team** with `TeamCreate` to draft and review:
   - Spawn a **spec-writer** agent (`general-purpose`) to write both spec.md and design.md based on the user's description or ADR: `$ARGUMENTS`
   - Spawn an **architect** agent (`general-purpose`) to review both documents for completeness, accuracy, RFC 2119 compliance, and proper scenario format
   - The architect MUST review and approve BOTH documents before they are finalized
   - If converting from an ADR, the spec-writer should read the ADR and use it as the basis

4. **Write both files**:
   - `openspec/specs/{capability-name}/spec.md`
   - `openspec/specs/{capability-name}/design.md`

5. **Clean up** the team when done.

## spec.md Template

```markdown
# RFC-XXXX: {Capability Title}

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

{High-level architecture description. Use diagrams (mermaid) if helpful.}

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
- spec.md MUST use RFC numbering: RFC-XXXX (sequential, zero-padded to 4 digits)
- Scenarios MUST use exactly 4 hashtags (`####`) -- using 3 hashtags or bullets will cause silent failures in downstream tooling
- Every requirement MUST have at least one scenario
- design.md focuses on HOW and WHY -- architecture and rationale, not line-by-line implementation details
- The architect agent MUST review for:
  - RFC 2119 compliance (every normative statement uses the proper keywords)
  - Scenario format correctness (exactly `####` level headings with WHEN/THEN)
  - Completeness of both documents
  - Alignment between spec requirements and design decisions
- If converting from an ADR, reference the ADR number in the spec's Overview section
