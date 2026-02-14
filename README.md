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
| **Docs** | `/design:docs [project name]` | Scaffold a Docusaurus site from your ADRs and specs |
| **List** | `/design:list [adr\|spec\|all]` | List all ADRs and specs with their status |
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

Then restart Claude Code. The plugin's skills will be available as `/design:init`, `/design:prime`, `/design:adr`, `/design:spec`, `/design:check`, `/design:audit`, `/design:docs`, `/design:list`, and `/design:status`.

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

### `/design:spec` -- Specifications

Creates paired spec.md + design.md using [OpenSpec](https://github.com/Fission-AI/OpenSpec):
- Spec numbering: `SPEC-0001`, `SPEC-0002`, etc.
- Requirements in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) format (MUST, SHALL, MAY, etc.)
- Scenarios with `####` headings and WHEN/THEN format
- Mermaid architecture diagrams required in design.md
- Stored in `docs/openspec/specs/{capability-name}/`
- Single-agent by default; add `--review` for team-based drafting with architect review

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

### `/design:docs` -- Docusaurus Documentation Site

Scaffolds a complete Docusaurus site that transforms your ADRs and specs into a polished doc site:
- Pre-flight checks (Node.js, existing content)
- RFC 2119 keyword highlighting (color-coded MUST/SHALL/MAY)
- Cross-reference linking (ADR-0001 and SPEC-NNN become clickable links)
- Mermaid diagram rendering
- Status/Date/Domain badge components
- Requirement box components with anchor links
- Consequence keyword highlighting (Good/Bad/Neutral)
- Dark mode support
- Auto-generated sidebars

### `/design:list` -- List Decisions and Specs

Lists all ADRs and specs with their status, date, and title. Filter by type with `adr`, `spec`, or `all`.

### `/design:status` -- Update Status

Changes the status of an ADR or spec. Valid statuses:
- **ADR**: proposed, accepted, deprecated, superseded
- **Spec**: draft, review, approved, implemented, deprecated

## Project Structure

```
your-project/
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
```

## Workflow

1. **Setup**: `/design:init` to configure CLAUDE.md with architecture context
2. **Prime**: `/design:prime` at the start of each session (or `/design:prime security` for a focused topic)
3. **Decide**: `/design:adr We need to choose a web framework for the admin dashboard`
4. **Review**: `/design:list adr` to see all decisions, `/design:status ADR-0001 accepted` to approve
5. **Specify**: `/design:spec Convert ADR-0001 to a spec`
6. **Check**: `/design:check src/auth/` to quick-check for drift while coding
7. **Audit**: `/design:audit --review` for a comprehensive design review
8. **Document**: `/design:docs my-project`
9. **Develop**: `cd docs-site && npm run dev`

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
