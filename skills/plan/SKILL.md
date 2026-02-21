---
name: plan
description: Break an existing spec into trackable issues in your issue tracker. Use when the user says "plan a sprint", "create issues from spec", "break down the spec", or wants to turn requirements into tasks.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, ToolSearch
argument-hint: [spec-name or SPEC-XXXX] [--review] [--project <name>] [--no-projects] [--branch-prefix <prefix>] [--no-branches]
---

# Plan Sprint from Specification

You are breaking down an existing specification into trackable work items (epics and story-sized issues) in the user's issue tracker. Instead of creating one issue per requirement, you group related requirements into 3-4 story-sized issues by functional area, with task checklists in the issue body for requirement traceability. See ADR-0011 and SPEC-0010.

## Process

1. **Identify the target spec and parse flags**: Parse `$ARGUMENTS`.

   **Spec resolution:**
   - If a SPEC number is provided (e.g., `SPEC-0003`), find the matching spec directory by scanning `docs/openspec/specs/*/spec.md` for the SPEC number in the title.
   - If a capability directory name is provided (e.g., `web-dashboard`), look for `docs/openspec/specs/{name}/spec.md`.
   - If `$ARGUMENTS` is empty (ignoring flags), list available specs by globbing `docs/openspec/specs/*/spec.md`, read the title from each, and use `AskUserQuestion` to ask which spec to plan.
   - If the spec doesn't exist, tell the user and suggest `/design:spec` to create one.

   **Flag parsing:**
   - `--review`: Enable team review mode (see step 3).
   - `--project <name>`: Use a single combined project for all issues. Mutually exclusive with `--no-projects`.
   - `--no-projects`: Skip project creation entirely. Mutually exclusive with `--project`.
   - `--branch-prefix <prefix>`: Custom branch prefix instead of the default `feature`/`epic` prefixes.
   - `--no-branches`: Omit `### Branch` and `### PR Convention` sections from issue bodies.

   If both `--project` and `--no-projects` are provided, warn the user and use `--no-projects`.

2. **Read the spec**: Read both `docs/openspec/specs/{capability-name}/spec.md` and `docs/openspec/specs/{capability-name}/design.md` to understand the full scope of requirements, scenarios, and architecture.

3. **Choose drafting mode**: Check if `$ARGUMENTS` contains `--review`.

   **Default (no `--review`)**: Single-agent mode. Analyze the spec, detect the tracker, and create all issues directly.

   **With `--review`**: Team review mode.
   - Tell the user: "Creating a planning team to break down the spec and review the issue plan. This takes a minute or two."
   - Create a Claude Team with `TeamCreate`:
     - Spawn a **planner** agent (`general-purpose`) to analyze the spec and create the issue breakdown
     - Spawn a **reviewer** agent (`general-purpose`) to review the breakdown for completeness, proper acceptance criteria, and correct dependency ordering
     - The reviewer MUST verify that every spec requirement has at least one corresponding issue
     - If `TeamCreate` fails, fall back to single-agent mode
   - Maximum 2 revision rounds. After that, the reviewer approves with noted concerns.

