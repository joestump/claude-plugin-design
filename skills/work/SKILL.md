---
name: work
description: Pick up tracker issues and implement them in parallel using git worktrees. Use when the user says "work on issues", "implement the spec", "start coding", or wants agents to build from planned issues.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, WebFetch, WebSearch, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, AskUserQuestion, ToolSearch, EnterWorktree
argument-hint: [SPEC-XXXX or issue numbers] [--max-agents N] [--draft] [--dry-run] [--no-tests]
---

# Work on Issues

You are picking up tracker issues and implementing them in parallel using git worktrees. Each issue gets its own worktree and worker agent.

## Process

1. **Parse arguments**: Parse `$ARGUMENTS`.

   **Target resolution:**
   - If a SPEC number is provided (e.g., `SPEC-0003`), find all open tracker issues referencing that spec.
   - If issue numbers are provided (e.g., `42 43 47`), work on those specific issues.
   - If `$ARGUMENTS` is empty (ignoring flags), list available specs by globbing `docs/openspec/specs/*/spec.md`, read the title from each, and use `AskUserQuestion` to ask which spec to implement.

   **Flag parsing:**
   - `--max-agents N`: Maximum concurrent worker agents (default 3). Read `.claude-plugin-design.json` `worktrees.max_agents` as fallback default.
   - `--draft`: Create draft PRs instead of regular PRs. Default is regular (non-draft) PRs. Read `.claude-plugin-design.json` `worktrees.pr_mode` as fallback.
   - `--dry-run`: Preview what would happen without creating worktrees or doing any work. Report the list of issues, branch names, and agent assignments, then stop.
   - `--no-tests`: Skip test execution in workers.

2. **Load architecture context**: Read the spec's `spec.md` and `design.md`. Scan for referenced ADRs (e.g., `ADR-0001`) and read those too. This context will be sent to every worker.

3. **Detect tracker**: Follow the same pattern as `/design:plan`:

   **3.1: Check for saved preference.** Read `.claude-plugin-design.json` in the project root. If it exists and contains a `"tracker"` key, use that tracker directly. If it also has `"tracker_config"`, use those settings. If the saved tracker's tools are no longer available, warn and fall through to detection.

   **3.2: Detect available trackers.** Check for each tracker:
   - **Beads**: Look for `.beads/` directory or run `bd --version`.
   - **GitHub**: Use `ToolSearch` to probe for MCP tools matching `github`, or check `gh` CLI via `gh --version`.
   - **GitLab**: Use `ToolSearch` to probe for MCP tools matching `gitlab`, or check `glab` CLI via `glab --version`.
   - **Gitea**: Use `ToolSearch` to probe for MCP tools matching `gitea`, or check if `tea` CLI is available via `tea --version`.
   - **Jira**: Use `ToolSearch` to probe for MCP tools matching `jira`.
   - **Linear**: Use `ToolSearch` to probe for MCP tools matching `linear`.

   **3.3: Choose tracker.** Same as `/design:plan` — prompt if multiple, use directly if one, fallback to `tasks.md` parsing if none.

4. **Discover workable issues**: Search the tracker for open issues referencing the spec (or use the specific issue numbers provided).

   **Filtering rules:**
   - **Skip epics**: Issues labeled `epic` or titled "Implement ..." are grouping issues, not implementation work.
   - **Skip issues without `### Branch` sections**: These lack branch naming conventions. If any are found, suggest `/design:enrich` to add them and report which issues were skipped.
   - **Extract branch names**: Parse the `### Branch` section from each issue body to get the deterministic branch name (e.g., `feature/42-jwt-token-generation`).
   - **Extract PR conventions**: Parse the `### PR Convention` section for close keywords and epic references.
   - **Detect dependency ordering**: If issue bodies reference dependencies or logical ordering, respect that order when queuing work. For **Gitea**, query native dependencies via `GET /repos/{owner}/{repo}/issues/{index}/dependencies` (or via MCP tools discovered by `ToolSearch`) to find unblocked stories. (Governing: SPEC-0011 REQ "Gitea Native Dependencies")

   If no workable issues are found after filtering, report why and suggest `/design:plan` (no issues at all) or `/design:enrich` (issues exist but lack branch sections).

