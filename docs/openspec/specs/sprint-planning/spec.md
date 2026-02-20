# SPEC-0007: Sprint Planning

## Overview

A standalone skill that resolves an existing specification, detects the user's issue tracker, and decomposes spec requirements into trackable work items (epics, tasks, sub-tasks). Supports six trackers (Beads, GitHub, GitLab, Gitea, Jira, Linear), persists tracker preferences to `.design.json`, and falls back to `tasks.md` generation when no tracker is available. See ADR-0008.

## Requirements

### Requirement: Spec Resolution

The `/design:plan` skill SHALL accept a spec identifier as its primary argument. The identifier MAY be a SPEC number (e.g., `SPEC-0003`) or a capability directory name (e.g., `web-dashboard`). The skill MUST resolve the identifier to the corresponding spec directory under `docs/openspec/specs/`.

#### Scenario: Resolution by SPEC number

- **WHEN** a user runs `/design:plan SPEC-0003`
- **THEN** the skill SHALL scan `docs/openspec/specs/*/spec.md` for a file whose title contains `SPEC-0003` and use the containing directory

#### Scenario: Resolution by capability name

- **WHEN** a user runs `/design:plan web-dashboard`
- **THEN** the skill SHALL look for `docs/openspec/specs/web-dashboard/spec.md` and use that directory

#### Scenario: No argument provided

- **WHEN** a user runs `/design:plan` with no spec identifier (ignoring flags)
- **THEN** the skill SHALL list all available specs by globbing `docs/openspec/specs/*/spec.md`, reading each title, and using `AskUserQuestion` to let the user choose

#### Scenario: Spec not found

- **WHEN** the provided identifier does not match any existing spec
- **THEN** the skill SHALL inform the user and suggest running `/design:spec` to create one

### Requirement: Spec Reading

The skill MUST read both `spec.md` and `design.md` from the resolved spec directory before creating any issues. The skill MUST NOT create issues based on partial information.

#### Scenario: Both files read

- **WHEN** the skill resolves a spec directory
- **THEN** it SHALL read both `docs/openspec/specs/{capability-name}/spec.md` and `docs/openspec/specs/{capability-name}/design.md` to understand the full scope of requirements, scenarios, and architecture

### Requirement: Tracker Detection

The skill SHALL detect available issue trackers in the following order. Detection MUST use `ToolSearch` to probe for MCP tools and CLI availability checks via Bash.

The six supported trackers are:

1. **Beads**: Detect via `.beads/` directory in the project root or `bd --version` CLI check
2. **GitHub**: Detect via `ToolSearch` for `mcp__*github*` tools or `gh --version` CLI check
3. **GitLab**: Detect via `ToolSearch` for `mcp__*gitlab*` tools or `glab --version` CLI check
4. **Gitea**: Detect via `ToolSearch` for `mcp__*gitea*` tools
5. **Jira**: Detect via `ToolSearch` for `mcp__*jira*` tools
6. **Linear**: Detect via `ToolSearch` for `mcp__*linear*` tools

#### Scenario: Multiple trackers detected

- **WHEN** more than one tracker is detected
- **THEN** the skill SHALL use `AskUserQuestion` to let the user pick one and SHALL include an option to save the choice as the default

#### Scenario: Exactly one tracker detected

- **WHEN** exactly one tracker is detected
- **THEN** the skill SHALL use it and ask the user if they want to save it as the default

#### Scenario: No tracker detected

- **WHEN** no tracker is detected
- **THEN** the skill SHALL fall back to generating `tasks.md` per the tasks.md fallback requirement

### Requirement: Preference Persistence

The skill SHALL persist tracker preferences to `.design.json` in the project root when the user opts in. On subsequent invocations, the skill MUST check for a saved preference before running tracker detection.

#### Scenario: Saved preference exists and tracker is available

- **WHEN** `.design.json` exists with a `"tracker"` key and the saved tracker's tools are still available
- **THEN** the skill SHALL use the saved tracker and configuration directly without prompting

#### Scenario: Saved preference exists but tracker is unavailable

- **WHEN** `.design.json` exists with a `"tracker"` key but the saved tracker's tools are no longer available
- **THEN** the skill SHALL warn the user ("Your saved tracker '{name}' is no longer available. Detecting other trackers...") and fall through to tracker detection

#### Scenario: Saving preference

- **WHEN** the user agrees to save their tracker choice
- **THEN** the skill SHALL write or merge into `.design.json`:
  ```json
  {
    "tracker": "{tracker-name}",
    "tracker_config": {}
  }
  ```
  The `tracker_config` object SHALL store tracker-specific settings:
  - GitHub/Gitea/GitLab: `{ "owner": "...", "repo": "..." }`
  - Jira: `{ "project_key": "..." }`
  - Linear: `{ "team_id": "..." }`
  - Beads: `{}` (no extra config needed)

#### Scenario: Merging with existing .design.json

- **WHEN** `.design.json` already exists with other keys
- **THEN** the skill SHALL merge the tracker keys without overwriting the entire file

### Requirement: Issue Creation Flow

The skill SHALL create issues following an epic-to-task-to-sub-task hierarchy derived from the spec's requirements.

#### Scenario: Epic creation

- **WHEN** the skill begins creating issues for a spec
- **THEN** it SHALL first create an epic (or tracker equivalent) titled "Implement {Capability Title}" with a body referencing the spec number and linking to the spec and design files

#### Scenario: Task creation from requirements

