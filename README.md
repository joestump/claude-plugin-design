# claude-plugin-design

A Claude Code plugin for architecture governance: ADRs, specifications, sprint planning, parallel implementation, code review, and documentation generation.

## Skills

| Skill | Invoke | Description |
|-------|--------|-------------|
| **ADR** | `/design:adr [description] [--review]` | Create an ADR using MADR format with Mermaid diagrams |
| **Spec** | `/design:spec [capability] [--review]` | Create spec.md + design.md with RFC 2119 requirements and Mermaid diagrams |
| **Init** | `/design:init` | Set up CLAUDE.md with architecture context for design-aware sessions |
| **Prime** | `/design:prime [topic]` | Load ADR and spec context into the session, optionally filtered by topic |
| **Check** | `/design:check [target]` | Quick-check code against ADRs and specs for drift |
| **Audit** | `/design:audit [scope] [--review]` | Comprehensive audit of design artifact alignment across the project |
| **Docs** | `/design:docs [project name]` | Generate docs with scaffold/integration modes and manifest-based upgrades |
| **List** | `/design:list [adr\|spec\|all]` | List all ADRs and specs with their status |
| **Discover** | `/design:discover [scope]` | Discover implicit architecture from an existing codebase |
| **Plan** | `/design:plan [spec-name or SPEC-XXXX] [--review] [--project <name>] [--no-projects] [--branch-prefix <prefix>] [--no-branches]` | Break a spec into trackable issues with project grouping and branch conventions |
| **Organize** | `/design:organize [SPEC-XXXX or spec-name] [--project <name>] [--dry-run]` | Retroactively group existing issues into tracker-native projects |
| **Enrich** | `/design:enrich [SPEC-XXXX or spec-name] [--branch-prefix <prefix>] [--dry-run]` | Add branch naming and PR conventions to existing issue bodies |
| **Work** | `/design:work [SPEC-XXXX or issue numbers] [--max-agents N] [--draft] [--dry-run] [--no-tests]` | Pick up tracker issues and implement them in parallel using git worktrees |
| **Review** | `/design:review [SPEC-XXXX or PR numbers] [--pairs N] [--no-merge] [--dry-run]` | Review and merge PRs using reviewer-responder agent pairs |
| **Status** | `/design:status [ID] [status]` | Change the status of an ADR or spec |

## Install

