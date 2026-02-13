#!/usr/bin/env node
/**
 * Build documentation content
 *
 * Orchestrates the transformation of OpenSpecs and ADRs
 * into Docusaurus-compatible MDX files.
 */

console.log('Building documentation content...\n');

// Build RFC mapping first (needed by transforms)
require('./build-rfc-mapping');

// Transform OpenSpecs
require('./transform-openspecs');

// Transform ADRs
require('./transform-adrs');

console.log('\nDocumentation content build complete!');
