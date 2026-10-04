'use strict';

const path = require('node:path');
const fs = require('node:fs');

const SITES_DIR = path.join(__dirname, '..', 'sites');

// Loads sites/<id>/site.js and fills in the directories it uses.
function loadSite(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid SITE "${id}"`);
  const dir = path.join(SITES_DIR, id);
  if (!fs.existsSync(path.join(dir, 'site.js'))) {
    const known = fs.readdirSync(SITES_DIR).filter((d) => fs.existsSync(path.join(SITES_DIR, d, 'site.js')));
    throw new Error(`Unknown SITE "${id}". Available: ${known.join(', ')}`);
  }
  const site = require(path.join(dir, 'site.js'));
  for (const name of ['interest', 'timeframe']) {
    if (!site.fields.some((f) => f.name === name && f.options)) {
      throw new Error(`Site "${id}" must define a "${name}" choice field`);
    }
  }
  return { id, viewsDir: path.join(dir, 'views'), publicDir: path.join(dir, 'public'), ...site };
}

module.exports = { loadSite, SITES_DIR };
