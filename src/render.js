'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Tiny template engine:
//   {{key}}            escaped value
//   {{{key}}}          raw value
//   {{> partial}}      include views/partials/partial.html
//   {{#key}}...{{/key}} block shown when key is truthy
//   {{^key}}...{{/key}} block shown when key is falsy

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createRenderer(viewsDir, { cache = true } = {}) {
  const files = new Map();

  function read(file) {
    if (cache && files.has(file)) return files.get(file);
    const text = fs.readFileSync(file, 'utf8');
    if (cache) files.set(file, text);
    return text;
  }

  function lookup(data, key) {
    return key.split('.').reduce((obj, k) => (obj == null ? undefined : obj[k]), data);
  }

  function expand(template, data, depth = 0) {
    if (depth > 5) throw new Error('partials nested too deeply');
    let out = template.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) =>
      expand(read(path.join(viewsDir, 'partials', `${name}.html`)), data, depth + 1)
    );
    // Sections, innermost first so nesting works.
    const section = /\{\{([#^])([\w.]+)\}\}((?:(?!\{\{[#^][\w.]+\}\})[\s\S])*?)\{\{\/\2\}\}/;
    let match;
    while ((match = section.exec(out))) {
      const [all, kind, key, inner] = match;
      const truthy = Boolean(lookup(data, key));
      const keep = (kind === '#') === truthy ? inner : '';
      out = out.slice(0, match.index) + keep + out.slice(match.index + all.length);
    }
    out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => String(lookup(data, key) ?? ''));
    out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => escapeHtml(lookup(data, key)));
    return out;
  }

  return {
    render(view, data) {
      return expand(read(path.join(viewsDir, `${view}.html`)), data);
    },
  };
}

module.exports = { createRenderer, escapeHtml };
