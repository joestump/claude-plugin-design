---
name: docs
description: Generate a documentation site from your ADRs and specs. Use when the user says "generate docs", "create a docs site", or wants to publish their architecture decisions.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, AskUserQuestion
argument-hint: [project name or options]
context: fork
---

# Generate Docusaurus Documentation Site

Transform ADRs from `docs/adrs/` and OpenSpec specs from `docs/openspec/specs/` into a polished documentation website with:

- RFC 2119 keyword highlighting (MUST, SHALL, MAY, etc.)
- ADR cross-reference linking (ADR-0001 becomes a clickable link)
- SPEC cross-reference linking (PREFIX-NNN links to spec requirement anchors)
- Status/Date/Domain badge components
- Requirement box components for spec tables
- Consequence keyword highlighting (Good/Bad/Neutral) in ADRs
- Dark mode support
- Auto-generated sidebars

Supports two modes:
- **Scaffold mode**: Creates a standalone `docs-site/` with its own Docusaurus installation
- **Integration mode**: Generates a build-time plugin into an existing Docusaurus site

## Process

### Step 1: Pre-flight Checks

- Check if Node.js is installed. If not, tell the user: "Node.js is required to run the docs site. Please install it from https://nodejs.org/ and re-run this command." and stop.
- Check if `docs/adrs/` has any ADR `.md` files
- Check if `docs/openspec/specs/` has any spec directories (containing `spec.md`)
- If NEITHER has content, tell the user: "No ADRs or specs found. Create some first with `/design:adr` or `/design:spec`, then re-run `/design:docs`." and stop.
- If only one has content, proceed but note which is empty (e.g., "No specs found yet -- the docs site will only include ADRs for now.")

### Step 2: Detect Existing Docusaurus Site and Upgrade State

#### 2.1: Check for upgrade manifest

Check if `.design-docs.json` exists at the project root.

**If `.design-docs.json` exists:**
- Read and parse the manifest
- Check if the `siteDir` referenced in the manifest still exists on disk
  - **If siteDir exists** → enter **Upgrade Mode** (Step 3C). Skip Steps 2.2 and 2.3.
  - **If siteDir is missing** → warn the user: "Found `.design-docs.json` but the site directory `{siteDir}` no longer exists." Use `AskUserQuestion` to offer:
    - "Re-scaffold a new docs site" → proceed with **Scaffold Mode** (Step 3A)
    - "Cancel" → stop

**If `.design-docs.json` does NOT exist**, continue to Step 2.2.

#### 2.2: Scan for existing Docusaurus sites

Scan the project root for directories containing `docusaurus.config.ts` or `docusaurus.config.js`:

```bash
find . -maxdepth 2 -name 'docusaurus.config.*' -not -path './docs-site/*' -not -path './node_modules/*' 2>/dev/null
```

#### 2.3: Choose mode

**If an existing docs site directory is detected** (`docs-site/` exists or an integration site was found in 2.2) **but no `.design-docs.json`**:
- Warn: "Upgrade tracking unavailable — `.design-docs.json` not found."
- Use `AskUserQuestion` to offer:
  - "Create manifest from current state" → compute SHA-256 checksums of all managed files in the existing site, write `.design-docs.json` using the current state as baseline, then enter **Upgrade Mode** (Step 3C)
  - "Continue without upgrade tracking" → proceed to mode selection below
  - "Cancel" → stop

**If an existing non-scaffold Docusaurus site is found** (from Step 2.2), use `AskUserQuestion` to let the user choose:
- Option A: "Integrate into {directory}" -- proceed with **Integration Mode** (Step 3B)
- Option B: "Scaffold a new docs site" -- proceed with **Scaffold Mode** (Step 3A)

**If no existing site is found**, proceed directly with **Scaffold Mode** (Step 3A).

---

### Step 3A: Scaffold Mode

This is the original behavior -- creates a standalone Docusaurus site.

1. **Check for existing docs-site**: Look for `docs-site/` in the project root. If it exists, ask the user before overwriting.