- **WHEN** the spec contains `### Requirement:` sections
- **THEN** the skill SHALL create one task per requirement as a child of the epic, with the requirement name as the title

#### Scenario: Acceptance criteria

- **WHEN** a task is created for a requirement
- **THEN** the task body MUST include acceptance criteria derived from the requirement's WHEN/THEN scenarios in the format:
  ```
  ## Acceptance Criteria
  - [ ] Per SPEC-XXXX REQ "Requirement Name": {normative statement}
  - [ ] Per SPEC-XXXX Scenario "Scenario Name": WHEN {trigger} THEN {outcome}
  - [ ] Governing: ADR-XXXX ({decision title})
  ```

#### Scenario: Sub-task creation for complex requirements

- **WHEN** a requirement has three or more scenarios
- **THEN** the skill MAY create sub-tasks for individual scenarios as children of the requirement task

#### Scenario: Dependency ordering

- **WHEN** requirements have logical ordering (setup before implementation, core before extensions)
- **THEN** the skill SHALL set up dependency relationships using the tracker's native features

### Requirement: Tasks.md Fallback

When no issue tracker is detected, the skill SHALL generate a `tasks.md` file at `docs/openspec/specs/{capability-name}/tasks.md`, co-located with `spec.md` and `design.md`. The file MUST follow the format specified in SPEC-0006.

#### Scenario: Fallback file generation

- **WHEN** no tracker is detected and the skill falls back to `tasks.md`
- **THEN** the skill SHALL generate `docs/openspec/specs/{capability-name}/tasks.md` with tasks derived from spec requirements, using numbered section headings and checkbox format

#### Scenario: Fallback task format

- **WHEN** `tasks.md` is generated
- **THEN** every task SHALL be a checkbox item matching `- [ ] X.Y Task description` and SHALL reference the governing requirement

### Requirement: Review Mode

When the `--review` flag is present, the skill SHALL spawn a planning team for peer review of the issue breakdown.

#### Scenario: Team creation

- **WHEN** the user runs `/design:plan SPEC-XXXX --review`
- **THEN** the skill SHALL create a team with a planner agent and a reviewer agent using `TeamCreate`

#### Scenario: Reviewer validation

- **WHEN** the reviewer receives the issue breakdown
- **THEN** the reviewer SHALL verify that every spec requirement has at least one corresponding issue, acceptance criteria correctly reference WHEN/THEN scenarios, dependency ordering is logical, and issue scope is session-sized

#### Scenario: Revision rounds

- **WHEN** the reviewer requests revisions
- **THEN** a maximum of 2 revision rounds SHALL be allowed, after which the reviewer approves with noted concerns

#### Scenario: TeamCreate failure

- **WHEN** `TeamCreate` fails
- **THEN** the skill SHALL fall back to single-agent mode and proceed without review

### Requirement: Planning Report

After creating issues (or generating `tasks.md`), the skill SHALL present a summary to the user.

#### Scenario: Report contents

- **WHEN** planning is complete
- **THEN** the skill SHALL report: which tracker was used (or tasks.md fallback), the number of epics, tasks, and sub-tasks created, where the user can find them, and a suggestion to run `/design:prime` before starting implementation

### Requirement: Tracker-Specific Configuration

When a tracker requires configuration not already saved in `.design.json` (e.g., repo owner/name for GitHub, project key for Jira), the skill SHALL use `AskUserQuestion` to gather it. The skill SHALL offer to save the configuration to `.design.json`.

#### Scenario: GitHub/GitLab/Gitea config needed

- **WHEN** GitHub, GitLab, or Gitea is selected and no `owner`/`repo` config is saved
- **THEN** the skill SHALL ask the user for the repository owner and name

#### Scenario: Jira config needed

- **WHEN** Jira is selected and no `project_key` config is saved
- **THEN** the skill SHALL ask the user for the Jira project key

#### Scenario: Linear config needed

- **WHEN** Linear is selected and no `team_id` config is saved
- **THEN** the skill SHALL ask the user for the Linear team ID

### Requirement: Gap Analysis Mode (Proposed)

This requirement is OPTIONAL and describes a future capability.

When invoked as `/design:plan SPEC-XXXX --gaps`, the skill MAY read the spec's requirements, scan the codebase for implementation, and identify requirements that are unimplemented or partially implemented. The skill MAY then create issues for the gaps found.

#### Scenario: Gap analysis invocation

- **WHEN** a user runs `/design:plan SPEC-0003 --gaps`
- **THEN** the skill MAY read the spec requirements, scan the codebase for implementations matching each requirement, and report which requirements lack implementation

#### Scenario: Gap issue creation

- **WHEN** gaps are identified
- **THEN** the skill MAY create issues only for unimplemented or partially implemented requirements, rather than for all requirements

### Requirement: Code Quality Analysis Mode (Proposed)

This requirement is OPTIONAL and describes a future capability.

When invoked as `/design:plan --analyze` (no spec argument required), the skill MAY scan the codebase for DRY violations, dead code, untested code paths, and security issues, and create issues for findings.

#### Scenario: Code quality invocation

- **WHEN** a user runs `/design:plan --analyze`
- **THEN** the skill MAY scan the codebase without requiring a spec argument and identify DRY violations, dead code, untested paths, and security issues

#### Scenario: Code quality issue creation

- **WHEN** code quality issues are identified
- **THEN** the skill MAY create issues categorized by type (DRY, dead code, untested, security) with evidence from the codebase
