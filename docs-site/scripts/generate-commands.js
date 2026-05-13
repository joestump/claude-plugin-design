#!/usr/bin/env node
/**
 * Generate Command Tiles for Docusaurus
 *
 * Reads skills/_index.json manifest and each skill's SKILL.md frontmatter,
 * then generates hero-tile panels for the commands.mdx guide page, organized
 * by the groups in the manifest.
 *
 * Governing: ADR-0029 (Auto-Generate Docusaurus Skill Pages),
 *            SPEC-0021 REQ "Hero-Tile Index Page",
 *            (extension to command tiles).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');
const SKILLS_SOURCE = path.join(REPO_ROOT, 'skills');
const MANIFEST_PATH = path.join(SKILLS_SOURCE, '_index.json');
const COMMANDS_DEST = path.join(REPO_ROOT, 'docs-generated/guides/commands.mdx');

/**
 * Parse YAML frontmatter into a flat object. Supports the limited YAML used
 * by SKILL.md files: scalar strings, scalar booleans, and inline arrays
 * `[a, b, c]`. Reused from transform-skills.js.
 */
function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) return { frontmatter: {}, body: content };

  const fm = {};
  for (const line of fmMatch[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    let value = rawValue.trim();
    const isFlowArray =
      value.startsWith('[') &&
      value.endsWith(']') &&
      value.indexOf(',') !== -1 &&
      value.indexOf('[', 1) === -1;
    if (isFlowArray) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (/^(true|false)$/i.test(value)) {
      value = /^true$/i.test(value);
    } else {
      value = value.replace(/^['"]|['"]$/g, '');
    }
    fm[key] = value;
  }

  const body = content.slice(fmMatch[0].length);
  return { frontmatter: fm, body };
}

/**
 * Truncate a description at a word boundary near 140 chars.
 * Reused from transform-skills.js.
 */
function truncateDescription(description, max = 140) {
  if (!description) return '';
  if (description.length <= max) return description;
  const slice = description.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

function normalizeArgumentHint(argumentHint) {
  if (argumentHint == null) return '';
  if (Array.isArray(argumentHint)) {
    return argumentHint.map((p) => String(p)).join(' ').trim();
  }
  return String(argumentHint).trim();
}

/**
 * Load manifest and validate structure.
 */
function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`skills/_index.json: manifest not found at ${MANIFEST_PATH}`);
  }

  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    throw new Error(`skills/_index.json: invalid JSON — ${err.message}`);
  }

  return manifest;
}

/**
 * Load a single skill's frontmatter from its SKILL.md.
 */
function loadSkillFrontmatter(name) {
  const skillMd = path.join(SKILLS_SOURCE, name, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    return null;
  }
  const raw = fs.readFileSync(skillMd, 'utf-8');
  const { frontmatter } = parseFrontmatter(raw);
  return frontmatter;
}

/**
 * Generate the header and tile section for a single group.
 */
function generateGroupTiles(groupName, skillNames) {
  const parts = [];
  parts.push(`## ${groupName}\n`);
  parts.push('<div className="command-tiles">\n');

  for (const name of skillNames) {
    const fm = loadSkillFrontmatter(name);
    if (!fm) {
      console.warn(`  Warning: ${name}/SKILL.md not found, skipping tile`);
      continue;
    }

    const description = (fm.description || '').trim();
    const truncated = truncateDescription(description);
    const argHint = normalizeArgumentHint(fm['argument-hint']);

    // Escape quotes for JSX attributes
    const safeName = `{${JSON.stringify(name)}}`;
    const safeDesc = `{${JSON.stringify(truncated)}}`;
    const safeHint = `{${JSON.stringify(argHint)}}`;
    const safeHref = `{${JSON.stringify(`/skills/${name}`)}}`;

    parts.push(
      `  <CommandTile name=${safeName} description=${safeDesc} argumentHint=${safeHint} href=${safeHref} />`
    );
  }

  parts.push('</div>\n');
  return parts.join('\n');
}

/**
 * Generate the full command tiles introduction page.
 */
function generateCommandTilesIntro(manifest) {
  const fm = [
    '---',
    'title: "Commands — Quick Reference"',
    'sidebar_label: "Quick Reference"',
    'sidebar_position: 1',
    'description: "Quick-access tiles for all SDD plugin skills, organized by workflow stage. See Commands Reference for detailed documentation."',
    '---',
    '',
  ].join('\n');

  const parts = [
    fm,
    '# Commands',
    '',
    'All SDD plugin skills are invoked as Claude Code slash commands. Browse by workflow stage:',
    '',
  ];

  for (const [groupName, names] of Object.entries(manifest)) {
    parts.push(generateGroupTiles(groupName, names));
    parts.push('');
  }

  parts.push(
    '<div className="note">',
    'For detailed reference, see the <a href="/guides/commands-reference">commands reference</a>.',
    '</div>',
    ''
  );

  return parts.join('\n');
}

/**
 * Check if CommandTile component exists; if not, suggest creating it.
 */
function checkCommandTileComponent() {
  const componentPath = path.join(__dirname, '../src/components/CommandTile.tsx');
  if (!fs.existsSync(componentPath)) {
    console.warn(
      '  Note: CommandTile.tsx component not found at ' + componentPath
    );
    console.warn('  Create it using SkillTile.tsx as a template.');
  }
}

function main() {
  console.log('Generating command tiles...');

  const manifest = loadManifest();
  checkCommandTileComponent();

  // Generate the intro page with tiles
  const tilesContent = generateCommandTilesIntro(manifest);

  // Write to a new file (separate from the detailed commands reference)
  // The detailed reference remains at commands.mdx but is shifted to sidebar_position: 2
  const tilesDestPath = path.join(path.dirname(COMMANDS_DEST), 'commands-quick-reference.mdx');
  fs.writeFileSync(tilesDestPath, tilesContent);

  console.log(`  Generated command tiles at ${path.relative(REPO_ROOT, tilesDestPath)}`);
  console.log(`  Note: Update original commands.mdx sidebar_position to 2 for proper ordering`);
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  loadManifest,
  loadSkillFrontmatter,
  truncateDescription,
  generateGroupTiles,
  generateCommandTilesIntro,
};
