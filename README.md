# claude-plugin-design

A Claude Code plugin for architecture decision records (ADRs), OpenSpec specifications, and Docusaurus documentation generation.

## Skills

| Skill | Invoke | Description |
|-------|--------|-------------|
| **ADR** | `/design:adr [description]` | Create an ADR using MADR format with team-based drafting and architect review |
| **OpenSpec** | `/design:openspec [capability]` | Create spec.md + design.md with RFC 2119 requirements and architect review |
| **Docs** | `/design:docs [project name]` | Scaffold a Docusaurus site from your ADRs and OpenSpecs |

## Install

Add as a marketplace or install directly:

```bash
# From GitHub
/plugin marketplace add joestump/claude-plugin-design
```

Or add to your project's `.claude/settings.json`:

```json
{
  "plugins": {
    "design": {
      "source": {
        "source": "github",
        "repo": "joestump/claude-plugin-design"
      }
    }
  }
}
```

## What It Does

### `/design:adr` — Architecture Decision Records

Creates ADRs using [MADR](https://adr.github.io/madr/) format:
- Sequential numbering: `ADR-0001`, `ADR-0002`, etc.
- Stored in `docs/decisions/`
- Drafted and reviewed by a Claude Team (drafter + architect)
- YAML frontmatter with status, date, decision-makers

### `/design:openspec` — OpenSpec Specifications

Creates paired spec.md + design.md using [OpenSpec](https://github.com/Fission-AI/OpenSpec):
- RFC numbering: `RFC-0001`, `RFC-0002`, etc.
- Requirements in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) format (MUST, SHALL, MAY, etc.)
- Scenarios with `####` headings and WHEN/THEN format
- Stored in `openspec/specs/{capability-name}/`
- Drafted and reviewed by a Claude Team (spec-writer + architect)

### `/design:docs` — Docusaurus Documentation Site

Scaffolds a complete Docusaurus site that transforms your ADRs and specs into a polished doc site:
- RFC 2119 keyword highlighting (color-coded MUST/SHALL/MAY)
- Cross-reference linking (ADR-0001 and PREFIX-NNN become clickable links)
- Status/Date/Domain badge components
- Requirement box components with anchor links
- Consequence keyword highlighting (Good/Bad/Neutral)
- Gherkin keyword highlighting (GIVEN/WHEN/THEN)
- Dark mode support
- Auto-generated sidebars

## Project Structure

```
your-project/
├── docs/decisions/              # ADRs (created by /design:adr)
│   ├── ADR-0001-short-title.md
│   └── ADR-0002-short-title.md
├── openspec/specs/              # OpenSpecs (created by /design:openspec)
│   └── capability-name/
│       ├── spec.md
│       └── design.md
└── docs-site/                   # Docusaurus site (created by /design:docs)
    ├── package.json
    ├── docusaurus.config.ts
    ├── scripts/                 # Build-time transforms
    └── src/                     # Components, CSS, data
```

## Workflow

1. **Decide**: `/design:adr We need to choose a web framework for the admin dashboard`
2. **Review**: Read the ADR, discuss, mark `status: accepted`
3. **Specify**: `/design:openspec Convert ADR-0001 to a spec`
4. **Document**: `/design:docs my-project`
5. **Develop**: `cd docs-site && npm run dev`

## License

MIT
