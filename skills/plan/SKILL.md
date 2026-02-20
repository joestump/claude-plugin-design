---
name: plan
description: Break an existing spec into trackable issues in your issue tracker. Use when the user says "plan a sprint", "create issues from spec", "break down the spec", or wants to turn requirements into tasks.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, ToolSearch
argument-hint: [spec-name or SPEC-XXXX] [--review]
---

# Plan Sprint from Specification

You are breaking down an existing specification into trackable work items (epics, tasks, sub-tasks) in the user's issue tracker.

## Process

1. **Identify the target spec**: Parse `$ARGUMENTS` (ignoring flags like `--review`).

   - If a SPEC number is provided (e.g., `SPEC-0003`), find the matching spec directory by scanning `docs/openspec/specs/*/spec.md` for the SPEC number in the title.
   - If a capability directory name is provided (e.g., `web-dashboard`), look for `docs/openspec/specs/{name}/spec.md`.
   - If `$ARGUMENTS` is empty (ignoring flags), list available specs by globbing `docs/openspec/specs/*/spec.md`, read the title from each, and use `AskUserQuestion` to ask which spec to plan.
   - If the spec doesn't exist, tell the user and suggest `/design:spec` to create one.

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
   - **Gitea**: Use `ToolSearch` to probe for MCP tools matching `gitea` (e.g., `mcp__*gitea*`).
   - **Jira**: Use `ToolSearch` to probe for MCP tools matching `jira` (e.g., `mcp__*jira*`).
   - **Linear**: Use `ToolSearch` to probe for MCP tools matching `linear` (e.g., `mcp__*linear*`).

   **4.3: Choose tracker.**
   - If multiple trackers found → use `AskUserQuestion` to let the user pick one. Include an option to save the choice as default.
   - If exactly one found → use it. Ask the user if they want to save it as default.
   - If none found → generate `tasks.md` (see step 6).

   **4.4: Save preference (if user opts in).** When the user agrees to save their tracker choice, write `.design.json` in the project root:

   ```json
   {
     "tracker": "{tracker-name}",
     "tracker_config": {}
   }
   ```

   The `tracker_config` object stores tracker-specific settings so the user isn't re-prompted:
   - **GitHub/Gitea/GitLab**: `{ "owner": "...", "repo": "..." }`
   - **Jira**: `{ "project_key": "..." }`
   - **Linear**: `{ "team_id": "..." }`
   - **Beads**: `{}` (no extra config needed)

   If `.design.json` already exists with other keys, merge — don't overwrite the entire file.

5. **Create issues in the detected tracker**:

   **5.1: Create an epic.** Create an epic (or equivalent) for the specification itself, titled "Implement {Capability Title}" with a body referencing the spec number and linking to the spec/design files.

   **5.2: Create tasks from requirements.** For each `### Requirement:` section in the spec:
   - Create a task as a child of the epic
   - Title: the requirement name
   - Body MUST include:
     - A reference to the spec and requirement (e.g., "Implements SPEC-0003, Requirement: JWT Token Generation")
     - Acceptance criteria derived from the requirement's WHEN/THEN scenarios
     - Links to governing ADRs if the spec references them in its Overview
   - For complex requirements with multiple scenarios, create sub-tasks for each scenario

   **5.3: Write acceptance criteria.** Each issue MUST include:
   ```
   ## Acceptance Criteria
   - [ ] Per SPEC-XXXX REQ "Requirement Name": {normative statement from requirement}
   - [ ] Per SPEC-XXXX Scenario "Scenario Name": WHEN {trigger} THEN {outcome}
   - [ ] Governing: ADR-XXXX ({decision title})
   ```

   **5.4: Set up dependencies.** Where requirements have logical ordering (e.g., setup before implementation, core before extensions), set up dependency relationships using the tracker's native features. If using Beads, use `bd dep add`.

   **5.5: Gather tracker-specific config.** If the tracker requires configuration not already saved (e.g., repo owner/name for GitHub, project key for Jira), use `AskUserQuestion` to ask the user. Offer to save the config to `.design.json`.

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
   - Number of epics, tasks, and sub-tasks created
   - Where the user can find them
   - Suggest `/design:prime` before starting implementation so agents have architecture context

## Team Handoff Protocol (only for `--review` mode)

1. The planner creates the full issue breakdown (or tasks.md draft) and sends it to the reviewer
2. The reviewer checks:
   - Every spec requirement has at least one corresponding issue/task
   - Acceptance criteria correctly reference WHEN/THEN scenarios
   - Dependency ordering is logical (setup → core → extensions → testing)
   - Issue scope is session-sized (not too large, not too granular)
3. The reviewer either:
   a. Sends "APPROVED" to the lead, or
   b. Sends specific revision requests to the planner
4. Maximum 2 revision rounds. After that, the reviewer approves with noted concerns.
5. The lead agent finalizes only after receiving "APPROVED"

## Rules

- MUST read both spec.md and design.md before creating any issues
- Every `### Requirement:` section in the spec MUST produce at least one issue/task
- Every issue MUST reference the spec number and requirement name
- Acceptance criteria MUST be derived from the spec's WHEN/THEN scenarios, not invented
- MUST use `ToolSearch` to discover tracker MCP tools at runtime — never assume specific tools are available
- MUST check `.design.json` for saved tracker preference before running detection
- MUST offer to save tracker preference when a tracker is selected for the first time
- When merging into `.design.json`, preserve existing keys — only update `tracker` and `tracker_config`
- Sub-tasks are OPTIONAL — only create them for complex requirements with 3+ scenarios
- Dependency ordering SHOULD reflect logical implementation order, not spec document order