2. **Copy the plugin's Docusaurus templates** using `cp -r` from the plugin's `templates/docusaurus/` directory to `docs-site/` in the project root. The plugin is installed at the path shown in the skill context.

3. **Customize for the project** by reading and modifying only these files:
   - `docs-site/package.json` -- update the project name from `$ARGUMENTS` or inferred from the repo
   - `docs-site/docusaurus.config.ts` -- update title, baseUrl, and GitHub URL for this project

4. **Adapt paths**: The transform scripts need to know where ADRs and specs live relative to the docs-site. By default:
   - ADRs: `../docs/adrs/` (relative to docs-site)
   - OpenSpecs: `../docs/openspec/specs/` (relative to docs-site)
   - Output: `docs-generated/` directory at project root

5. **Run the SPEC mapping build** to populate `spec-emojis.json` and `spec-mapping.json` from existing specs.

6. **Run `npm install`** in the docs-site directory.

7. **Update `.claudeignore`**: Check if `.claudeignore` exists at the project root. If not, create it. Add entries to ignore the docs-site build artifacts that would cause Claude Code to freeze on startup:

   ```
   docs-site/node_modules/
   docs-site/build/
   docs-site/.docusaurus/
   ```

   If `.claudeignore` already exists, append any missing entries.

8. **Report and offer to start**: Tell the user what was created, then ask: "Docs site created! Want me to start the dev server? (`cd docs-site && npm run dev`)"

---

### Step 3B: Integration Mode

Generates a build-time Docusaurus plugin into an existing site. The plugin runs the same transforms as scaffold mode but writes output into the existing site's docs tree.

Let `{site}` be the path to the existing Docusaurus site directory (e.g., `website/`).

#### 3B.1: Copy the sync plugin

Copy the integration plugin template from the plugin's `templates/integration/sync-design-docs/` directory to `{site}/plugins/sync-design-docs/`:

```bash
cp -r {plugin-path}/templates/integration/sync-design-docs {site}/plugins/sync-design-docs
```

If `{site}/plugins/sync-design-docs/` already exists, ask the user before overwriting.

#### 3B.2: Copy React components

Copy all component files from `{plugin-path}/templates/docusaurus/src/components/` to `{site}/src/components/design-docs/`:

```bash
mkdir -p {site}/src/components/design-docs
cp {plugin-path}/templates/docusaurus/src/components/*.tsx {site}/src/components/design-docs/
```

#### 3B.3: Add CSS styles

Read `{plugin-path}/templates/docusaurus/src/css/custom.css` and create `{site}/src/css/design-docs.css` containing ONLY the design-specific styles. **Exclude** the `:root { ... }` and `[data-theme='dark'] { ... }` CSS variable blocks at the top of the file (the ones that set `--ifm-color-primary-*` and `--docusaurus-highlighted-code-line-bg`). These are Docusaurus theme colors that would override the existing site's color scheme.

Include everything from the `/* Badge Components */` comment onwards.

Then add the CSS import. Check how the site loads custom CSS:
- If the site's `docusaurus.config.ts` has a `customCss` option, add `'./src/css/design-docs.css'` as an additional entry (it can be an array)
- Otherwise, add `@import './design-docs.css';` at the top of the site's existing custom CSS file

#### 3B.4: Register MDX components

Check if `{site}/src/theme/MDXComponents.tsx` exists:

**If it does NOT exist**, create it:

```tsx
import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import DateBadge from '@site/src/components/design-docs/DateBadge';
import DomainBadge from '@site/src/components/design-docs/DomainBadge';
import PriorityBadge from '@site/src/components/design-docs/PriorityBadge';
import SeverityBadge from '@site/src/components/design-docs/SeverityBadge';
import StatusBadge from '@site/src/components/design-docs/StatusBadge';
import RFCLevelBadge from '@site/src/components/design-docs/RFCLevelBadge';
import RequirementBox from '@site/src/components/design-docs/RequirementBox';
import Field from '@site/src/components/design-docs/Field';
import FieldGroup from '@site/src/components/design-docs/FieldGroup';

export default {
  ...MDXComponents,
  DateBadge,
  DomainBadge,
  PriorityBadge,
  SeverityBadge,
  StatusBadge,
  RFCLevelBadge,
  RequirementBox,
  Field,
  FieldGroup,
};
```

