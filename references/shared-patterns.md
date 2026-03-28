# Shared Patterns Reference

Patterns used across multiple design plugin skills. Skills reference specific sections by heading instead of duplicating the content.

## Spec Resolution

Resolve a spec identifier to a file path:

- If a SPEC number is provided (e.g., `SPEC-0003`), find the matching spec directory by scanning `docs/openspec/specs/*/spec.md` for the SPEC number in the title.
- If a capability directory name is provided (e.g., `web-dashboard`), look for `docs/openspec/specs/{name}/spec.md`.
- If no spec identifier is provided (ignoring flags), list available specs by globbing `docs/openspec/specs/*/spec.md`, read the title from each, and use `AskUserQuestion` to ask which spec to use.
- If the spec doesn't exist, tell the user and suggest `/design:spec` to create one.

## Tracker Detection

### Check for Saved Preference

Read `.claude-plugin-design.json` in the project root. If it exists and contains a `"tracker"` key, use that tracker directly. If it also has `"tracker_config"`, use those settings (owner, repo, project key, etc.). If the saved tracker's tools are no longer available, warn the user and fall through to detection.

### Detect Available Trackers

- **Beads**: Look for a `.beads/` directory in the project root, or run `bd --version`.
- **GitHub**: Use `ToolSearch` to probe for MCP tools matching `github`, or check `gh` CLI via `gh --version`.
- **GitLab**: Use `ToolSearch` to probe for MCP tools matching `gitlab`, or check `glab` CLI via `glab --version`.
- **Gitea**: Use `ToolSearch` to probe for MCP tools matching `gitea`, or check `tea` CLI via `tea --version`.
- **Jira**: Use `ToolSearch` to probe for MCP tools matching `jira`.
- **Linear**: Use `ToolSearch` to probe for MCP tools matching `linear`.

### Choose Tracker

- Multiple trackers found → use `AskUserQuestion` to let the user pick. Include an option to save the choice as default.
- Exactly one found → use it. Ask if they want to save it as default.
- None found → generate `tasks.md` fallback (if applicable) or error.

### Save Preference

When the user agrees to save, write `.claude-plugin-design.json` in the project root. If the file already exists with other keys, merge — don't overwrite.

## Config Schema (`.claude-plugin-design.json`)

```json
{
  "tracker": "{tracker-name}",
  "tracker_config": {},
  "projects": {
    "default_mode": "per-epic",
    "project_ids": {},
    "views": ["All Work", "Board", "Roadmap"],
    "columns": ["Todo", "In Progress", "In Review", "Done"],
    "iteration_weeks": 2
  },
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
  },
  "worktrees": {
    "base_dir": null,
    "max_agents": 3,
    "auto_cleanup": false,
    "pr_mode": "ready"
  },
  "review": {
    "max_pairs": 2,
    "merge_strategy": "squash",
    "auto_cleanup": false
  }
}
```

**Tracker-specific `tracker_config`:**
- **GitHub/Gitea/GitLab**: `{ "owner": "...", "repo": "..." }`
- **Jira**: `{ "project_key": "..." }`
- **Linear**: `{ "team_id": "..." }`
- **Beads**: `{}` (no extra config needed)

All keys are optional and backward-compatible. `null` values mean "use tracker defaults." When writing, merge into the existing file — do not overwrite other sections.

## Team Handoff Protocol

Used when a skill supports `--review` mode with a drafter/auditor and reviewer agent pair.

1. The drafter writes the output to the target path
2. The drafter sends a message to the reviewer: "Draft ready for review at [path]"
3. The reviewer reads the output, reviews against the skill's checklist, and either:
   a. Sends "APPROVED" to the lead, or
   b. Sends specific revision requests to the drafter
4. Maximum 2 revision rounds. After that, the reviewer approves with noted concerns.
5. The lead agent finalizes only after receiving "APPROVED"

## Try-Then-Create Label Pattern

When applying labels (e.g., `epic`, `story`, `spec`), attempt to apply the label first. If the tracker returns "label not found", create the label with a default color and retry.