5. **Dry-run gate**: If `--dry-run` is set, output a preview table and stop:

   ```
   ## Dry Run: /design:work SPEC-0003

   Would create {N} worktrees with up to {max-agents} parallel agents.

   | # | Issue | Branch | Status |
   |---|-------|--------|--------|
   | 1 | #42 JWT Token Generation | feature/42-jwt-token-generation | Ready |
   | 2 | #43 Token Validation | feature/43-token-validation | Ready |
   | 3 | #44 Token Refresh | feature/44-token-refresh | Blocked (depends on #42) |
   | 4 | #47 Setup Auth Module | feature/47-setup-auth-module | Skipped (no ### Branch) |

   ### Skipped Issues
   - #45 Implement Auth Service (epic — skipped)
   - #47 Setup Auth Module (no ### Branch section — run `/design:enrich SPEC-0003`)

   No changes were made.
   ```

6. **Verify git state**:
   - Run `git status` to check for uncommitted changes. If there are uncommitted changes, use `AskUserQuestion` to ask:
     - "You have uncommitted changes. Continue anyway, or commit first?"
     - Options: "Continue anyway" / "Stop so I can commit"
     - If the user says stop, halt and report.
   - Run `git fetch` to ensure we have the latest remote state.

7. **Read `.claude-plugin-design.json` worktree config**: Check for `worktrees` section and apply defaults:

   ```json
   {
     "worktrees": {
       "base_dir": null,
       "max_agents": 3,
       "auto_cleanup": false,
       "pr_mode": "ready"
     }
   }
   ```

   | Key | Default | Description |
   |-----|---------|-------------|
   | `base_dir` | `.claude/worktrees/` | Where worktrees are created |
   | `max_agents` | `3` | Default concurrent workers |
   | `auto_cleanup` | `false` | Remove worktrees after PR creation |
   | `pr_mode` | `"ready"` | `"draft"` or `"ready"` |

   CLI flags override `.claude-plugin-design.json` values. `--max-agents N` overrides `worktrees.max_agents`. `--draft` overrides `worktrees.pr_mode` to `"draft"`.

8. **Create team**: Use `TeamCreate` to create a coordination team. The lead (you) manages the task queue and monitors progress. Spawn up to `--max-agents` worker agents using `Task` with `subagent_type: "general-purpose"`.

   If `TeamCreate` fails, fall back to single-agent sequential mode: work through each issue one at a time in the main session using `git worktree add` for each.

9. **Create worktrees and assign work**: For each workable issue (respecting dependency order and max-agents concurrency):

   **9.1: Create the worktree.**
   ```bash
   git worktree add .claude/worktrees/{branch-name} -b {branch-name}
   ```
   Use the base directory from `.claude-plugin-design.json` `worktrees.base_dir` if set, otherwise `.claude/worktrees/`.

   **9.2: Create a task** using `TaskCreate` for each issue, with the issue details, branch name, and worktree path.

   **9.3: Assign to a worker** using `TaskUpdate` with the worker's name as `owner`. Send the worker a message via `SendMessage` with all context needed to implement the issue.

10. **Worker implementation protocol**: Each worker receives and follows this protocol:

    **Worker receives:**
    - Issue number, title, and full body (with acceptance criteria)
    - Branch name (from `### Branch` section)
    - PR convention (from `### PR Convention` section)
    - Spec content (spec.md)
    - Design content (design.md)
    - ADR content (any referenced ADRs)
    - Worktree absolute path
    - Whether to run tests (`--no-tests` flag)
    - PR mode (`draft` or `ready`)

    **Worker steps:**
    1. All file operations use the worktree absolute path (read, write, edit, glob, grep).
    2. Read the issue body and understand the acceptance criteria.
    3. Explore existing code in the worktree to understand the codebase structure.
    4. Implement changes to satisfy the acceptance criteria.
    5. Leave governing comments in the code:
       ```
       // Governing: SPEC-XXXX REQ "Requirement Name"
       ```
    6. Run tests (unless `--no-tests`). If tests fail, attempt to fix (max 2 fix attempts). If still failing after 2 attempts, report blocked with details.
    7. Stage and commit changes:
       ```bash
       git -C {worktree-path} add .
       git -C {worktree-path} commit -m "{descriptive message}\n\nImplements #{issue-number}\nGoverning: SPEC-XXXX"
       ```
    8. Push the branch:
       ```bash
       git -C {worktree-path} push -u origin {branch-name}
       ```
    9. Create a PR using the tracker's tools or CLI:
       - Title: the issue title
       - Body: Include the close keyword from `### PR Convention`, reference the epic, reference the spec
       - Regular (non-draft) by default, draft if `--draft` was set
    10. Report outcome to lead via `SendMessage`: success (with PR URL) or failure (with details).