**If it DOES exist**, read the existing file and merge the design-docs imports:
- Add the import lines for each component from `@site/src/components/design-docs/`
- Add the component names to the default export object
- Preserve all existing imports and component registrations

#### 3B.5: Register the plugin in docusaurus.config

Read `{site}/docusaurus.config.ts` (or `.js`) and add the sync plugin to the `plugins` array. Determine the correct `projectRoot` by computing the relative path from `{site}` to the project root.

Example -- if the site is at `website/` and the project root is `..`:

```typescript
plugins: [
  ['./plugins/sync-design-docs', {
    projectRoot: '..',
    docsPath: 'docs',  // adjust to match the site's existing docs path
  }],
],
```

To find the existing docs path, look for the `docs` preset options in the config:
- Find the `path` option in the classic preset's `docs` config (e.g., `path: 'docs'`)
- Use that value for `docsPath`
- If not specified, Docusaurus defaults to `'docs'`

If the config already has a `plugins` array, append to it. If not, add a new `plugins` property.

#### 3B.6: Add .gitignore entries

Check for `.gitignore` at the project root. Add entries for the generated output directory:

```
# Design docs (generated by sync-design-docs plugin)
{site}/docs/architecture/
```

Use the actual site directory name (e.g., `website/docs/architecture/`).

#### 3B.7: Run initial build and verify

Run the Docusaurus build to verify the plugin works:

```bash
cd {site} && npx docusaurus build 2>&1 | tail -20
```

If the build fails, diagnose and fix the issue. Common problems:
- Missing dependencies: run `npm install` in the site directory
- MDXComponents merge conflict: check the merge was done correctly
- Plugin path error: verify the relative `projectRoot` is correct

#### 3B.8: Update `.claudeignore`

Check if `.claudeignore` exists at the project root. If not, create it. Add entries to ignore the site's build artifacts:

```
{site}/node_modules/
{site}/build/
{site}/.docusaurus/
```

If `.claudeignore` already exists, append any missing entries. Use the actual site directory name (e.g., `website/node_modules/`).

#### 3B.9: Report results

Tell the user what was created and where:
- Plugin installed at `{site}/plugins/sync-design-docs/`
- Components installed at `{site}/src/components/design-docs/`
- CSS added at `{site}/src/css/design-docs.css`
- Generated docs will appear at `{site}/docs/architecture/`
- The plugin auto-syncs when ADRs or specs change during `npm run start`

Then ask: "Integration complete! Want me to start the dev server? (`cd {site} && npm run start`)"

---

### Step 3C: Upgrade Mode (updates `.claudeignore` if missing)

Entered when `.design-docs.json` exists and the referenced `siteDir` is present on disk. This flow updates an existing docs installation to the latest plugin templates while preserving user customizations.

Read the manifest from `.design-docs.json`. Let `{mode}` be the manifest's `mode` field (`"scaffold"` or `"integration"`), and `{site}` be the resolved `siteDir`.

#### 3C.1: Determine template source paths

Based on the manifest's `mode`:

- **Scaffold**: template root is `{plugin-path}/templates/docusaurus/`
- **Integration**: template root is `{plugin-path}/templates/integration/sync-design-docs/` for plugin files, and `{plugin-path}/templates/docusaurus/src/components/` for shared components

#### 3C.2: Process each managed file

For each entry in the manifest's `files` object where `managed` is `true`:

1. **Compute the current SHA-256** of the file on disk
2. **Compare** against the manifest's stored `checksum`:
   - **Checksums match** (file unmodified by user) → replace silently with the new template version from the plugin
   - **Checksums differ** (user has modified the file) → use `AskUserQuestion` to present the conflict:
     - Show which file changed: `"{relative-path}" has been modified since last install.`
     - Offer three choices:
       - "Accept new version" → overwrite with the template version
       - "Keep current" → leave the file as-is, update the manifest checksum to the current file's hash
       - "Opt out of management" → set `managed: false` in the manifest for this file (skip in future upgrades)
   - **File missing from disk** → re-create from the template

