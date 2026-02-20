#!/usr/bin/env node
/**
 * Build Spec ID Mapping
 *
 * Scans all OpenSpec files to extract spec ID prefixes and generates
 * a mapping from prefix to spec URL path.
 *
 * Output: src/data/spec-mapping.json
 */

const fs = require('fs');
const path = require('path');

const SPECS_SOURCE = path.join(__dirname, '../../docs/openspec/specs');
const MAPPING_DEST = path.join(__dirname, '../src/data/spec-mapping.json');
const EMOJIS_DEST = path.join(__dirname, '../src/data/spec-emojis.json');

function buildMapping() {
  const mapping = {};

  if (!fs.existsSync(SPECS_SOURCE)) {
    console.log('  No specs directory found, skipping spec mapping');
    fs.mkdirSync(path.dirname(MAPPING_DEST), { recursive: true });
    fs.writeFileSync(MAPPING_DEST, JSON.stringify(mapping, null, 2));
    return mapping;
  }

  const domains = fs.readdirSync(SPECS_SOURCE);

  for (const domain of domains) {
    const domainPath = path.join(SPECS_SOURCE, domain);
    if (!fs.statSync(domainPath).isDirectory()) continue;

    const specPath = path.join(domainPath, 'spec.md');
    if (!fs.existsSync(specPath)) continue;

    const content = fs.readFileSync(specPath, 'utf-8');

    const prefixes = new Set();

    // Match spec number from H1 heading: # SPEC-XXXX: {Title}
    const h1Match = content.match(/^#\s+([A-Z]+)-\d{4}:/m);
    if (h1Match) {
      prefixes.add(h1Match[1]);
    }

    // Also match spec IDs in table format: | ARCH-001 | ... |
    const tableMatches = content.matchAll(/\|\s*([A-Z]+)-\d{3,4}\s*\|/g);
    for (const match of tableMatches) {
      prefixes.add(match[1]);
    }

    // Also match spec IDs in requirement headings: ### Requirement: ARCH-001
    const headingMatches = content.matchAll(/###\s+Requirement:.*?([A-Z]+)-\d{3,4}/g);
    for (const match of headingMatches) {
      prefixes.add(match[1]);
    }

    for (const prefix of prefixes) {
      mapping[prefix] = `/specs/${domain}/spec`;
    }
  }

  fs.mkdirSync(path.dirname(MAPPING_DEST), { recursive: true });
  fs.writeFileSync(MAPPING_DEST, JSON.stringify(mapping, null, 2));

  // Also ensure emojis file exists (user can customize)
  if (!fs.existsSync(EMOJIS_DEST)) {
    fs.writeFileSync(EMOJIS_DEST, JSON.stringify({}, null, 2));
  }

  console.log(`  Generated spec mapping with ${Object.keys(mapping).length} prefixes`);
  return mapping;
}

if (require.main === module) {
  console.log('Building spec mapping...');
  buildMapping();
}

module.exports = { buildMapping };
