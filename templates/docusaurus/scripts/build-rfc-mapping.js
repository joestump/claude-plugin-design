#!/usr/bin/env node
/**
 * Build RFC-to-Spec Mapping
 *
 * Scans all OpenSpec files to extract RFC ID prefixes and generates
 * a mapping from prefix to spec URL path.
 *
 * Output: src/data/rfc-mapping.json
 */

const fs = require('fs');
const path = require('path');

const SPECS_SOURCE = path.join(__dirname, '../../openspec/specs');
const MAPPING_DEST = path.join(__dirname, '../src/data/rfc-mapping.json');
const EMOJIS_DEST = path.join(__dirname, '../src/data/rfc-emojis.json');

function buildMapping() {
  const mapping = {};

  if (!fs.existsSync(SPECS_SOURCE)) {
    console.log('  No specs directory found, skipping RFC mapping');
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

    // Match RFC IDs in table format: | ARCH-001 | ... |
    const matches = content.matchAll(/\|\s*([A-Z]+)-\d{3,4}\s*\|/g);

    const prefixes = new Set();
    for (const match of matches) {
      prefixes.add(match[1]);
    }

    // Also match RFC IDs in requirement headings: ### Requirement: ARCH-001
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

  console.log(`  Generated RFC mapping with ${Object.keys(mapping).length} prefixes`);
  return mapping;
}

if (require.main === module) {
  console.log('Building RFC mapping...');
  buildMapping();
}

module.exports = { buildMapping };
