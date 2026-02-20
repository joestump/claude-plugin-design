# claude-plugin-design

A Claude Code plugin for architecture decision records (ADRs), specifications, and Docusaurus documentation generation.

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
| **Work** | `/design:work [SPEC-XXXX or issue numbers] [--max-agents N] [--ready] [--dry-run] [--no-tests]` | Pick up tracker issues and implement them in parallel using git worktrees |
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

Then restart Claude Code. The plugin's 14 skills will be available as `/design:init`, `/design:prime`, `/design:adr`, `/design:spec`, `/design:plan`, `/design:organize`, `/design:enrich`, `/design:work`, `/design:check`, `/design:audit`, `/design:discover`, `/design:docs`, `/design:list`, and `/design:status`.

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
  - Saves tracker preference to `.design.json` for future use
  - Creates epics, tasks, and sub-tasks with acceptance criteria referencing spec/requirement numbers
  - Sets up dependency relationships between tasks
  - Falls back to generating `tasks.md` as a co-located openspec artifact when no tracker is available (per ADR-0007)
  - For planning against existing specs, use `/design:plan` instead

### `/design:plan` -- Sprint Planning

Breaks an existing specification into trackable work items in your issue tracker:
- Accepts a spec name or SPEC number (e.g., `/design:plan web-dashboard` or `/design:plan SPEC-0003`)
- Lists available specs interactively if no argument provided
- Detects available issue trackers:
  - [Beads](https://github.com/steveyegge/beads), GitHub (MCP or `gh` CLI), GitLab (MCP or `glab` CLI), Gitea (MCP), Jira (MCP), Linear (MCP)
  - Saves tracker preference to `.design.json` so you're not re-prompted
- Creates epics, tasks, and sub-tasks with acceptance criteria referencing spec/requirement numbers
- Sets up dependency relationships between tasks
- Project grouping: creates tracker-native projects for each epic (or a single combined project with `--project`). Skip with `--no-projects`.
- Branch naming: adds `### Branch` sections to issue bodies with `feature/{issue-number}-{slug}` naming convention. Customize prefix with `--branch-prefix`, skip with `--no-branches`.
- PR conventions: adds `### PR Convention` sections with tracker-specific close keywords (e.g., `Closes #N` for GitHub)
- Falls back to generating `tasks.md` when no tracker is available (per ADR-0007)
- Single-agent by default; add `--review` for team-based planning with reviewer

### `/design:organize` -- Organize Issues into Projects

Retroactively groups existing issues into tracker-native projects:
- Finds issues referencing a spec in your tracker
- Creates one project per epic (default) or a single combined project (`--project`)
- Skips projects that already exist (idempotent)
- Use `--dry-run` to preview without creating
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
- Detects tracker using the same pattern as `/design:plan` (`.design.json` preference, then auto-detection)
- Filters issues: skips epics and issues without `### Branch` sections (suggests `/design:enrich`)
- Extracts branch names and PR conventions from issue bodies
- Creates isolated git worktrees for each issue with deterministic branch names
- Spawns parallel worker agents (default 3, configurable with `--max-agents`)
- Workers implement changes, leave `// Governing: SPEC-XXXX REQ "..."` comments, run tests, commit, push, and create PRs
- Draft PRs by default; use `--ready` for non-draft PRs
- `--dry-run` previews what would happen without doing anything
- `--no-tests` skips test execution in workers
- Failed issues preserve their worktrees for manual pickup
- Falls back to single-agent sequential mode if team creation fails
- Configurable via `.design.json` `worktrees` section (base_dir, max_agents, auto_cleanup, pr_mode)

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
10. **Check**: `/design:check src/auth/` to quick-check for drift while coding
11. **Audit**: `/design:audit --review` for a comprehensive design review
12. **Document**: `/design:docs` to generate or upgrade the docs site

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
