---
name: organize
description: Retroactively group existing issues into tracker-native projects. Use when the user says "organize issues", "group issues into projects", or wants to create project boards for existing sprint issues.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, ToolSearch, AskUserQuestion
argument-hint: [SPEC-XXXX or spec-name] [--project <name>] [--dry-run]
---

# Organize Issues into Projects

You are retroactively grouping existing tracker issues into tracker-native projects (GitHub Projects V2, Gitea projects, GitLab milestones/boards, Linear projects/cycles, etc.).

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

3. **Read spec**: Read `docs/openspec/specs/{capability-name}/spec.md` to understand the spec number and requirement names.

4. **Detect tracker**: Same flow as `/design:plan`:

   **4.1: Check for saved preference.** Read `.design.json` in the project root. If it exists and contains a `"tracker"` key, use that tracker directly. Also read `projects` settings for cached project IDs.

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

6. **Identify epics vs tasks**: Classify each found issue:
   - **Epics**: Issues with titles starting with "Implement " or that have an `epic` label
   - **Tasks**: All other issues referencing the spec

7. **Create project groupings**:

   **Default (no `--project`)**: For each epic, create one tracker-native project:
   - **GitHub**: `gh project create --owner {owner} --title "{Epic Title}"` then `gh project item-add` for the epic and its associated tasks. **After creating the project, MUST link it to the repository** using `gh project link {project-number} --owner {owner} --repo {owner}/{repo}` so it appears in the repository's Projects tab.
   - **Gitea**: Use MCP tools (discovered via `ToolSearch`) to create a project and add issues. MUST ensure the project is associated with the repository, not just the organization.
   - **GitLab**: Create a milestone or board and assign issues to it.
   - **Jira**: Use existing project scope (no new project needed — issues are already scoped).
   - **Linear**: Create a project or cycle and add issues.
   - **Beads**: No-op (the epic IS the grouping).

   **With `--project <name>`**: Create a single project with the given name and add ALL found issues.

   Check `.design.json` `projects.project_ids` for cached project IDs keyed by spec number. If a project already exists for this spec, skip creation and just ensure all issues are added to it (idempotent).

   Use `ToolSearch` to discover project-creation MCP tools at runtime.

   After successful project creation, offer to save the project ID to `.design.json` `projects.project_ids`.

   **Repository linking is critical**: For trackers that support project-repository associations (GitHub Projects V2, Gitea), the project MUST be linked to the repository after creation. Without this step, the project exists but is invisible from the repository's Projects tab, making it difficult for developers to discover.

8. **`--dry-run` mode**: If `--dry-run` is set, report what WOULD be created but don't actually create anything:
   - List the projects that would be created (with names)
   - List which issues would be added to each project
   - Show whether any cached project IDs would be reused

9. **Report results**: Provide a summary:
   - Number of projects created (or reused)
   - Number of issues organized into projects
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
    "project_ids": { "SPEC-0007": "PVT_kwDOABCDEF" }
  }
}
```

All keys under `projects` are optional. When writing, merge into the existing file — do not overwrite other sections.

## Rules

- MUST NOT modify issue content — only create projects and add issues to them
- MUST skip projects that already exist (idempotent)
- MUST use `ToolSearch` for project tools at runtime
- Failures MUST be reported but MUST NOT stop processing remaining issues
- MUST check `.design.json` for saved tracker preference and cached project IDs before creating
- When merging into `.design.json`, preserve existing keys
- MUST link created projects to the repository for trackers that support project-repository associations (e.g., GitHub Projects V2 via `gh project link`, Gitea). Projects that are not linked to the repository will not appear in the repository's Projects tab, making them effectively invisible to developers browsing the repo.
- No `--review` support (utility skill)
