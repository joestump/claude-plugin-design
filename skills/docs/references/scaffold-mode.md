# Scaffold Mode (Step 3A)

Creates a standalone Docusaurus site at `docs-site/`.

1. **Check for existing docs-site**: Look for `docs-site/` in the project root. If it exists, ask the user before overwriting.

2. **Copy the plugin's Docusaurus templates** using `cp -r` from the plugin's `templates/docusaurus/` directory to `docs-site/` in the project root.

3. **Customize for the project** by reading and modifying only these files:
   - `docs-site/package.json` -- update the project name from `$ARGUMENTS` or inferred from the repo
   - `docs-site/docusaurus.config.ts` -- update title, baseUrl, and GitHub URL for this project

4. **Adapt paths**: The transform scripts need to know where ADRs and specs live relative to the docs-site. By default:
   - ADRs: `../docs/adrs/` (relative to docs-site)
   - OpenSpecs: `../docs/openspec/specs/` (relative to docs-site)
   - Output: `docs-generated/` directory at project root

5. **Run the SPEC mapping build** to populate `spec-emojis.json` and `spec-mapping.json` from existing specs.

6. **Run `npm install`** in the docs-site directory.

7. **Update `.claudeignore`**: Check if `.claudeignore` exists at the project root. If not, create it. Add entries to ignore:
   ```
   docs-site/node_modules/
   docs-site/build/
   docs-site/.docusaurus/
   ```
   If `.claudeignore` already exists, append any missing entries.

8. **Report and offer to start**: Tell the user what was created, then ask: "Docs site created! Want me to start the dev server? (`cd docs-site && npm run dev`)"

After completion, proceed to **Step 4: Create Manifest** (back in SKILL.md).