For entries where `managed` is `false`, skip entirely.

#### 3C.3: Detect new template files

Check for files in the current plugin templates that are NOT listed in the manifest:

- For **scaffold** mode: scan `templates/docusaurus/scripts/`, `templates/docusaurus/src/components/`, `templates/docusaurus/src/css/`, `templates/docusaurus/src/theme/`
- For **integration** mode: scan `templates/integration/sync-design-docs/`, `templates/docusaurus/src/components/`

For each new file found:
- Install it to the appropriate location in `{site}`
- Add it to the manifest with `managed: true` and its SHA-256 checksum

#### 3C.4: Update the manifest

Write the updated `.design-docs.json`:
- Set `version` to the current plugin version from `.claude-plugin/plugin.json`
- Set `updatedAt` to the current ISO timestamp
- Update all `checksum` values to reflect the current on-disk state
- Preserve `createdAt` and `mode` from the original manifest

#### 3C.5: Ensure `.claudeignore` exists

Check if `.claudeignore` at the project root already includes ignore entries for `{site}/node_modules/`, `{site}/build/`, and `{site}/.docusaurus/`. If any are missing, append them. This ensures projects scaffolded before this step was added get the fix on upgrade.

#### 3C.6: Run build and verify

- For **scaffold** mode: run `npm install` in `{site}` if `package.json` changed, then offer to start the dev server
- For **integration** mode: run a Docusaurus build to verify the plugin still works

#### 3C.7: Report results

Tell the user:
- How many files were updated silently (checksum matched)
- How many files had conflicts and what the user chose for each
- How many new files were added
- How many files were skipped (managed: false)
- The new plugin version recorded in the manifest

---

### Step 4: Create Manifest

This step runs after **Step 3A.8** (scaffold complete) or **Step 3B.9** (integration complete) to establish upgrade tracking for future runs.

#### 4.1: Determine managed files

Based on the mode that was just completed:

**Scaffold mode** — track files in:
- `docs-site/scripts/` (all `.js` files)
- `docs-site/src/components/` (all `.tsx` files)
- `docs-site/src/css/` (all `.css` files)
- `docs-site/src/theme/` (all `.tsx` files)

**Integration mode** — track files in:
- `{site}/plugins/sync-design-docs/` (all files recursively)
- `{site}/src/components/design-docs/` (all `.tsx` files)
- `{site}/src/css/design-docs.css`
- `{site}/src/theme/MDXComponents.tsx` (only if it was created or modified by Step 3B)

#### 4.2: Compute checksums

For each file identified in 4.1, compute its SHA-256 checksum:

```bash
shasum -a 256 {file-path}
```

#### 4.3: Write the manifest

Create `.design-docs.json` at the project root with this schema:

```json
{
  "version": "<plugin version from .claude-plugin/plugin.json>",
  "mode": "scaffold" | "integration",
  "siteDir": "<relative path to site dir from project root>",
  "createdAt": "<ISO 8601 timestamp>",
  "updatedAt": "<ISO 8601 timestamp>",
  "files": {
    "<relative-path-from-project-root>": {
      "checksum": "sha256:<hex-digest>",
      "managed": true
    }
  }
}
```

- `version`: read from `.claude-plugin/plugin.json` (e.g., `"1.3.0"`)
- `mode`: `"scaffold"` or `"integration"` based on which step was just completed
- `siteDir`: relative path to the site directory (e.g., `"docs-site"` or `"website"`)
- `createdAt` and `updatedAt`: both set to the current ISO 8601 timestamp
- `files`: one entry per managed file, keyed by its path relative to the project root

#### 4.4: Confirm manifest creation

Tell the user: "Created `.design-docs.json` with {N} tracked files. Future runs of `/design:docs` will detect changes and offer upgrades."