4. **Detect the issue tracker**:

   **4.1: Check for saved preference.** Read `.design.json` in the project root. If it exists and contains a `"tracker"` key, use that tracker directly. If it also has `"tracker_config"`, use those settings (owner, repo, project key, etc.) to avoid re-prompting. If the saved tracker's tools are no longer available (e.g., MCP server was removed), warn the user: "Your saved tracker '{name}' is no longer available. Detecting other trackers..." and fall through to detection.

   **4.2: Detect available trackers.** Check for each tracker:
   - **Beads**: Look for a `.beads/` directory in the project root, or run `bd --version` to check if Beads is installed.
   - **GitHub**: Use `ToolSearch` to probe for MCP tools matching `github` (e.g., `mcp__*github*`), or check if `gh` CLI is available via `gh --version`.
   - **GitLab**: Use `ToolSearch` to probe for MCP tools matching `gitlab` (e.g., `mcp__*gitlab*`), or check if `glab` CLI is available via `glab --version`.
   - **Gitea**: Use `ToolSearch` to probe for MCP tools matching `gitea` (e.g., `mcp__*gitea*`), or check if `tea` CLI is available via `tea --version`.
   - **Jira**: Use `ToolSearch` to probe for MCP tools matching `jira` (e.g., `mcp__*jira*`).
   - **Linear**: Use `ToolSearch` to probe for MCP tools matching `linear` (e.g., `mcp__*linear*`).

   **4.3: Choose tracker.**
   - If multiple trackers found → use `AskUserQuestion` to let the user pick one. Include an option to save the choice as default.
   - If exactly one found → use it. Ask the user if they want to save it as default.
   - If none found → generate `tasks.md` (see step 6).

   **4.4: Save preference (if user opts in).** When the user agrees to save their tracker choice, write `.design.json` in the project root. The full schema supports these keys (all new keys are optional and backward-compatible; `null` values mean "use tracker defaults"):

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
     }
   }
   ```

   The `tracker_config` object stores tracker-specific settings so the user isn't re-prompted:
   - **GitHub/Gitea/GitLab**: `{ "owner": "...", "repo": "..." }`
   - **Jira**: `{ "project_key": "..." }`
   - **Linear**: `{ "team_id": "..." }`
   - **Beads**: `{}` (no extra config needed)

   If `.design.json` already exists with other keys, merge — don't overwrite the entire file.

5. **Create issues in the detected tracker**:

   **5.1: Create an epic.** Create an epic (or equivalent) for the specification itself, titled "Implement {Capability Title}" with a body referencing the spec number and linking to the spec/design files. Apply the `epic` label using the **try-then-create pattern**: attempt to apply the label, and if it doesn't exist, create it with color `#6E40C9` and retry. (Governing: SPEC-0011 REQ "Auto-Create Labels")

   **5.2: Group requirements into stories.** Instead of creating one issue per requirement, group all `### Requirement:` sections into 3-4 story-sized issues by functional area. This is governed by SPEC-0010 and ADR-0011.

   **Grouping process:**
   1. Scan all `### Requirement:` sections in the spec and identify the functional areas they affect (e.g., data model, API endpoints, validation, configuration, setup).
   2. Cluster requirements by functional area cohesion — requirements that affect the same part of the system belong in the same story.
   3. Apply coupling analysis — requirements that modify the same files or share data structures MUST be placed in the same story.
   4. Apply dependency ordering — prerequisites go in earlier stories, dependents in later stories.
   5. Target 3-4 stories for a spec with 10-15 requirements (3-5 requirements per story). For specs with 4 or fewer requirements, create 1-2 stories. For a single-requirement spec, create 1 story.
   6. Each story SHOULD target a PR in the 200-500 line range. This is a heuristic — functional cohesion takes priority over line-count targets. Do NOT split functionally cohesive requirements across stories solely to meet the line-count target.

   **Creating story issues:**
   - Title: a descriptive name reflecting the story's functional area (e.g., "Setup & Configuration", "Core Auth Flow", "Validation & Error Handling")
   - Body MUST include:
     - A short description of what this story implements and its governing spec/ADR references
     - A `## Requirements` section containing a task checklist (see step 5.3)
     - Acceptance criteria summarized at the end
   - **After creating the issue** (to obtain the issue number), unless `--no-branches` is set, update the issue body to append a `### Branch` section:
     - Stories: `` `feature/{issue-number}-{slug}` `` (or custom prefix from `--branch-prefix` or `.design.json` `branches.prefix`)
     - Epics: `` `epic/{issue-number}-{slug}` `` (or custom prefix from `--branch-prefix` or `.design.json` `branches.epic_prefix`)
     - The slug MUST be derived from the story title using kebab-case, max 50 chars (or `.design.json` `branches.slug_max_length`)
     - This requires a two-pass approach: create the issue first to get the number, then update the body

   **5.3: Write task checklists.** Each story issue body MUST include a `## Requirements` section with a task checklist. The format varies by tracker:

   **For GitHub, Gitea, GitLab, Jira, and Linear** — use markdown task checklists:
   ```markdown
   ## Requirements

   - [ ] **REQ "{Requirement Name}"** (SPEC-XXXX): {normative statement from the requirement}
     - WHEN {trigger from key scenario} THEN {expected outcome}
     - WHEN {trigger from another scenario} THEN {expected outcome}
   - [ ] **REQ "{Another Requirement}"** (SPEC-XXXX): {normative statement}
     - WHEN {trigger} THEN {outcome}

   ## Acceptance Criteria
   - [ ] Per SPEC-XXXX REQ "{Req 1}": {summary}
   - [ ] Per SPEC-XXXX REQ "{Req 2}": {summary}
   - [ ] Governing: ADR-XXXX ({decision title})
   ```

   - The requirement name MUST match the `### Requirement:` heading in the spec exactly
   - The SPEC reference MUST use the spec's number (e.g., `SPEC-0010`)
   - WHEN/THEN pairs MUST be derived from the requirement's scenarios, not invented
   - Every requirement in the spec MUST appear in exactly one story's task checklist

   **For Beads** — use native subtasks:
   - Create subtasks for each requirement using `bd subtask add`, linking each subtask to the parent story
   - Each subtask SHALL be titled with the requirement name
   - Each subtask body SHALL include the normative statement, WHEN/THEN scenarios, and spec reference

   After the requirements and acceptance criteria sections, unless `--no-branches` is set, append a `### PR Convention` section:
   - Include the tracker-specific close keyword referencing the story issue number
   - Include a reference to the parent epic and governing spec
   - Tracker-specific close keywords:
     - **GitHub/Gitea**: `Closes #{issue-number}`
     - **GitLab**: `Closes #{issue-number}` (in MR description)
     - **Beads**: `bd resolve`
     - **Jira**: `{PROJECT-KEY}-{number}` reference
     - **Linear**: `{TEAM}-{number}` reference
   - Use `.design.json` `pr_conventions` settings when available (close_keyword, ref_keyword, include_spec_reference)

   **5.4: Set up dependencies between stories.** Where stories have logical ordering (e.g., setup before core logic, core before extensions), set up dependency relationships between story issues using the tracker's native features. If using Beads, use `bd dep add`.

   **5.5: Gather tracker-specific config.** If the tracker requires configuration not already saved (e.g., repo owner/name for GitHub, project key for Jira), use `AskUserQuestion` to ask the user. Offer to save the config to `.design.json`.

   **5.6: Project grouping.** Unless `--no-projects` is set:
   - **Default (per-epic)**: For each epic, create a tracker-native project and add the epic and its child stories:
     - **GitHub**: Projects V2 via `gh project create` CLI or MCP tools, then `gh project item-add` to add issues. **After creating the project, MUST link it to the repository** using `gh project link {project-number} --owner {owner} --repo {owner}/{repo}` so it appears in the repository's Projects tab.
     - **Gitea**: Project via MCP tools (use `ToolSearch` to discover). MUST ensure the project is associated with the repository.
     - **GitLab**: Milestone or board
     - **Jira**: Use existing project scope (no new project needed)
     - **Linear**: Project or cycle
     - **Beads**: No-op (the epic IS the grouping)
   - **`--project <name>`**: Create a single project with the given name and add all issues to it
   - Use `ToolSearch` to discover project-creation MCP tools at runtime
   - Read `.design.json` `projects.default_mode` and `projects.project_ids` for cached settings. If a project ID is already cached for this spec, reuse it instead of creating a new one.
   - **Repository linking is critical**: For trackers that support project-repository associations (GitHub Projects V2, Gitea), the project MUST be linked to the repository after creation. Without this step, the project exists but is invisible from the repository's Projects tab.
   - **Graceful failure**: If project creation fails, warn the user but do not block issue creation. Report the failure in the final summary.

   **5.7: Workspace enrichment.** After project creation, enrich the project with navigational context and structure. Read `.design.json` `projects` configuration for custom settings (views, columns, iteration_weeks). All enrichment steps use **graceful degradation**: if a feature is unavailable for the tracker, skip that step and log "Skipped {step}: {tracker} does not support {feature}". (Governing: SPEC-0011, ADR-0012)

   **For GitHub Projects V2:**
   1. **Set project description**: A short summary referencing the spec number and capability title.
   2. **Write project README**: Use the GitHub Projects V2 GraphQL API to set the project README field. The README serves as agent-navigable context and SHALL follow this template:
      ```markdown
      # {Capability Title}
      ## Spec
      - [spec.md](docs/openspec/specs/{name}/spec.md)
      - [design.md](docs/openspec/specs/{name}/design.md)
      ## Governing ADRs
      - ADR-XXXX: {title}
      ## Key Files
      - {file}:{line} — {description}
      ## Stories
      | # | Title | Branch | Status |
      |---|-------|--------|--------|
      | #{n} | {title} | {branch} | Open |
      ## Dependencies
      - #{n} → #{m} (prerequisite)
      ```
   3. **Add iteration field**: Create a "Sprint" iteration field via GraphQL with cycle length from `.design.json` `projects.iteration_weeks` (default: 2 weeks). Assign foundation stories to Sprint 1, dependents to Sprint 2, etc.
   4. **Create named views**: Create three views via GraphQL using names from `.design.json` `projects.views` (default: "All Work" table, "Board" board, "Roadmap" roadmap). If a default "Table" view exists, rename it to the first configured view.

   **For Gitea:**
   1. **Create milestones**: One milestone per epic. Assign stories to the milestone corresponding to their epic.
   2. **Configure board columns**: Create columns from `.design.json` `projects.columns` (default: Todo, In Progress, In Review, Done).
   3. **Create native dependency links**: For each story that depends on another, create a native dependency via `POST /repos/{owner}/{repo}/issues/{index}/dependencies` (or via MCP tools discovered by `ToolSearch`).

   **For other trackers**: Skip tracker-specific enrichment. Log skipped steps in the report.

   **Auto-label creation** (cross-cutting, all trackers): When applying labels in any step (epic label, story label, spec label), use the **try-then-create pattern**: attempt to apply the label, and if the tracker returns a "label not found" error, create the label with a default color and retry. Default colors: `epic`=#6E40C9, `story`=#1D76DB, `spec`=#0E8A16, other=#CCCCCC. (Governing: SPEC-0011 REQ "Auto-Create Labels")

