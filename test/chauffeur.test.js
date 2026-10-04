'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');
const { createNotifier } = require('../src/notify');
const { buildConfig } = require('../src/config');
const { validateLead } = require('../src/leads');
const site = require('../sites/chauffeur/site');

const NOW = Date.parse('2026-10-04T11:00:00Z');

async function start() {
  const config = buildConfig({ SITE: 'chauffeur', SITE_URL: 'http://test.local', SALES_WEBHOOK_URL: 'http://hook.local', ADMIN_PASSWORD: 'pw' });
  const db = openDb(':memory:');
  const hooks = [];
  const silent = { log() {}, error() {} };
  const fetchImpl = async (url, opts) => { hooks.push(JSON.parse(opts.body)); return { ok: true, status: 200 }; };
  const server = http.createServer(createApp({ config, db, notifier: createNotifier(config, { fetchImpl, log: silent }), now: () => NOW, log: silent }));
  await new Promise((r) => server.listen(0, r));
  return { base: `http://127.0.0.1:${server.address().port}`, db, hooks, close: () => new Promise((r) => server.close(r)) };
}

test('chauffeur scoring favours licensed, urgent drivers with ageing cars', () => {
  assert.equal(site.score({ licence: 'tfl', timeframe: 'asap', current_year: 2021, business: 'ltd', budget: '60_80', interest: 'buy' }, 2026).label, 'hot');
  assert.equal(site.score({ licence: 'applying', timeframe: '3_6_months', interest: 'buy' }, 2026).label, 'nurture');
  assert.equal(site.score({ licence: 'council', timeframe: '1_3_months', interest: 'part_exchange' }, 2026).label, 'warm');
});

test('rental businesses and council-licensed S-Class buyers score as priority leads', () => {
  assert.equal(site.score({ licence: 'business', interest: 'rental', timeframe: '1_3_months' }, 2026).label, 'hot');
  assert.equal(site.score({ licence: 'both', interest: 'buy', model: 's_class', timeframe: '1_3_months' }, 2026).label, 'warm');
  const { lead } = validateLead({ interest: 'rental', model: 'v_class', condition: 'new', work: 'rental', licence: 'business', timeframe: 'asap', name: 'Fleet Co', phone: '07700900111', slot_start: '2026-10-05T08:00:00.000Z', consent_contact: true }, 2026, site.fields);
  assert.equal(lead.details.condition, 'new');
});

test('every photo on the site has a credit', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'sites', 'chauffeur', 'public', 'assets', 'img');
  const credited = new Set(site.templateData.credits.map((c) => c.slug));
  credited.add('s-class-card'); // crop of s-class-hero
  for (const f of fs.readdirSync(dir).filter((x) => /\.(jpg|webp)$/.test(x))) {
    assert.ok(credited.has(f.replace(/-\d+\.(jpg|webp)$/, '')), `no credit for ${f}`);
  }
});

test('chauffeur form requires model, work and licence', () => {
  const { errors } = validateLead({ interest: 'buy', timeframe: 'asap' }, 2026, site.fields);
  for (const f of ['model', 'work', 'licence']) assert.ok(errors[f], f);
  const { errors: bad } = validateLead({ interest: 'buy', model: 'tesla', work: 'uber', licence: 'tfl', timeframe: 'asap' }, 2026, site.fields);
  assert.ok(bad.model);
});

test('every chauffeur page renders with disclaimers and no template tags', async () => {
  const s = await start();
  try {
    for (const p of Object.keys(site.pages)) {
      const res = await fetch(`${s.base}${p}`, { redirect: 'manual' });
      if (site.pages[p].needsFinance) { assert.equal(res.status, 302); continue; }
      assert.equal(res.status, 200, p);
      const html = await res.text();
      assert.ok(!/\{\{/.test(html), `template tags left on ${p}`);
      assert.ok(html.includes('not affiliated with or endorsed by Uber'), `platform disclaimer on ${p}`);
    }
    const sItem = await (await fetch(`${s.base}/mercedes-s-class`)).text();
    assert.ok(sItem.includes('data-default-model="s_class"'));
    assert.ok(sItem.includes('Wheely First'));
  } finally {
    await s.close();
  }
});

test('chauffeur booking stores answers and sends labelled webhook', async () => {
  const s = await start();
  try {
    const slots = await (await fetch(`${s.base}/api/slots`)).json();
    const res = await fetch(`${s.base}/api/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        interest: 'buy', model: 'eqs', work: 'several', licence: 'tfl', business: 'sole_trader', budget: '40_60',
        current_car: '2021 E 300 e', current_year: '2021', timeframe: '1_3_months',
        slot_start: slots.days[0].slots[0].start, name: 'Exec Driver', phone: '07700900321', consent_contact: true,
      }),
    });
    assert.equal(res.status, 201);
    await new Promise((r) => setImmediate(r));
    const lead = s.db.allLeads()[0];
    assert.equal(lead.details.model, 'eqs');
    assert.equal(lead.details.current_year, 2021);
    const answers = Object.fromEntries(s.hooks[0].answers.map((a) => [a.name, a.value]));
    assert.equal(answers.model, 'Mercedes EQS');
    assert.equal(answers.work, 'Several platforms');
  } finally {
    await s.close();
  }
});
