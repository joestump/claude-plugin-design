/**
 * Shared transform utilities for ADR and OpenSpec transforms
 *
 * Contains common functions used by both transform-adrs.js and
 * transform-openspecs.js: RFC 2119 keyword highlighting, spec/ADR
 * cross-references, markdown link fixing, and JSX tag escaping.
 */

const fs = require('fs');

/**
 * Build a mapping of ADR numbers to their URL paths.
 */
function buildAdrMapping(adrsSource) {
  const mapping = {};
  if (!fs.existsSync(adrsSource)) return mapping;

  const files = fs.readdirSync(adrsSource);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    if (file === '0000-template.md' || file === 'README.md') continue;

    const match = file.match(/^(?:ADR-)?(\d{4})-/);
    if (match) {
      const number = match[1];
      const slug = file.replace(/\.md$/, '');
      mapping[number] = `/decisions/${slug}`;
    }
  }
  return mapping;
}

/**
 * Transform RFC 2119 keywords (MUST, SHALL, MAY, etc.) into highlighted spans.
 * Skips code blocks, headings, indented lines, and inline code spans.
 */
function transformRfc2119Keywords(content) {
  const keywordPattern = /\b(MUST NOT|SHALL NOT|SHOULD NOT|MUST|SHALL|REQUIRED|SHOULD|RECOMMENDED|MAY|OPTIONAL)\b/g;
  const keywordClasses = {
    'MUST NOT': 'must', 'SHALL NOT': 'shall', 'SHOULD NOT': 'should',
    'MUST': 'must', 'SHALL': 'shall', 'REQUIRED': 'required',
    'SHOULD': 'should', 'RECOMMENDED': 'recommended',
    'MAY': 'may', 'OPTIONAL': 'optional',
  };

  const lines = content.split('\n');
  return lines.map(line => {
    if (line.startsWith('```') || line.startsWith('#') || line.startsWith('    ')) return line;
    if (line.match(/^`[^`]+`$/)) return line;

    // Process segments outside of inline code spans
    const parts = line.split(/(`[^`]+`)/);
    return parts.map(part => {
      if (part.startsWith('`') && part.endsWith('`')) return part;
      return part.replace(keywordPattern, (match) => {
        const cls = keywordClasses[match];
        return `<span className="rfc-keyword ${cls}">${match}</span>`;
      });
    }).join('');
  }).join('\n');
}

/**
 * Transform spec ID references (e.g., ARCH-001) into linked spans.
 */
function transformSpecReferences(content, { specMapping, specEmojis, baseUrl }) {
  const specPattern = /\b([A-Z]+)-(\d{3,4})\b/g;
  const lines = content.split('\n');
  let inCodeBlock = false;

  return lines.map(line => {
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; return line; }
    if (inCodeBlock || line.startsWith('#')) return line;
    if (line.trim().startsWith('<') && !line.includes('className="rfc-keyword')) return line;

    return line.replace(specPattern, (match, prefix, number) => {
      const specPath = specMapping[prefix];
      const emoji = specEmojis[prefix];
      if (!specPath) return match;
      const displayText = emoji ? `${emoji} ${match}` : match;
      const anchorId = match.toLowerCase();
      return `<a href="${baseUrl}${specPath}#${anchorId}" className="rfc-ref">${displayText}</a>`;
    });
  }).join('\n');
}

/**
 * Transform ADR references (e.g., ADR-0001) into linked spans.
 */
function transformAdrReferences(content, { adrMapping, adrEmoji, baseUrl }) {
  const adrPattern = /\bADR-(\d{4})\b/g;
  const lines = content.split('\n');
  let inCodeBlock = false;

  return lines.map(line => {
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; return line; }
    if (inCodeBlock || line.startsWith('#')) return line;
    if (line.trim().startsWith('<') && !line.includes('className="rfc-keyword') && !line.includes('className="rfc-ref')) return line;

    return line.replace(adrPattern, (match, number) => {
      const adrPath = adrMapping[number];
      if (!adrPath) return match;
      const displayText = `${adrEmoji} ${match}`;
      return `<a href="${baseUrl}${adrPath}" className="rfc-ref">${displayText}</a>`;
    });
  }).join('\n');
}

/**
 * Strip .md extensions from markdown links (Docusaurus uses extensionless routes).
 */
function fixMarkdownLinks(content) {
  return content.replace(/\]\(((?!https?:\/\/)[^)]*?)\.md(#[^)]*?)?\)/g, ']($1$2)');
}

/**
 * Escape non-HTML tags that MDX would interpret as JSX components.
 */
function escapeJsxLikeTags(content) {
  const htmlTags = ['div', 'span', 'a', 'p', 'br', 'hr', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'pre', 'code', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i'];

  const lines = content.split('\n');
  return lines.map(line => {
    let result = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '`') {
        const start = i;
        i++;
        while (i < line.length && line[i] !== '`') { i++; }
        if (i < line.length) { i++; }
        result += line.slice(start, i);
      } else {
        const remaining = line.slice(i);
        const tagMatch = remaining.match(/^<([a-z][a-z0-9_-]*(?:\|[a-z][a-z0-9_-]*)*)>/i);
        if (tagMatch && !htmlTags.includes(tagMatch[1].split('|')[0].toLowerCase())) {
          result += `\\<${tagMatch[1]}\\>`;
          i += tagMatch[0].length;
        } else if (remaining.match(/^<\d/)) {
          result += '\\<';
          i++;
        } else {
          result += line[i];
          i++;
        }
      }
    }
    return result;
  }).join('\n');
}

module.exports = {
  buildAdrMapping,
  transformRfc2119Keywords,
  transformSpecReferences,
  transformAdrReferences,
  fixMarkdownLinks,
  escapeJsxLikeTags,
};
