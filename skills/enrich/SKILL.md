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

2. **Resolve spec**: Same resolution flow as `/design:plan`:
   - If a SPEC number is provided, find the matching spec directory by scanning `docs/openspec/specs/*/spec.md` for the SPEC number in the title.
   - If a capability directory name is provided, look for `docs/openspec/specs/{name}/spec.md`.
   - If the spec doesn't exist, tell the user and suggest `/design:spec` to create one.

3. **Read spec**: Read `docs/openspec/specs/{capability-name}/spec.md` to get the spec number and understand the requirements.

4. **Detect tracker**: Same flow as `/design:plan`:

   **4.1: Check for saved preference.** Read `.design.json` in the project root. If it exists and contains a `"tracker"` key, use that tracker directly.

   **4.2: Detect available trackers.** If no saved preference, probe for each tracker using `ToolSearch` and CLI checks (same as plan step 4.2).

   **4.3: Choose tracker.** Same rules as plan: multiple → ask user; one → use it; none → error (enrichment requires a tracker).

5. **Read `.design.json` branch/PR config**: Check for saved preferences:

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
      - Truncate to max 50 chars (or `branches.slug_max_length` from `.design.json`)
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
      - For epics: `epic` (or `.design.json` `branches.epic_prefix` or `--branch-prefix`)
      - For tasks: `feature` (or `.design.json` `branches.prefix` or `--branch-prefix`)

   g. If `### PR Convention` section is missing and `pr_conventions.enabled` is not `false`, append:
      ```
      ### PR Convention
      {close-keyword} #{issue-number}
      {ref-keyword} #{epic-number} (SPEC-XXXX)
      ```
      Tracker-specific close keywords (or use `.design.json` `pr_conventions.close_keyword`):
      - **GitHub/Gitea**: `Closes #{issue-number}`
      - **GitLab**: `Closes #{issue-number}` (in MR description)
      - **Beads**: `bd resolve`
      - **Jira**: `{PROJECT-KEY}-{number}` reference
      - **Linear**: `{TEAM}-{number}` reference

   h. Update the issue body with the appended sections using the tracker API or CLI.

8. **`--dry-run` mode**: If `--dry-run` is set, show what sections would be added to which issues but don't modify anything:
   - For each issue: show the issue number, title, and which sections would be added
   - Show the exact content that would be appended
   - Indicate issues that would be skipped (already have the sections)

9. **Report results**: Provide a summary:
   - Number of issues enriched (had sections added)
   - Number of issues skipped (already had sections)
   - Any failures encountered (with issue numbers and error details)
   - Breakdown: how many got `### Branch`, how many got `### PR Convention`

## .design.json Schema Reference

This skill reads the `branches` and `pr_conventions` sections of `.design.json`:

```json
{
  "tracker": "github",
  "tracker_config": { "owner": "...", "repo": "..." },
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

All keys are optional and backward-compatible. `null` values mean "use tracker defaults."

## Rules

- MUST NOT overwrite existing `### Branch` or `### PR Convention` sections (idempotent)
- Branch slug MUST be derived from issue title (kebab-case, max 50 chars), not invented
- PR close keywords MUST match the detected tracker
- MUST use `ToolSearch` for tracker tools at runtime
- Failures on individual issues MUST be reported but MUST NOT stop processing remaining issues
- MUST check `.design.json` for saved tracker preference and branch/PR config before processing
- No `--review` support (utility skill)
