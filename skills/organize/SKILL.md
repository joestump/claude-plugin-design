---
name: organize
description: Retroactively group existing issues into tracker-native projects. Use when the user says "organize issues", "group issues into projects", or wants to create project boards for existing sprint issues.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, ToolSearch, AskUserQuestion
argument-hint: [SPEC-XXXX or spec-name] [--project <name>] [--dry-run]
---

# Organize Issues into Projects

You are retroactively grouping existing tracker issues into tracker-native projects and enriching project workspaces. You use a three-tier intervention model that lets the operator control how invasive the changes are. See ADR-0012 and SPEC-0011.

## Process

1. **Parse arguments**: Extract from `$ARGUMENTS`:
   - Spec identifier: a SPEC number (e.g., `SPEC-0007`) or capability directory name
   - `--project <name>`: Use a single combined project with this name for all issues
   - `--dry-run`: Preview what would be created without making changes

   If no spec identifier is provided, list available specs by globbing `docs/openspec/specs/*/spec.md`, read the title from each, and use `AskUserQuestion` to ask which spec to organize.

2. **Resolve spec**: Same resolution flow as `/design:plan`:
   - If a SPEC number is provided, find the matching spec directory by scanning `docs/openspec/specs/*/spec.md` for the SPEC number in the title.
   - If a capability directory name is provided, look for `docs/openspec/specs/{name}/spec.md`.
   - If the spec doesn't exist, tell the user and suggest `/design:spec` to create one.

3. **Read spec**: Read `docs/openspec/specs/{capability-name}/spec.md` and `design.md` to understand the spec number, requirement names, and architecture.

4. **Detect tracker**: Same flow as `/design:plan`:

   **4.1: Check for saved preference.** Read `.design.json` in the project root. If it exists and contains a `"tracker"` key, use that tracker directly. Also read `projects` settings for cached project IDs and enrichment config (views, columns, iteration_weeks).

   **4.2: Detect available trackers.** If no saved preference:
   - **Beads**: Look for `.beads/` directory or run `bd --version`
   - **GitHub**: Use `ToolSearch` for MCP tools matching `github`, or check `gh` CLI
   - **GitLab**: Use `ToolSearch` for MCP tools matching `gitlab`, or check `glab` CLI
   - **Gitea**: Use `ToolSearch` for MCP tools matching `gitea`, or check `tea` CLI via `tea --version`
   - **Jira**: Use `ToolSearch` for MCP tools matching `jira`
   - **Linear**: Use `ToolSearch` for MCP tools matching `linear`

   **4.3: Choose tracker.** Same rules as plan: multiple → ask user; one → use it; none → error (projects require a tracker).

5. **Find existing issues**: Search the tracker for issues whose body references the spec number.
   - **GitHub**: `gh issue list --search "SPEC-XXXX" --json number,title,body,labels --limit 100`
   - **Gitea**: Use MCP tools (use `ToolSearch` to discover `list_repo_issues` or similar)
   - **GitLab**: Use MCP tools or `glab issue list --search "SPEC-XXXX"`
   - **Jira**: Use MCP tools to search issues with JQL containing the spec number
   - **Linear**: Use MCP tools to search issues containing the spec number
   - **Beads**: No-op — Beads epics ARE the grouping, so inform the user and exit

6. **Identify epics vs stories**: Classify each found issue:
   - **Epics**: Issues with titles starting with "Implement " or that have an `epic` label
   - **Stories**: All other issues referencing the spec

