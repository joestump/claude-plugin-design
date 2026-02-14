---
name: init
description: Set up CLAUDE.md with design plugin references for architecture-aware sessions. Use when the user installs the plugin, says "initialize design", or wants to configure CLAUDE.md for the design plugin.
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion
argument-hint:
---

# Initialize Design Plugin

Set up the project's `CLAUDE.md` with architecture context so Claude sessions are design-aware.

## Process

1. **Check for existing CLAUDE.md**: Look for `CLAUDE.md` in the project root.

2. **If CLAUDE.md exists**:
   - Read it and check whether it already contains references to `docs/adrs/` AND `docs/openspec/specs/`
   - If BOTH references are present, report that the plugin is already configured and stop (see Output: Already Configured)
   - If references are missing, add the `## Architecture Context` section (see Content section below)
   - Do NOT duplicate content -- if the section exists but is incomplete, update it rather than appending a second copy

3. **If CLAUDE.md does not exist**:
   - Create a new `CLAUDE.md` at the project root with the `## Architecture Context` section
   - This is the expected first-run case -- do not treat it as an error

4. **Report what happened** using the appropriate output format below.

## Content to Add

Add the following `## Architecture Context` section to CLAUDE.md. If CLAUDE.md already has other content, append this section at the end.

```markdown
## Architecture Context

This project uses the [design plugin](https://github.com/joestump/claude-plugin-design) for architecture governance.

- Architecture Decision Records are in `docs/adrs/`
- Specifications are in `docs/openspec/specs/`

### Design Plugin Skills

| Skill | Purpose |
|-------|---------|
| `/design:adr` | Create a new Architecture Decision Record |
| `/design:spec` | Create a new specification |
| `/design:list` | List all ADRs and specs with status |
| `/design:status` | Update the status of an ADR or spec |
| `/design:docs` | Generate a documentation site |
| `/design:prime` | Load architecture context into session |

Run `/design:prime [topic]` at the start of a session to load relevant ADRs and specs into context.
```

## Idempotency Rules

- Before adding content, ALWAYS check if `CLAUDE.md` already contains the string `docs/adrs/` AND `docs/openspec/specs/`
- If both strings are present, do NOT modify the file -- report "already configured"
- If the `## Architecture Context` heading exists but is missing one of the references, add the missing reference to the existing section rather than creating a new section
- NEVER append a duplicate `## Architecture Context` section

## Output

### When CLAUDE.md is created (first run):

```
## Design Plugin Initialized

Created CLAUDE.md with architecture context.

### What was created:
- New CLAUDE.md at project root
- Reference to `docs/adrs/` (Architecture Decision Records)
- Reference to `docs/openspec/specs/` (OpenSpec Specifications)
- Design plugin usage hints

### Next steps:
- Create your first ADR: `/design:adr [description]`
- Create your first spec: `/design:spec [capability]`
- Prime a session with context: `/design:prime [topic]`
```

### When CLAUDE.md is updated (exists but missing references):

```
## Design Plugin Initialized

CLAUDE.md updated with architecture context.

### What was added:
- Reference to `docs/adrs/` (Architecture Decision Records)
- Reference to `docs/openspec/specs/` (OpenSpec Specifications)
- Design plugin usage hints

### Next steps:
- Create your first ADR: `/design:adr [description]`
- Create your first spec: `/design:spec [capability]`
- Prime a session with context: `/design:prime [topic]`
```

### When already configured (idempotent re-run):

```
## Design Plugin Already Configured

CLAUDE.md already contains architecture context references. No changes made.

- ADR path: docs/adrs/
- Spec path: docs/openspec/specs/
```

## Rules

- MUST be idempotent -- running twice produces no duplicate content
- MUST NOT remove or modify any existing content in CLAUDE.md
- MUST append the Architecture Context section after existing content, not prepend
- If CLAUDE.md does not exist, create it -- this is the normal first-run case, not an error
- Do NOT create `docs/adrs/` or `docs/openspec/specs/` directories -- those are created by `/design:adr` and `/design:spec` when needed