6. **Fallback: Generate `tasks.md`** (when no tracker is available):

   Write a `tasks.md` file to `docs/openspec/specs/{capability-name}/tasks.md`, co-located with spec.md and design.md. Follow these rules:

   - **Derive tasks from spec requirements**: Read the spec.md. Each `### Requirement:` section MUST produce at least one task. Complex requirements with multiple scenarios MAY produce multiple tasks.
   - **Use numbered section headings**: Group tasks under `## N. Section Title` headings (e.g., `## 1. Setup`, `## 2. Core Implementation`). Order sections so prerequisite work appears earlier.
   - **Use checkbox task format**: Every task MUST be a checkbox item: `- [ ] X.Y Task description` where `X` is the section number and `Y` is the sequential task number.
   - **Reference governing requirements**: Each task SHOULD reference the spec requirement or scenario it implements.
   - **Keep tasks session-sized**: Each task SHALL be small enough to complete in one coding session with a verifiable completion criterion.

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

7. **Clean up** the team when done (if `--review` was used).

8. **Report the plan.** Summarize what was created:
   - Which tracker was used (or tasks.md fallback)
   - Number of epics and stories created, with how many requirements were grouped into each story
   - Number of project groupings created (or "skipped" if `--no-projects` was set)
   - Whether branch naming conventions were included in issue bodies (or "skipped" if `--no-branches`)
   - Whether PR conventions were included in issue bodies (or "skipped" if `--no-branches`)
   - Where the user can find them
   - Suggest `/design:prime` before starting implementation so agents have architecture context