---

## Key Template Files Reference

### Scaffold Mode Templates (`templates/docusaurus/`)

The templates directory contains production-ready versions of all files. The `cp -r` approach copies everything; you only need to customize `docusaurus.config.ts` and `package.json`.

#### Transform Scripts (scripts/)
- `build-docs.js` -- Orchestrator that runs all transforms
- `transform-adrs.js` -- Transforms ADR markdown to .mdx with badges, RFC 2119 keyword highlighting, cross-references
- `transform-openspecs.js` -- Transforms OpenSpec markdown to .mdx with requirement boxes, domain badges, RFC 2119 highlighting
- `mdx-escape.js` -- Escapes MDX v3 unsafe patterns (curly braces, angle brackets) while preserving JSX components
- `build-spec-mapping.js` -- Scans specs for SPEC ID prefixes and generates mapping JSON
- `generate-index.js` -- Creates the landing page (index.mdx) with links to ADRs and specs sections with counts

### Integration Mode Templates (`templates/integration/sync-design-docs/`)

A self-contained Docusaurus plugin with adapted transform scripts.

#### Plugin Entry
- `index.js` -- Docusaurus plugin that runs transforms during `loadContent()` and watches source files via `getPathsToWatch()`

#### Transform Scripts (lib/)
- `transform-adrs.js` -- ADR transforms with parameterized paths
- `transform-openspecs.js` -- OpenSpec transforms with parameterized paths
- `transform-utils.js` -- Shared utilities (RFC 2119 keywords, cross-references, link fixing)
- `mdx-escape.js` -- MDX v3 safety escaping
- `build-spec-mapping.js` -- Spec ID mapping (returns data instead of writing files)
- `generate-index.js` -- Index page generation with parameterized paths

### Shared: React Components (templates/docusaurus/src/components/)

Used by both modes. In scaffold mode, they live at `docs-site/src/components/`. In integration mode, they're copied to `{site}/src/components/design-docs/`.

- `StatusBadge.tsx` -- Status with emoji (accepted, proposed, draft, etc.)
- `DateBadge.tsx` -- Date display with calendar emoji
- `DomainBadge.tsx` -- Domain/category badge
- `PriorityBadge.tsx` -- P0-P4 priority levels
- `SeverityBadge.tsx` -- Critical/High/Medium/Low/Info
- `RFCLevelBadge.tsx` -- Maps RFC 2119 keywords to severity colors
- `RequirementBox.tsx` -- Bordered container for spec requirements with ID anchors
- `Field.tsx` / `FieldGroup.tsx` -- Metadata label-value pairs

### Shared: Theme and CSS (templates/docusaurus/src/)
- `src/theme/MDXComponents.tsx` -- Registers all custom components for use in MDX
- `src/css/custom.css` -- All badge, keyword, component, and dark mode styles

## Rules

- Always read templates from the plugin directory, don't recreate from memory
- Configure the Docusaurus site for the current project (title, URLs, etc.)
- The transform scripts must work with the project's actual directory structure
- Don't include OpenAPI plugin config unless the project has an OpenAPI spec
- Keep `spec-emojis.json` and `spec-mapping.json` as generated files (populated by build-spec-mapping.js)
- In integration mode, NEVER overwrite the existing site's `docusaurus.config.ts` wholesale -- only add the plugin entry and CSS import
- In integration mode, ALWAYS namespace components under `design-docs/` to avoid collisions with existing components
- In integration mode, generated files go to `{site}/docs/architecture/` -- this directory is gitignored and regenerated on every build
- Always create `.design-docs.json` after a fresh scaffold or integration install (Step 4)
- Never delete or skip manifest creation -- it is required for upgrade tracking
- During upgrades (Step 3C), always ask before overwriting user-modified files
- The manifest `files` object uses project-root-relative paths as keys
- Checksum format is always `sha256:<hex-digest>` (lowercase hex)
- When creating a manifest from an existing site (Step 2.3 "Create manifest from current state"), set all files to `managed: true` and use their current checksums as the baseline
