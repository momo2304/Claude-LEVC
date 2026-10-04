'use strict';

// Builds a single self-contained HTML file of the home page for sharing a
// preview (no server needed). The booking form shows example call times and
// does not submit anything.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/config');
const { createRenderer } = require('../src/render');

const root = path.join(__dirname, '..');
const renderer = createRenderer(path.join(root, 'views'), { cache: false });
const html = renderer.render('home', {
  brand: config.brand,
  finance: false,
  phone: '',
  email: '',
  title: 'Used LEVC TX Electric Taxis for London Cabbies',
  description: 'Preview',
  canonical: config.siteUrl + '/',
  siteUrl: config.siteUrl,
  year: new Date().getFullYear(),
  nav: { home: true },
  sourcePage: '/',
  defaultInterest: 'used_tx',
  slotMinutesText: '20-minute',
  noindex: true,
});

const css = fs.readFileSync(path.join(root, 'public/assets/styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('<script src="/assets/app.js"'))
  .replace(/href="\/(?!\/)/g, 'href="#');

const out = `<title>Reverie Cab Sales</title>
${fonts}
<style>
${css}
</style>
${body}
<script>window.__REVERIE_PREVIEW__ = true;</script>
<script>
${js}
</script>
`;
fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
fs.writeFileSync(path.join(root, 'preview/index.html'), out);
console.log('Wrote preview/index.html');
