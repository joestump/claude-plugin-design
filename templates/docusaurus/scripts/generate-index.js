#!/usr/bin/env node
/**
 * Generate Index Page
 *
 * Creates a landing page (index.mdx) for the docs site that links
 * to ADR and spec sections with counts.
 */

const fs = require('fs');
const path = require('path');

const ADRS_SOURCE = path.join(__dirname, '../../docs/adrs');
const SPECS_SOURCE = path.join(__dirname, '../../docs/openspec/specs');
const DOCS_DEST = path.join(__dirname, '../../docs-generated');

// Read project title from docusaurus.config.ts
const configPath = path.join(__dirname, '../docusaurus.config.ts');
let projectTitle = 'Architecture Documentation';
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const titleMatch = configContent.match(/PROJECT_TITLE\s*=\s*['"]([^'"]+)['"]/);
  if (titleMatch) projectTitle = titleMatch[1];
}

function countAdrs() {
  if (!fs.existsSync(ADRS_SOURCE)) return 0;
  return fs.readdirSync(ADRS_SOURCE)
    .filter(f => f.endsWith('.md') && f !== '0000-template.md' && f !== 'README.md')
    .length;
}

function countSpecs() {
  if (!fs.existsSync(SPECS_SOURCE)) return 0;
  return fs.readdirSync(SPECS_SOURCE)
    .filter(d => {
      const dirPath = path.join(SPECS_SOURCE, d);
      return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'spec.md'));
    })
    .length;
}

function generateSpecsIndex() {
  if (!fs.existsSync(SPECS_SOURCE)) return;

  const specsDest = path.join(DOCS_DEST, 'specs');
  fs.mkdirSync(specsDest, { recursive: true });

  const domains = fs.readdirSync(SPECS_SOURCE)
    .filter(d => fs.statSync(path.join(SPECS_SOURCE, d)).isDirectory())
    .sort();

  const rows = [];
  for (const domain of domains) {
    const domainPath = path.join(SPECS_SOURCE, domain);
    const hasSpec = fs.existsSync(path.join(domainPath, 'spec.md'));
    const hasDesign = fs.existsSync(path.join(domainPath, 'design.md'));

    if (!hasSpec && !hasDesign) continue;

    // Extract title from spec.md H1 heading, stripping SPEC-XXXX: prefix
    let label = domain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (hasSpec) {
      const content = fs.readFileSync(path.join(domainPath, 'spec.md'), 'utf-8');
      const titleMatch = content.match(/^#\s+SPEC-\d+:\s+(.+)$/m);
      if (titleMatch) label = titleMatch[1].trim();
    }

    let docs;
    if (hasSpec && hasDesign) {
      docs = `[Specification](./${domain}/spec) / [Design](./${domain}/design)`;
    } else if (hasSpec) {
      docs = `[Specification](./${domain})`;
    } else {
      docs = `[Design](./${domain})`;
    }

    rows.push(`| ${label} | ${docs} |`);
  }

  if (rows.length === 0) return;

  const content = `---
title: "Specifications"
sidebar_label: "Overview"
sidebar_position: 0
---

# Specifications

| Component | Documents |
|-----------|-----------|
${rows.join('\n')}
`;

  fs.writeFileSync(path.join(specsDest, 'index.mdx'), content);
  console.log('  Generated specs index page');
}

function generate() {
  const adrCount = countAdrs();
  const specCount = countSpecs();

  const safeTitle = projectTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const content = `---
title: "${safeTitle}"
slug: /
---

# ${projectTitle}

${adrCount > 0 || specCount > 0
    ? 'Browse the architecture decisions and specifications for this project.'
    : 'No architecture artifacts found yet.'}

${adrCount > 0 ? `## Architecture Decisions

This project has **${adrCount}** ADR${adrCount !== 1 ? 's' : ''} documenting key architectural choices.

[Browse Architecture Decisions \u2192](/decisions)
` : ''}
${specCount > 0 ? `## Specifications

This project has **${specCount}** specification${specCount !== 1 ? 's' : ''} defining capability requirements and design.

[Browse Specifications \u2192](/specs)
` : ''}`;

  fs.mkdirSync(DOCS_DEST, { recursive: true });
  fs.writeFileSync(path.join(DOCS_DEST, 'index.mdx'), content);
  console.log('  Generated index page');

  generateSpecsIndex();
}

console.log('Generating index page...');
generate();

module.exports = { generate };