## Team Handoff Protocol (only for `--review` mode)

1. The planner creates the full story breakdown (or tasks.md draft) and sends it to the reviewer
2. The reviewer checks:
   - Every spec requirement appears in exactly one story's task checklist
   - Story groupings are functionally cohesive (coupled requirements are in the same story)
   - Task checklist items correctly reference requirement names, spec numbers, and WHEN/THEN scenarios
   - Dependency ordering between stories is logical (setup → core → extensions → testing)
   - Story scope targets 200-500 line PRs (heuristic, not hard constraint)
3. The reviewer either:
   a. Sends "APPROVED" to the lead, or
   b. Sends specific revision requests to the planner
4. Maximum 2 revision rounds. After that, the reviewer approves with noted concerns.
5. The lead agent finalizes only after receiving "APPROVED"

## Rules

- MUST read both spec.md and design.md before creating any issues
- MUST group requirements into 3-4 story-sized issues by functional area — NEVER create one issue per requirement (Governing: SPEC-0010 REQ "Requirement Grouping", ADR-0011)
- Every `### Requirement:` section in the spec MUST appear in exactly one story's task checklist
- Every story MUST contain a `## Requirements` section with a task checklist referencing the spec number, requirement names, normative statements, and WHEN/THEN scenarios
- Task checklist WHEN/THEN pairs MUST be derived from the spec's scenarios, not invented
- For Beads, MUST use native subtasks (`bd subtask add`) instead of markdown checklists
- Story groupings SHOULD target 200-500 line PRs — functional cohesion takes priority over line-count targets (Governing: SPEC-0010 REQ "PR Size Target")
- Coupled requirements (same files, shared data structures) MUST be placed in the same story (Governing: SPEC-0010 REQ "Grouping Heuristics")
- MUST use `ToolSearch` to discover tracker MCP tools at runtime — never assume specific tools are available
- MUST check `.design.json` for saved tracker preference before running detection
- MUST offer to save tracker preference when a tracker is selected for the first time
- When merging into `.design.json`, preserve existing keys — only update changed sections
- Dependency ordering between stories SHOULD reflect logical implementation order, not spec document order
- Project grouping failures MUST NOT prevent issue creation
- MUST link created projects to the repository for trackers that support project-repository associations (e.g., GitHub Projects V2 via `gh project link`, Gitea). Without linking, projects are invisible from the repository's Projects tab.
- Branch slug MUST be derived from the story title (kebab-case, max 50 chars), not invented
- PR close keywords MUST match the detected tracker
- MUST use `ToolSearch` for project tools at runtime
- `--project` and `--no-projects` are mutually exclusive; if both provided, warn and use `--no-projects`
- `--no-branches` disables both `### Branch` AND `### PR Convention` sections
- MUST use try-then-create pattern for all label applications — never fail on missing labels (Governing: SPEC-0011 REQ "Auto-Create Labels")
- MUST enrich projects after creation with descriptions, READMEs, views, iterations (GitHub) or milestones, columns, dependencies (Gitea) (Governing: SPEC-0011, ADR-0012)
- Enrichment failures MUST be skipped and reported, never fail the entire operation (Governing: SPEC-0011 REQ "Graceful Degradation")
- `.design.json` `projects.views`, `projects.columns`, `projects.iteration_weeks` are all optional with sensible defaults — do NOT overwrite existing keys when they are absent
- Story issues MUST be consumable by `/design:work` and `/design:review` — they use the same `### Branch` and `### PR Convention` structural sections (Governing: SPEC-0010 REQ "Downstream Compatibility")
