---
name: docs
description: Generate a documentation site from your ADRs and specs. Use when the user says "generate docs", "create a docs site", or wants to publish their architecture decisions.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, AskUserQuestion
argument-hint: [project name or options]
context: fork
---

# Generate Docusaurus Documentation Site

Scaffold a complete Docusaurus docs site that transforms ADRs from `docs/adrs/` and OpenSpec specs from `docs/openspec/specs/` into a polished documentation website with:

- RFC 2119 keyword highlighting (MUST, SHALL, MAY, etc.)
- ADR cross-reference linking (ADR-0001 becomes a clickable link)
- SPEC cross-reference linking (PREFIX-NNN links to spec requirement anchors)
- Status/Date/Domain badge components
- Requirement box components for spec tables
- Consequence keyword highlighting (Good/Bad/Neutral) in ADRs
- Dark mode support
- Auto-generated sidebars

## Process

1. **Pre-flight checks**:
   - Check if Node.js is installed. If not, tell the user: "Node.js is required to run the docs site. Please install it from https://nodejs.org/ and re-run this command." and stop.
   - Check if `docs/adrs/` has any ADR `.md` files
   - Check if `docs/openspec/specs/` has any spec directories (containing `spec.md`)
   - If NEITHER has content, tell the user: "No ADRs or specs found. Create some first with `/design:adr` or `/design:spec`, then re-run `/design:docs`." and stop.
   - If only one has content, proceed but note which is empty (e.g., "No specs found yet -- the docs site will only include ADRs for now.")

2. **Check for existing docs-site**: Look for `docs-site/` in the project root. If it exists, ask the user before overwriting.

3. **Copy the plugin's Docusaurus templates** using `cp -r` from the plugin's `templates/docusaurus/` directory to `docs-site/` in the project root. The plugin is installed at the path shown in the skill context.

4. **Customize for the project** by reading and modifying only these files:
   - `docs-site/package.json` -- update the project name from `$ARGUMENTS` or inferred from the repo
   - `docs-site/docusaurus.config.ts` -- update title, baseUrl, and GitHub URL for this project

5. **Adapt paths**: The transform scripts need to know where ADRs and specs live relative to the docs-site. By default:
   - ADRs: `../docs/adrs/` (relative to docs-site)
   - OpenSpecs: `../docs/openspec/specs/` (relative to docs-site)
   - Output: `docs-generated/` directory at project root

6. **Run the SPEC mapping build** to populate `spec-emojis.json` and `spec-mapping.json` from existing specs.

7. **Run `npm install`** in the docs-site directory.

8. **Report and offer to start**: Tell the user what was created, then ask: "Docs site created! Want me to start the dev server? (`cd docs-site && npm run dev`)"

## Key Template Files Reference

The templates directory contains production-ready versions of all files. The `cp -r` approach copies everything; you only need to customize `docusaurus.config.ts` and `package.json`.

### Transform Scripts (scripts/)
- `build-docs.js` -- Orchestrator that runs all transforms
- `transform-adrs.js` -- Transforms ADR markdown to .mdx with badges, RFC 2119 keyword highlighting, cross-references
- `transform-openspecs.js` -- Transforms OpenSpec markdown to .mdx with requirement boxes, domain badges, RFC 2119 highlighting
- `mdx-escape.js` -- Escapes MDX v3 unsafe patterns (curly braces, angle brackets) while preserving JSX components
- `build-spec-mapping.js` -- Scans specs for SPEC ID prefixes and generates mapping JSON

### React Components (src/components/)
- `StatusBadge.tsx` -- Status with emoji (accepted, proposed, draft, etc.)
- `DateBadge.tsx` -- Date display with calendar emoji
- `DomainBadge.tsx` -- Domain/category badge
- `PriorityBadge.tsx` -- P0-P4 priority levels
- `SeverityBadge.tsx` -- Critical/High/Medium/Low/Info
- `RFCLevelBadge.tsx` -- Maps RFC 2119 keywords to severity colors
- `RequirementBox.tsx` -- Bordered container for spec requirements with ID anchors
- `Field.tsx` / `FieldGroup.tsx` -- Metadata label-value pairs

### Theme
- `src/theme/MDXComponents.tsx` -- Registers all custom components for use in MDX
- `src/css/custom.css` -- All badge, keyword, component, and dark mode styles

## Rules

- Always read templates from the plugin directory, don't recreate from memory
- Configure the Docusaurus site for the current project (title, URLs, etc.)
- The transform scripts must work with the project's actual directory structure
- Don't include OpenAPI plugin config unless the project has an OpenAPI spec
- Keep `spec-emojis.json` and `spec-mapping.json` as generated files (populated by build-spec-mapping.js)