Add to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-plugin-design": {
      "source": {
        "source": "github",
        "repo": "joestump/claude-plugin-design"
      }
    }
  },
  "enabledPlugins": {
    "design@claude-plugin-design": true
  }
}
```

Then restart Claude Code. The plugin's 15 skills will be available as `/design:init`, `/design:prime`, `/design:adr`, `/design:spec`, `/design:plan`, `/design:organize`, `/design:enrich`, `/design:work`, `/design:review`, `/design:check`, `/design:audit`, `/design:discover`, `/design:docs`, `/design:list`, and `/design:status`.

## Configuration

The `.claude-plugin-design.json` file is a persistent, project-level configuration file for the design plugin. It stores tracker preferences, project settings, branch conventions, and review configuration so you are not re-prompted on every invocation.

**This file should be committed to git** -- it contains shared team settings (tracker choice, branch naming conventions, project defaults) that benefit all contributors.

### Schema Reference

```json
{
  "tracker": "github",
  "tracker_config": {
    "owner": "your-org",
    "repo": "your-project"
  },
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

All keys are optional. The file is created automatically when you first save a tracker preference via `/design:plan` or `/design:spec`. Skills merge their updates non-destructively -- existing keys are never overwritten.

### Sections

| Section | Written By | Read By | Purpose |
|---------|-----------|---------|---------|
| `tracker` | `/design:plan`, `/design:spec` | All planning/work/review skills | Which issue tracker to use (`github`, `gitea`, `gitlab`, `jira`, `linear`, `beads`) |
| `tracker_config` | `/design:plan`, `/design:spec` | All planning/work/review skills | Tracker-specific settings (owner/repo, project key, team ID) |
| `projects` | `/design:plan`, `/design:organize` | `/design:plan`, `/design:organize` | Project grouping defaults, cached project IDs, view/column/iteration config |
| `branches` | `/design:plan` | `/design:plan`, `/design:enrich` | Branch naming conventions (prefix, epic prefix, slug length) |
| `pr_conventions` | `/design:plan` | `/design:plan`, `/design:enrich` | PR close keyword and reference format |
| `worktrees` | Manual | `/design:work` | Worktree base directory, agent concurrency, cleanup, PR mode |
| `review` | Manual | `/design:review` | Reviewer pair count, merge strategy, cleanup |

### Key Reference

| Key | Default | Description |
|-----|---------|-------------|
| `tracker` | *(detected)* | Issue tracker name: `github`, `gitea`, `gitlab`, `jira`, `linear`, or `beads` |
| `tracker_config.owner` | *(prompted)* | Repository owner (GitHub/Gitea/GitLab) |
| `tracker_config.repo` | *(prompted)* | Repository name (GitHub/Gitea/GitLab) |
| `tracker_config.project_key` | *(prompted)* | Jira project key |
| `tracker_config.team_id` | *(prompted)* | Linear team ID |
| `projects.default_mode` | `"per-epic"` | Project grouping: `"per-epic"` or `"single"` |
| `projects.project_ids` | `{}` | Cached project IDs keyed by spec number (e.g., `{"SPEC-0007": "PVT_kwDOABC"}`) |
| `projects.views` | `["All Work", "Board", "Roadmap"]` | Named views for GitHub Projects V2 |
| `projects.columns` | `["Todo", "In Progress", "In Review", "Done"]` | Board columns for Gitea projects |
| `projects.iteration_weeks` | `2` | Sprint duration in weeks for GitHub iteration fields |
| `branches.enabled` | `true` | Whether to add `### Branch` sections to issue bodies |
| `branches.prefix` | `null` (uses `"feature"`) | Default branch prefix for task issues |
| `branches.epic_prefix` | `"epic"` | Branch prefix for epic issues |
| `branches.slug_max_length` | `50` | Maximum slug length in branch names |
| `pr_conventions.enabled` | `true` | Whether to add `### PR Convention` sections to issue bodies |
| `pr_conventions.close_keyword` | `null` (tracker default) | Custom close keyword (e.g., `"Fixes"` instead of `"Closes"`) |
| `pr_conventions.ref_keyword` | `"Part of"` | Keyword for referencing parent epic |
| `pr_conventions.include_spec_reference` | `true` | Include spec number in PR convention section |
| `worktrees.base_dir` | `null` (uses `.claude/worktrees/`) | Where worktrees are created |
| `worktrees.max_agents` | `3` | Default number of parallel worker agents |
| `worktrees.auto_cleanup` | `false` | Remove worktrees after successful PR creation |
| `worktrees.pr_mode` | `"ready"` | `"ready"` for regular PRs, `"draft"` for draft PRs |
| `review.max_pairs` | `2` | Default number of reviewer-responder pairs |
| `review.merge_strategy` | `"squash"` | Merge strategy: `"squash"`, `"merge"`, or `"rebase"` |
| `review.auto_cleanup` | `false` | Remove worktrees after review completion |

## Development

Clone the repo and run Claude Code from the project directory:

```bash
git clone https://github.com/joestump/claude-plugin-design.git
cd claude-plugin-design
claude
```

The `.claude/settings.json` in this repo registers the local directory as a marketplace and enables the plugin automatically. Any changes to skills or templates are picked up on the next Claude Code launch.

## What It Does

### `/design:adr` -- Architecture Decision Records

Creates ADRs using [MADR](https://adr.github.io/madr/) format:
- Sequential numbering: `ADR-0001`, `ADR-0002`, etc.
- Stored in `docs/adrs/`
- Mermaid architecture diagrams included by default
- YAML frontmatter with status, date, decision-makers
- Single-agent by default; add `--review` for team-based drafting with architect review
- Offers to add an Architecture Context section to your CLAUDE.md on first use
- After writing, suggests formalizing the decision into a spec with `/design:spec`

### `/design:spec` -- Specifications

Creates paired spec.md + design.md using [OpenSpec](https://github.com/Fission-AI/OpenSpec):
- Spec numbering: `SPEC-0001`, `SPEC-0002`, etc.
- Requirements in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) format (MUST, SHALL, MAY, etc.)
- Scenarios with `####` headings and WHEN/THEN format
- Mermaid architecture diagrams required in design.md
- Stored in `docs/openspec/specs/{capability-name}/`
- Single-agent by default; add `--review` for team-based drafting with architect review
- **Sprint planning**: After writing the spec, offers to break requirements into trackable issues:
  - Detects [Beads](https://github.com/steveyegge/beads), GitHub, GitLab, Gitea, Jira, or Linear (MCP or CLI)
  - Saves tracker preference to `.claude-plugin-design.json` for future use
  - Creates epics, tasks, and sub-tasks with acceptance criteria referencing spec/requirement numbers
  - Sets up dependency relationships between tasks
  - Falls back to generating `tasks.md` as a co-located openspec artifact when no tracker is available (per ADR-0007)
  - For planning against existing specs, use `/design:plan` instead

### `/design:plan` -- Sprint Planning

Breaks an existing specification into trackable work items in your issue tracker:
- Accepts a spec name or SPEC number (e.g., `/design:plan web-dashboard` or `/design:plan SPEC-0003`)
- Lists available specs interactively if no argument provided
- Detects available issue trackers:
  - [Beads](https://github.com/steveyegge/beads), GitHub (MCP or `gh` CLI), GitLab (MCP or `glab` CLI), Gitea (MCP or `tea` CLI), Jira (MCP), Linear (MCP)
  - Saves tracker preference to `.claude-plugin-design.json` so you're not re-prompted
- Groups requirements into 3-4 story-sized issues by functional area (targeting 200-500 line PRs) with task checklists for each requirement
- Creates an epic for the spec and stories as children with acceptance criteria referencing spec/requirement numbers
- Sets up dependency relationships between stories
- Project grouping: creates tracker-native projects for each epic (or a single combined project with `--project`). Projects are automatically linked to the repository so they appear in the repo's Projects tab. Skip with `--no-projects`.
- Workspace enrichment: GitHub Projects get descriptions, READMEs, Sprint iteration fields, and named views; Gitea gets milestones and board columns
- Branch naming: adds `### Branch` sections to issue bodies with `feature/{issue-number}-{slug}` naming convention. Customize prefix with `--branch-prefix`, skip with `--no-branches`.
- PR conventions: adds `### PR Convention` sections with tracker-specific close keywords (e.g., `Closes #N` for GitHub)
- Auto-creates labels with try-then-create pattern when missing
- Falls back to generating `tasks.md` when no tracker is available (per ADR-0007)
- Single-agent by default; add `--review` for team-based planning with reviewer

### `/design:organize` -- Organize and Enrich Project Workspaces

Retroactively organizes issues and enriches project workspaces with a three-tier intervention model:
- **Tier (a) Leave as-is**: Assess project state and report — no changes made
- **Tier (b) Restructure workspace**: Add/fix project structure (views, README, columns, iterations, milestones) without touching issues
- **Tier (c) Complete refactor**: All tier (b) changes plus re-group issues, fix labels, create dependency links, add branch/PR sections
- GitHub enrichment: project description, README, Sprint iteration field, named views (All Work, Board, Roadmap)
- Gitea enrichment: milestones for epics, board columns (Todo/In Progress/In Review/Done), native dependency links
- Auto-creates labels with try-then-create pattern when missing (epic=#6E40C9, story=#1D76DB, spec=#0E8A16)
- Graceful degradation: skips unsupported features and reports, never fails
- Use `--dry-run` to preview without modifying
- No `--review` support (utility skill)

### `/design:enrich` -- Enrich Issues with Workflow Conventions

Retroactively adds branch naming and PR convention sections to existing issue bodies:
- Finds issues referencing a spec in your tracker
- Appends `### Branch` sections with `feature/{issue-number}-{slug}` naming
- Appends `### PR Convention` sections with tracker-specific close keywords
- Skips issues that already have these sections (idempotent)
- Use `--dry-run` to preview without modifying
- Custom branch prefix via `--branch-prefix`
- No `--review` support (utility skill)

### `/design:work` -- Parallel Issue Implementation

Picks up tracker issues and implements them in parallel using git worktrees:
- Accepts a spec number (`SPEC-0003`) to work all open issues, or specific issue numbers (`42 43 47`)
- Reads spec.md, design.md, and referenced ADRs to give workers full architecture context
- Detects tracker using the same pattern as `/design:plan` (`.claude-plugin-design.json` preference, then auto-detection)
- Filters issues: skips epics and issues without `### Branch` sections (suggests `/design:enrich`)
- Extracts branch names and PR conventions from issue bodies
- Creates isolated git worktrees for each issue with deterministic branch names
- Spawns parallel worker agents (default 3, configurable with `--max-agents`)
- Workers implement changes, leave `// Governing: SPEC-XXXX REQ "..."` comments, run tests, commit, push, and create PRs
- Regular (non-draft) PRs by default; use `--draft` for draft PRs
- `--dry-run` previews what would happen without doing anything
- `--no-tests` skips test execution in workers
- Failed issues preserve their worktrees for manual pickup
- Falls back to single-agent sequential mode if team creation fails
- Configurable via `.claude-plugin-design.json` `worktrees` section (base_dir, max_agents, auto_cleanup, pr_mode)

### `/design:review` -- PR Review and Merge

Reviews and merges PRs produced by `/design:work` using reviewer-responder agent pairs:
- Discovers open PRs by spec number or explicit PR numbers
- Organizes agents into reviewer-responder pairs (default 2 pairs, configurable with `--pairs`)
- Verifies all CI/CD status checks (GitHub Actions, Gitea Actions, GitLab CI) are green before reviewing — PRs with failing checks are skipped
- Reviewers check diffs against spec acceptance criteria and ADR compliance (not just style)
- Responders address feedback by pushing fix commits and replying to review comments
- Re-verifies CI after responder pushes fixes — never merges with failing checks
- Exactly one review-response round per PR to bound compute
- Approved PRs are merged automatically (squash by default); use `--no-merge` to skip
- Reuses existing worktrees from `/design:work` when available
- Adaptive pair count: reduces to 1 pair for small batches
- `--dry-run` previews which PRs would be reviewed without taking action
- Configurable via `.claude-plugin-design.json` `review` section (max_pairs, merge_strategy, auto_cleanup)
- Falls back to single-agent sequential mode if team creation fails

### `/design:init` -- Initialize Design Plugin

Sets up your project's `CLAUDE.md` with architecture context:
- Creates `CLAUDE.md` if it doesn't exist, or updates the existing one
- Adds an `## Architecture Context` section with references to `docs/adrs/` and `docs/openspec/specs/`
- Includes a skills reference table and a note about `/design:prime`
- Idempotent -- safe to re-run without duplicating content

### `/design:prime` -- Prime Architecture Context

Loads existing ADRs and specs into the session for architecture-aware responses:
- Summarizes all ADRs (title, status, key decision) and specs (title, status, requirement counts)
- Optional topic argument for semantic filtering (e.g., `/design:prime security` surfaces auth, encryption, access control decisions)
- Suggests `/design:init` if CLAUDE.md hasn't been set up yet
- Read-only -- never modifies any files

### `/design:check` -- Quick Drift Check

Fast, focused drift check on a specific target:
- Target can be a file path, directory, `ADR-XXXX`, or `SPEC-XXXX`
- Checks 3 drift categories: code vs. spec, code vs. ADR, ADR vs. spec
- Produces a concise findings table with severity levels (critical, warning, info)
- Always single-agent (no `--review` support)
- Suggests `/design:audit` for deeper analysis when warranted

### `/design:audit` -- Comprehensive Design Audit

Deep audit of design artifact alignment across the project:
- Covers all 6 drift categories: code vs. spec, code vs. ADR, ADR vs. spec, coverage gaps, stale artifacts, policy violations
- Produces a structured report with categorized findings and summary matrix
- Prioritized recommended actions ordered by severity
- Single-agent by default; add `--review` for team-based auditing with auditor and reviewer agents

### `/design:discover` -- Codebase Discovery

Reverse-engineers implicit architectural decisions and spec-worthy subsystems from an existing codebase:
- Analyzes dependencies, architectural patterns, project structure, and infrastructure configuration
- Uses parallel exploration agents for fast analysis of large codebases
- Produces a suggestion report with confidence levels (High/Medium/Low) and evidence citations
- Includes ready-to-use `/design:adr` and `/design:spec` commands for each suggestion
- Reads existing ADRs and specs to avoid suggesting duplicates
- Optional scope argument to limit analysis to a subdirectory or domain
- Read-only -- never creates files; you choose what to formalize

### `/design:docs` -- Docusaurus Documentation Site

Transforms your ADRs and specs into a polished doc site with two modes:

**Scaffold mode** (default when no existing site): Creates a standalone `docs-site/` with its own Docusaurus installation.

**Integration mode** (when an existing Docusaurus site is detected): Generates a `sync-design-docs` build-time plugin into the existing site's `plugins/` directory, copies React components and CSS, and registers everything automatically. The plugin runs the same transforms at build time and watches for source changes during development.

**Upgrade lifecycle**: Re-running `/design:docs` on an already-configured project triggers a safe upgrade flow:
- A `.design-docs.json` manifest tracks plugin version, mode, site directory, and SHA-256 checksums of all managed files
- Unchanged files are updated silently to the latest template version
- Modified files prompt you with a diff and three choices: accept new version, keep yours, or opt out of future upgrades for that file
- Missing files are re-created from templates
- Files marked `managed: false` are permanently skipped

Features (both modes):
- RFC 2119 keyword highlighting (color-coded MUST/SHALL/MAY)
- Cross-reference linking (ADR-0001 and SPEC-NNN become clickable links)
- Mermaid diagram rendering
- Status/Date/Domain badge components
- Requirement box components with anchor links
- Consequence keyword highlighting (Good/Bad/Neutral)
- Dark mode support
- Auto-generated sidebars
- Separate spec/design pages with expandable sidebar categories
- Specs overview index with linked table of all specifications

### `/design:list` -- List Decisions and Specs

Lists all ADRs and specs with their status, date, and title. Filter by type with `adr`, `spec`, or `all`.

### `/design:status` -- Update Status

Changes the status of an ADR or spec. Valid statuses:
- **ADR**: proposed, accepted, deprecated, superseded
- **Spec**: draft, review, approved, implemented, deprecated

## Project Structure

### Scaffold mode (new docs site)

```
your-project/
├── .design-docs.json            # Upgrade manifest (version, checksums)
├── docs/
│   ├── adrs/                    # ADRs (created by /design:adr)
│   │   ├── ADR-0001-short-title.md
│   │   └── ADR-0002-short-title.md
│   └── openspec/specs/          # Specs (created by /design:spec)
│       └── capability-name/
│           ├── spec.md
│           └── design.md
├── docs-site/                   # Docusaurus site (created by /design:docs)
│   ├── package.json
│   ├── docusaurus.config.ts
│   ├── scripts/                 # Build-time transforms
│   └── src/                     # Components, CSS, data
└── docs-generated/              # Build artifact (generated by docs-site build)
    ├── index.mdx
    ├── decisions/               # Transformed ADRs
    └── specs/                   # Transformed specs
        ├── index.mdx            # Overview table with links
        ├── capability-name/     # Expandable sidebar category
        │   ├── _category_.json
        │   ├── spec.mdx
        │   └── design.mdx
        └── single-doc-spec.mdx  # Leaf item (no design.md)
```

### Integration mode (existing Docusaurus site)

```
your-project/
├── .design-docs.json            # Upgrade manifest (version, checksums)
├── docs/
│   ├── adrs/                    # ADRs (canonical source)
│   └── openspec/specs/          # Specs (canonical source)
└── website/                     # Your existing Docusaurus site
    ├── docusaurus.config.ts     # Plugin registered here
    ├── plugins/
    │   └── sync-design-docs/    # Generated by /design:docs
    │       ├── index.js         # Docusaurus plugin entry
    │       └── lib/             # Transform scripts
    ├── src/
    │   ├── components/
    │   │   └── design-docs/     # Badge and layout components
    │   ├── css/
    │   │   └── design-docs.css  # Design-specific styles
    │   └── theme/
    │       └── MDXComponents.tsx # Component registration (merged)
    └── docs/
        └── architecture/        # Generated at build time (gitignored)
            ├── index.mdx
            ├── decisions/       # Transformed ADRs
            └── specs/           # Transformed specs
                ├── index.mdx    # Overview table with links
                └── ...          # Same structure as scaffold
```

## Workflow

1. **Setup**: `/design:init` to configure CLAUDE.md with architecture context
2. **Discover**: `/design:discover` to find implicit decisions in an existing codebase
3. **Prime**: `/design:prime` at the start of each session (or `/design:prime security` for a focused topic)
4. **Decide**: `/design:adr We need to choose a web framework for the admin dashboard`
5. **Review**: `/design:list adr` to see all decisions, `/design:status ADR-0001 accepted` to approve
6. **Specify**: `/design:spec Convert ADR-0001 to a spec` — the agent writes requirements and offers to plan a sprint
7. **Plan**: `/design:plan SPEC-0001` — break the spec into epics, tasks, and sub-tasks in Beads, GitHub, GitLab, Gitea, Jira, or Linear with acceptance criteria referencing spec/requirement numbers
8. **Organize & Enrich** (retroactive): `/design:organize SPEC-0001` to group issues into projects, `/design:enrich SPEC-0001` to add branch and PR conventions
9. **Build**: `/design:work SPEC-0001` to pick up issues and implement them in parallel using git worktrees, or `/design:prime` then manually work through issues
10. **Review**: `/design:review SPEC-0001` to review and merge PRs with spec-aware feedback, or `--no-merge` for review-only
11. **Check**: `/design:check src/auth/` to quick-check for drift while coding
12. **Audit**: `/design:audit --review` for a comprehensive design review
13. **Document**: `/design:docs` to generate or upgrade the docs site

For thorough team review on critical decisions, add `--review`:
- `/design:adr Choose a database --review`
- `/design:spec authentication-service --review`
- `/design:audit --review`

## CLAUDE.md Integration

Run `/design:init` to set up your project's CLAUDE.md with architecture context. This adds references to `docs/adrs/` and `docs/openspec/specs/`, a plugin skills table, and a note about `/design:prime`:

```markdown
## Architecture Context
- Architecture Decision Records are in `docs/adrs/`
- Specifications are in `docs/openspec/specs/`
```

## License

MIT
