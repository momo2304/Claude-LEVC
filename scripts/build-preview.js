'use strict';

// Builds a single self-contained HTML file of a site's home page for sharing
// a preview (no server needed). The booking form shows example call times and
// does not submit anything.
//   node scripts/build-preview.js [site]   (default: cabs)
const fs = require('node:fs');
const path = require('node:path');
const { buildConfig } = require('../src/config');
const { createRenderer } = require('../src/render');

const root = path.join(__dirname, '..');
const config = buildConfig({ ...process.env, SITE: process.argv[2] || process.env.SITE || 'cabs' });
const { site } = config;
const home = site.pages['/'];

const html = createRenderer(site.viewsDir, { cache: false }).render(home.view, {
  brand: config.brand,
  finance: false,
  phone: '',
  email: '',
  title: home.title,
  description: home.description,
  canonical: config.siteUrl + '/',
  siteUrl: config.siteUrl,
  year: new Date().getFullYear(),
  nav: { home: true },
  sourcePage: '/',
  defaultInterest: home.defaultInterest || '',
  defaultModel: '',
  slotMinutesText: `${config.booking.slotMinutes}-minute`,
  page: {},
  site: site.templateData || {},
  noindex: true,
});

const read = (dir, file) => {
  const p = path.join(dir, 'assets', file);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};
const css = read(site.publicDir, 'styles.css');
const scripts = [read(path.join(root, 'shared', 'public'), 'booking.js'), read(site.publicDir, `${site.id}.js`)].filter(Boolean);
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('<script src="/assets/'))
  .replace(/href="\/(?!\/)/g, 'href="#')
  // Images are published next to the preview file.
  .replace(/(src|srcset)="\/assets\//g, '$1="assets/')
  .replace(/, \/assets\//g, ', assets/');

const out = `<title>${config.brand.name}</title>
${fonts}
<style>
${css}
</style>
${body}
<script>window.__REVERIE_PREVIEW__ = true;</script>
${scripts.map((js) => `<script>\n${js}\n</script>`).join('\n')}
`;
const outDir = path.join(root, 'preview');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${site.id}.html`), out);
console.log(`Wrote preview/${site.id}.html`);