11. **Monitor and queue**: The lead tracks worker progress:
    - When a worker finishes, check if there are queued issues waiting.
    - If queued issues have dependency requirements, check if dependencies are now satisfied.
    - Assign the next available issue to the freed worker.
    - If a worker reports failure, note it and continue with other issues.

12. **Cleanup and report**: After all issues are processed:

    **12.1: Shut down team.** Send `shutdown_request` to all workers via `SendMessage`.

    **12.2: Offer worktree cleanup.** If `.claude-plugin-design.json` `worktrees.auto_cleanup` is `true`, remove worktrees for successfully-PRed issues automatically. Otherwise, use `AskUserQuestion`:
    - "Remove worktrees for completed issues? (Failed issue worktrees are always preserved.)"
    - Options: "Yes, clean up" / "No, keep them"
    - If yes: `git worktree remove .claude/worktrees/{branch-name}` for each successful issue.

    **12.3: Final report.**

    ```
    ## Work Complete: SPEC-0003

    Implemented {N} of {M} issues using {agent-count} parallel agents.

    ### Results

    | Issue | Branch | PR | Status |
    |-------|--------|----|--------|
    | #42 JWT Token Generation | feature/42-jwt-token-generation | #101 | Success |
    | #43 Token Validation | feature/43-token-validation | #102 | Success |
    | #44 Token Refresh | feature/44-token-refresh | — | Failed: tests failing |

    ### Failed Issues
    - **#44 Token Refresh**: Tests failing after 2 fix attempts. Worktree preserved at `.claude/worktrees/feature/44-token-refresh` for manual pickup. Error: `TokenRefreshService.refresh() returns expired token in test_refresh_expired`.

    ### Worktrees
    - Cleaned up: 2
    - Preserved (failed): 1

    ### Next Steps
    - Review PRs and merge when satisfied
    - Fix failing issue #44 manually or re-run `/design:work 44`
    - Run `/design:check` to verify implementation alignment
    - Run `/design:audit` for comprehensive drift analysis
    ```

## Why `git worktree add` Instead of `EnterWorktree`

- `EnterWorktree` creates random branch names; we need deterministic names matching `### Branch` conventions from issue bodies.
- `EnterWorktree` switches the session's working directory; the lead agent must stay in the main tree to coordinate.
- `git worktree add` gives full control over branch name and worktree location.

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Worker can't complete implementation | Reports failure to lead, worktree preserved for manual pickup |
| Tests fail after 2 retries | Worker reports blocked with error details, moves to next issue |
| `TeamCreate` fails | Falls back to single-agent sequential mode |
| No workable issues found | Suggest `/design:plan` or `/design:enrich` depending on why |
| Uncommitted changes in main tree | Ask user whether to continue or commit first |
| `git worktree add` fails (branch exists) | Check if the branch already exists remotely. If so, use `git worktree add .claude/worktrees/{branch-name} {branch-name}` (without `-b`) to check out the existing branch |
| Push fails (remote rejection) | Worker reports the error to lead; worktree preserved |
| PR creation fails | Worker reports the error to lead; branch is still pushed, user can create PR manually |
| Tracker not available | Suggest `/design:plan` to create issues first |
| Issue has no acceptance criteria | Worker uses the issue title and body as guidance, warns in PR description |

## Rules

- MUST read spec.md and design.md before dispatching any workers
- MUST use `ToolSearch` to discover tracker MCP tools at runtime — never assume specific tools are available
- MUST check `.claude-plugin-design.json` for saved tracker preference before running detection
- MUST extract branch names from issue bodies — never invent branch names
- MUST skip epics (labeled `epic` or titled "Implement ...") — only work on implementation issues
- MUST skip issues without `### Branch` sections and suggest `/design:enrich`
- MUST respect dependency ordering when queuing work
- MUST create regular (non-draft) PRs by default — only create draft PRs with `--draft`
- MUST leave governing comments (`// Governing: SPEC-XXXX REQ "..."`) in implemented code
- MUST report all failures with actionable details — never silently skip
- MUST preserve worktrees for failed issues — never auto-clean failures
- Workers MUST use worktree absolute paths for all file operations
- Workers MUST NOT modify files outside their assigned worktree
- Workers MUST push and create PRs before reporting success
- The lead MUST stay in the main working tree — only workers operate in worktrees
- `--dry-run` MUST NOT create any worktrees, branches, or PRs
- Maximum 2 test-fix attempts per worker before reporting blocked
- When `TeamCreate` fails, MUST fall back to single-agent sequential mode — never error out
- For Gitea trackers, MUST query native dependencies via API to determine unblocked stories (Governing: SPEC-0011 REQ "Gitea Native Dependencies")
