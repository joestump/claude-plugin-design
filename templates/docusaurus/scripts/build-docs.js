#!/usr/bin/env node
/**
 * Build documentation content
 *
 * Orchestrates the transformation of OpenSpecs and ADRs
 * into Docusaurus-compatible MDX files.
 */

console.log('Building documentation content...\n');

// Build spec mapping first (needed by transforms)
require('./build-spec-mapping');

// Transform OpenSpecs
require('./transform-openspecs');

// Transform ADRs
require('./transform-adrs');

// Generate index page
require('./generate-index');

console.log('\nDocumentation content build complete!');