Default colors: `epic`=#6E40C9, `story`=#1D76DB, `spec`=#0E8A16, other=#CCCCCC.

## Branch Naming Conventions

- **Stories**: `feature/{issue-number}-{slug}` (or custom prefix from `--branch-prefix` or config `branches.prefix`)
- **Epics**: `epic/{issue-number}-{slug}` (or custom prefix from config `branches.epic_prefix`)
- Slug: derived from title, kebab-case, max 50 chars (or config `branches.slug_max_length`), trailing hyphens removed after truncation.
- Requires two-pass: create the issue first to get the number, then update the body with the branch section.

## PR Close Keywords

Tracker-specific close keywords (or use config `pr_conventions.close_keyword`):

- **GitHub/Gitea**: `Closes #{issue-number}`
- **GitLab**: `Closes #{issue-number}` (in MR description)
- **Beads**: `bd resolve`
- **Jira**: `{PROJECT-KEY}-{number}` reference
- **Linear**: `{TEAM}-{number}` reference

## Foundation Story Detection

<!-- Governing: ADR-0017 (Parallel Agent Coordination), SPEC-0015 REQ "Foundation Story Detection" -->

Algorithm for identifying shared code across stories during `/design:plan` requirement grouping. This pattern prevents duplicate implementations by extracting shared types, packages, and helpers into dedicated foundation stories that merge before feature work begins.

### When to Apply

Run this analysis after grouping requirements into stories (step 5.2 of `/design:plan`) and before creating issue bodies. It applies to any sprint with 2+ stories.

### Algorithm

1. **Extract planned artifacts per story.** For each story, list the types, structs, interfaces, helper functions, config fields, and packages it will need to create or modify. Derive these from:
   - The spec requirements assigned to the story
   - The existing codebase (use `Grep` to find current definitions)
   - The design.md architecture description (file paths, component references)

2. **Build a cross-reference matrix.** Create a mapping of `artifact → [stories that need it]`. Any artifact needed by 2+ stories is a **shared dependency**.

3. **Cluster shared dependencies into foundation stories.** Group related shared artifacts into coherent foundation stories:
   - **Type cluster**: Shared structs, interfaces, and their associated methods → one foundation story (e.g., "Extract PublicLink type and store interface")
   - **Helper cluster**: Shared utility functions and HTTP clients → one foundation story (e.g., "Extract shared LLM client package")
   - **Config/wiring cluster**: When multiple features need new config fields in the same struct or new route registrations in the same file → one "wiring story" that stubs all fields and routes (e.g., "Stub config fields and route registration for sprint N")

4. **Label and order.** Each foundation story gets:
   - The `foundation` label (color: `#D4A017`, using try-then-create pattern)
   - Dependency declarations: `blocks: #X, #Y, #Z` for each feature story that depends on it
   - Schedule position: foundation stories are placed first in the sprint backlog

5. **Output the dependency graph.** Show the user which feature stories depend on which foundation stories, using a visual format:
   ```
   Foundation → Feature dependencies:
     #281 [foundation] Extract shared types → blocks #283, #284, #285
     #282 [foundation] Stub config + routes → blocks #283, #286
   ```

### Edge Cases

- **Single-story sprints**: Skip foundation detection (no cross-story sharing possible).
- **No shared artifacts detected**: Report "No shared dependencies found — all stories are independent." and proceed without foundation stories.
- **Circular dependencies among shared artifacts**: Merge related artifacts into a single foundation story rather than creating circular foundation dependencies.

## Hotspot Analysis

<!-- Governing: ADR-0017 (Parallel Agent Coordination), SPEC-0015 REQ "Hotspot Analysis" -->

Algorithm for analyzing recent git history to identify files that are frequent sources of merge conflicts. Files modified by a high percentage of recent PRs are classified as "hotspots," and stories touching them are serialized to prevent parallel modification.

### When to Apply

Run this analysis during `/design:plan` after requirement grouping and foundation story detection, before making parallelization decisions. It is most valuable for projects with active parallel development.

### Algorithm

