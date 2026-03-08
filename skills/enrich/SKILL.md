---
name: enrich
description: Retroactively add branch naming and PR convention sections to existing issue bodies. Use when the user says "add branch names to issues", "enrich issues", or wants to add developer workflow conventions to existing issues.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, ToolSearch, AskUserQuestion
argument-hint: [SPEC-XXXX or spec-name] [--branch-prefix <prefix>] [--dry-run]
---

# Enrich Issues with Developer Workflow Conventions

You are retroactively adding `### Branch` and `### PR Convention` sections to existing tracker issues that were created by `/design:plan` (or manually) for a given spec.

## Process

1. **Parse arguments**: Extract from `$ARGUMENTS`:
   - Spec identifier: a SPEC number (e.g., `SPEC-0007`) or capability directory name
   - `--branch-prefix <prefix>`: Custom branch prefix instead of the default `feature`/`epic` prefixes
   - `--dry-run`: Preview what would be added without modifying any issues

   If no spec identifier is provided, list available specs by globbing `docs/openspec/specs/*/spec.md`, read the title from each, and use `AskUserQuestion` to ask which spec to enrich.

2. **Resolve spec**: Follow the plugin's `references/shared-patterns.md` § "Spec Resolution".

3. **Read spec**: Read `docs/openspec/specs/{capability-name}/spec.md` to get the spec number and understand the requirements.

4. **Detect tracker**: Follow the "Tracker Detection" flow in the plugin's `references/shared-patterns.md`. If no tracker is found, error — enrichment requires a tracker.

5. **Read `.claude-plugin-design.json` branch/PR config**: Check for saved preferences:

   ```json
   {
     "branches": {
       "enabled": true,
       "prefix": null,
       "epic_prefix": "epic",
       "slug_max_length": 50
     },
     "pr_conventions": {
       "enabled": true,
       "close_keyword": null,
       "ref_keyword": "Part of",
       "include_spec_reference": true
     }
   }
   ```

   - If `branches.enabled` is `false`, skip `### Branch` sections entirely
   - If `pr_conventions.enabled` is `false`, skip `### PR Convention` sections entirely
   - Use `branches.prefix` as the default task prefix (overridden by `--branch-prefix`)
   - Use `branches.epic_prefix` for epic issues (default: `epic`)
   - Use `branches.slug_max_length` for slug truncation (default: 50)
   - Use `pr_conventions.close_keyword` if set; otherwise use tracker-specific defaults
   - Use `pr_conventions.ref_keyword` for epic/spec references (default: "Part of")

6. **Find existing issues**: Search the tracker for issues referencing the spec number.
   - **GitHub**: `gh issue list --search "SPEC-XXXX" --json number,title,body,labels --limit 100`
   - **Gitea**: Use MCP tools (discovered via `ToolSearch`)
   - **GitLab**: Use MCP tools or `glab issue list --search "SPEC-XXXX"`
   - **Jira**: Use MCP tools with JQL containing the spec number
   - **Linear**: Use MCP tools to search issues containing the spec number
   - **Beads**: Use `bd list` or similar to find tasks referencing the spec

7. **For each issue**:

   a. Read the current issue body (via tracker API or CLI).

   b. Check if a `### Branch` section already exists in the body. If yes, skip adding it (idempotent).

   c. Check if a `### PR Convention` section already exists in the body. If yes, skip adding it (idempotent).

   d. Determine the slug from the issue title:
      - Convert to kebab-case (lowercase, spaces and special characters replaced with hyphens)
      - Truncate to max 50 chars (or `branches.slug_max_length` from `.claude-plugin-design.json`)
      - Remove trailing hyphens after truncation

   e. Determine if the issue is an epic:
      - Title starts with "Implement " → epic
      - Has an `epic` label → epic
      - Otherwise → task

   f. If `### Branch` section is missing and `branches.enabled` is not `false`, append:
      ```
      ### Branch
      `{prefix}/{issue-number}-{slug}`
      ```
      Where `{prefix}` is:
      - For epics: `epic` (or `.claude-plugin-design.json` `branches.epic_prefix` or `--branch-prefix`)
      - For tasks: `feature` (or `.claude-plugin-design.json` `branches.prefix` or `--branch-prefix`)

   g. If `### PR Convention` section is missing and `pr_conventions.enabled` is not `false`, append:
      ```
      ### PR Convention
      {close-keyword} #{issue-number}
      {ref-keyword} #{epic-number} (SPEC-XXXX)
      ```
      Tracker-specific close keywords: see the plugin's `references/shared-patterns.md` § "PR Close Keywords".

   h. **Auto-create labels** (Governing: SPEC-0011 REQ "Auto-Create Labels"): When applying labels like `epic` or `story` during enrichment, use the **try-then-create pattern**: attempt to apply the label, and if the tracker returns a "label not found" error, create the label with a default color (epic=#6E40C9, story=#1D76DB, spec=#0E8A16, other=#CCCCCC) and retry.

   i. Update the issue body with the appended sections using the tracker API or CLI.

8. **`--dry-run` mode**: If `--dry-run` is set, show what sections would be added to which issues but don't modify anything:
   - For each issue: show the issue number, title, and which sections would be added
   - Show the exact content that would be appended
   - Indicate issues that would be skipped (already have the sections)

9. **Report results**: Provide a summary:
   - Number of issues enriched (had sections added)
   - Number of issues skipped (already had sections)
   - Any failures encountered (with issue numbers and error details)
   - Breakdown: how many got `### Branch`, how many got `### PR Convention`

## Config Reference

This skill reads the `branches` and `pr_conventions` sections of `.claude-plugin-design.json`. See the plugin's `references/shared-patterns.md` § "Config Schema" for the full schema and § "Branch Naming Conventions" and "PR Close Keywords" for conventions.

## Rules

- MUST NOT overwrite existing `### Branch` or `### PR Convention` sections (idempotent)
- Branch slug MUST be derived from issue title (kebab-case, max 50 chars), not invented
- PR close keywords MUST match the detected tracker
- MUST use `ToolSearch` for tracker tools at runtime
- Failures on individual issues MUST be reported but MUST NOT stop processing remaining issues
- MUST check `.claude-plugin-design.json` for saved tracker preference and branch/PR config before processing
- MUST use try-then-create pattern for all label applications — never fail on missing labels (Governing: SPEC-0011 REQ "Auto-Create Labels")
- No `--review` support (utility skill)