7. **Assess project state** (Governing: SPEC-0011 REQ "Organize Three-Tier Intervention"):

   For each project (existing or to-be-created), assess its current state:
   - Does the project exist? Is it linked to the repository?
   - Does it have a description? A README?
   - Does it have named views (GitHub: All Work, Board, Roadmap)?
   - Does it have an iteration/Sprint field (GitHub)?
   - Does it have board columns (Gitea: Todo, In Progress, In Review, Done)?
   - Does it have milestones for epics (Gitea)?
   - Are native dependency links set (Gitea)?
   - Are all issues correctly grouped and labeled?
   - Are `### Branch` and `### PR Convention` sections present in issue bodies?

   Present findings to the operator and offer **three intervention tiers** via `AskUserQuestion`:

   **(a) Leave as-is**: Report the current state and exit. No changes made.

   **(b) Restructure workspace only**: Add/fix project-level structure without touching any issues:
   - Create project if missing, link to repository
   - Add/update project description and README
   - Create/rename named views (GitHub)
   - Add iteration field (GitHub)
   - Create board columns (Gitea)
   - Create milestones (Gitea)
   - Add all issues to the project (if not already)

   **(c) Complete refactor**: All tier (b) changes PLUS:
   - Re-group issues across epics (move misplaced stories)
   - Fix/add labels using try-then-create pattern (epic=#6E40C9, story=#1D76DB, spec=#0E8A16)
   - Create native dependency links (Gitea)
   - Update issue bodies with `### Branch` and `### PR Convention` sections (if missing)

8. **Execute chosen tier**: Carry out the selected intervention. All enrichment steps use **graceful degradation**: if a feature is unavailable for the tracker, skip and log "Skipped {step}: {tracker} does not support {feature}".

   **GitHub workspace enrichment (tier b/c):**
   - Set project description referencing the spec
   - Write project README via GraphQL (agent-navigable context with spec refs, ADR links, story index, dependencies)
   - Create "Sprint" iteration field via GraphQL with cycle length from `.design.json` `projects.iteration_weeks` (default: 2 weeks)
   - Create named views via GraphQL using `.design.json` `projects.views` (default: "All Work" table, "Board" board, "Roadmap" roadmap)

   **Gitea workspace enrichment (tier b/c):**
   - Create milestones (one per epic), assign stories to milestones
   - Configure board columns from `.design.json` `projects.columns` (default: Todo, In Progress, In Review, Done)

   **Tier (c) additional steps:**
   - Re-label issues using try-then-create pattern
   - Create Gitea native dependency links
   - Add `### Branch` / `### PR Convention` to issue bodies that lack them (same logic as `/design:enrich`)

9. **`--dry-run` mode**: If `--dry-run` is set, report the assessment and what WOULD be done at each tier, but don't modify anything.

10. **Report results**: Provide a summary:
    - Tier selected and actions taken
    - Number of projects created, enriched, or reused
    - Number of issues organized/updated
    - Skipped enrichments (graceful degradation)
    - Any failures encountered (with issue numbers)
    - Whether `.design.json` was updated with project IDs

## .design.json Schema Reference

This skill reads and writes the `projects` section of `.design.json`:

```json
{
  "tracker": "github",
  "tracker_config": { "owner": "...", "repo": "..." },
  "projects": {
    "default_mode": "per-epic",
    "project_ids": { "SPEC-0007": "PVT_kwDOABCDEF" },
    "views": ["All Work", "Board", "Roadmap"],
    "columns": ["Todo", "In Progress", "In Review", "Done"],
    "iteration_weeks": 2
  }
}
```

All keys under `projects` are optional with sensible defaults. When writing, merge into the existing file — do not overwrite other sections. Do NOT overwrite existing keys when new keys are absent.

## Rules

- Tier (a) MUST NOT modify anything — report only
- Tier (b) MUST NOT modify issue content — only project-level structure (views, README, columns, iterations, milestones)
- Tier (c) MAY modify issue content (labels, body sections, grouping)
- MUST present the three-tier choice to the operator before making changes (Governing: SPEC-0011 REQ "Organize Three-Tier Intervention")
- MUST skip projects that already exist (idempotent)
- MUST use `ToolSearch` for project tools at runtime
- Failures MUST be reported but MUST NOT stop processing remaining issues
- MUST check `.design.json` for saved tracker preference and cached project IDs before creating
- When merging into `.design.json`, preserve existing keys
- MUST link created projects to the repository for trackers that support project-repository associations (e.g., GitHub Projects V2 via `gh project link`, Gitea)
- MUST use try-then-create pattern for all label applications in tier (c) (Governing: SPEC-0011 REQ "Auto-Create Labels")
- MUST degrade gracefully when tracker features are unavailable — skip and report, never fail (Governing: SPEC-0011 REQ "Graceful Degradation")
- No `--review` support (utility skill)