1. **Gather recent merge history.** Use two windows and take the larger result set:
   ```bash
   # Last 50 merge commits
   git log --name-only --pretty=format:"---COMMIT---" --merges -50
   # Last 30 days of merge commits
   git log --name-only --pretty=format:"---COMMIT---" --merges --since="30 days ago"
   ```

2. **Parse PR file modifications.** Split the output by `---COMMIT---` delimiter. For each merge commit, collect the list of modified files. Ignore empty entries and the delimiter line itself.

3. **Calculate per-file frequency.** For each file that appears in any merge commit:
   - Count the number of distinct merge commits (PRs) that modified it
   - Calculate: `frequency = count / total_merge_commits * 100`

4. **Apply hotspot threshold.** The default threshold is **50%**. Check for an override:
   - Read CLAUDE.md `## Design Plugin Configuration` section for `hotspot-threshold: N%`
   - If present, use that value instead of 50%

   Files with `frequency > threshold` are classified as **hotspot files**.

5. **Report hotspots.** Display findings to the user:
   ```
   ### Hotspot Analysis (threshold: 50%)
   - `cmd/server/main.go` — 7/10 PRs (70%) — HOTSPOT
   - `internal/config/config.go` — 6/10 PRs (60%) — HOTSPOT
   - `internal/store/store.go` — 3/10 PRs (30%) — below threshold
   ```

6. **Apply serialization constraints.** For each story that modifies a hotspot file:
   - Mark the story with a serialization constraint
   - Add a `### Serialization Constraint` section to the issue body:
     ```markdown
     ### Serialization Constraint
     This story modifies hotspot file(s) and MUST NOT run in parallel with other stories touching the same file(s):
     - `cmd/server/main.go` (70% of recent PRs)
     ```
   - In the dependency graph, chain hotspot-touching stories sequentially rather than scheduling them for parallel execution

7. **Handle no-hotspot case.** If no files exceed the threshold, report: "No hotspots detected — stories will be parallelized based on dependency analysis alone." and apply no serialization constraints.

### Configuration

The following settings can be placed in CLAUDE.md under `## Design Plugin Configuration`:

```markdown
## Design Plugin Configuration

- **Hotspot threshold**: 40%
- **Max parallel agents**: 4
```

The hotspot threshold accepts integer values from 1-100 representing the percentage of recent PRs that must touch a file for it to be classified as a hotspot. Lower values are more conservative (more files flagged); higher values are more permissive.

## Severity Assignment Rules

- MUST, SHALL, or MUST NOT violation → `[CRITICAL]`
- SHOULD or RECOMMENDED violation → `[WARNING]`
- Coverage gap (no governing artifact) → `[INFO]`
- Stale artifact (status doesn't match reality) → `[WARNING]`
- ADR vs. Spec inconsistency → `[CRITICAL]`
- Contradictory requirement within same spec → `[CRITICAL]`
- Inconsistent RFC 2119 keyword usage → `[INFO]`
- Untestable or ambiguous requirement → `[INFO]`

## Epic vs Story Classification

- **Epics**: Issues with titles starting with "Implement " or that have an `epic` label
- **Stories**: All other issues referencing the spec

## Issue Search by Spec

To find existing issues referencing a spec:

- **GitHub**: `gh issue list --search "SPEC-XXXX" --json number,title,body,labels --limit 100`
- **Gitea**: Use MCP tools (discovered via `ToolSearch`)
- **GitLab**: Use MCP tools or `glab issue list --search "SPEC-XXXX"`
- **Jira**: Use MCP tools with JQL containing the spec number
- **Linear**: Use MCP tools to search issues containing the spec number
- **Beads**: Use `bd list` or similar

## PR Search by Spec

To find open PRs referencing a spec:

- **GitHub**: `gh pr list --search "SPEC-XXXX" --json number,title,headRefName,body,url --limit 50` or `gh pr view {number} --json ...` for specific PRs
- **Gitea**: Use MCP tools (discovered via `ToolSearch`) to list pull requests
- **GitLab**: Use MCP tools or `glab mr list --search "SPEC-XXXX"`
