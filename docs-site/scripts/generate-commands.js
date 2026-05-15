#!/usr/bin/env node
/**
 * Generate command tiles for the docs-site.
 *
 * Thin wrapper over plugin-content-claude-plugin-commands — the plugin owns
 * the implementation; this script just wires up the docs-site's fixed paths
 * so it integrates with the existing build-docs.js pipeline.
 *
 * Governing: ADR-0029 (Auto-Generate Docusaurus Skill Pages),
 *            SPEC-0021 REQ "Hero-Tile Index Page".
 */

const { loadManifest, loadCommandGroups, renderCommandsMdx } = require('plugin-content-claude-plugin-commands');
const { writeFileSync, mkdirSync } = require('fs');
const { join, dirname } = require('path');

const REPO_ROOT = join(__dirname, '../..');
const MANIFEST_PATH = join(REPO_ROOT, 'skills/_index.json');
const SKILLS_DIR = join(REPO_ROOT, 'skills');
const OUTPUT_PATH = join(REPO_ROOT, 'docs-generated/guides/commands-quick-reference.mdx');

function main() {
  const manifest = loadManifest(MANIFEST_PATH);
  if (!manifest) {
    console.log('  Skipped: skills/_index.json not found or invalid');
    return;
  }
  const groups = loadCommandGroups(manifest, SKILLS_DIR);
  const mdx = renderCommandsMdx(groups, 'sdd');
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, mdx);
  console.log('  Generated command tiles → docs-generated/guides/commands-quick-reference.mdx');
}

if (require.main === module) main();
module.exports = { main };
