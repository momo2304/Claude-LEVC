'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');
const { createNotifier } = require('../src/notify');

// Sunday 4 Oct 2026, 12:00 London.
const NOW = Date.parse('2026-10-04T11:00:00Z');

function makeConfig(overrides = {}) {
  return {
    port: 0,
    siteUrl: 'http://test.local',
    timeZone: 'Europe/London',
    brand: { name: 'Reverie Cab Sales', parent: 'Reverie Autos', legalName: 'Reverie Autos Ltd', companyNumber: '09304340', address: 'x', phone: '', email: '', trustpilotUrl: '#' },
    finance: { fcaStatement: '', enabled: false },
    booking: { slotMinutes: 20, capacity: 1, leadTimeMinutes: 120, daysAhead: 14, hours: { 0: null, 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [10, 14] }, closedDates: [] },
    notify: { webhookUrl: 'http://hook.local/x', resendApiKey: '', fromEmail: '', salesEmails: [] },
    admin: { user: 'sales', password: 'pw' },
    ...overrides,
  };
}

async function start(config = makeConfig()) {
  const db = openDb(':memory:');
  const hooks = [];
  const fetchImpl = async (url, opts) => { hooks.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200 }; };
  const silent = { log() {}, error() {} };
  const notifier = createNotifier(config, { fetchImpl, log: silent });
  const server = http.createServer(createApp({ config, db, notifier, now: () => NOW, log: silent }));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, hooks, db, close: () => new Promise((r) => server.close(r)) };
}

const lead = (slot, extra = {}) => ({
  name: 'Test Driver', phone: '07700 900123', interest: 'part_exchange', licence: 'all_london',
  current_vehicle: 'tx4', plate_year: '2013', timeframe: 'asap', slot_start: slot, consent_contact: true, ...extra,
});

const post = (url, body, headers = {}) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('booking flow: create, double-book blocked, reschedule, cancel', async () => {
  const s = await start();
  try {
    const slots = await (await fetch(`${s.base}/api/slots`)).json();
    assert.equal(slots.days[0].date, '2026-10-05');
    const first = slots.days[0].slots[0].start;

    const res = await post(`${s.base}/api/leads`, lead(first));
    assert.equal(res.status, 201);
    const { token, booking } = await res.json();
    assert.equal(booking.when, 'Monday 5 October at 09:00');

    await new Promise((r) => setImmediate(r));
    assert.equal(s.hooks.length, 1);
    assert.equal(s.hooks[0].body.event, 'booked');
    assert.equal(s.hooks[0].body.lead.score_label, 'hot');
    assert.equal(s.hooks[0].body.lead.manage_token, undefined, 'token never leaves via webhook');

    const clash = await post(`${s.base}/api/leads`, lead(first, { phone: '07700900999' }));
    assert.equal(clash.status, 409);

    const second = slots.days[0].slots[3].start;
    const moved = await post(`${s.base}/api/bookings/${token}/reschedule`, { slot_start: second });
    assert.equal(moved.status, 200);
    assert.equal((await moved.json()).booking.slot_start, second);

    // The original slot is free again.
    assert.equal((await post(`${s.base}/api/leads`, lead(first, { phone: '07700900999' }))).status, 201);

    const cancelled = await post(`${s.base}/api/bookings/${token}/cancel`, {});
    assert.equal((await cancelled.json()).booking.status, 'cancelled');

    const ics = await fetch(`${s.base}/api/bookings/${token}/ics`);
    assert.match(await ics.text(), /STATUS:CANCELLED/);
  } finally {
    await s.close();
  }
});

test('rejects bad input, past slots, honeypot and cross-origin posts', async () => {
  const s = await start();
  try {
    const bad = await post(`${s.base}/api/leads`, { name: 'x' });
    assert.equal(bad.status, 422);
    const past = await post(`${s.base}/api/leads`, lead('2026-10-04T08:00:00.000Z'));
    assert.equal(past.status, 409);
    const bot = await post(`${s.base}/api/leads`, { company_website: 'spam' });
    assert.equal(bot.status, 201);
    assert.equal(s.db.allLeads().length, 0);
    const xo = await post(`${s.base}/api/leads`, lead('2026-10-05T08:00:00.000Z'), { origin: 'https://evil.example' });
    assert.equal(xo.status, 403);
  } finally {
    await s.close();
  }
});

test('admin requires auth and updates status', async () => {
  const s = await start();
  try {
    assert.equal((await fetch(`${s.base}/admin`)).status, 401);
    const auth = { authorization: 'Basic ' + Buffer.from('sales:pw').toString('base64') };
    await post(`${s.base}/api/leads`, lead('2026-10-05T08:00:00.000Z', { name: '<script>x</script>' }));
    const page = await (await fetch(`${s.base}/admin`, { headers: auth })).text();
    assert.ok(page.includes('&lt;script&gt;'), 'names are escaped');
    const id = s.db.allLeads()[0].id;
    const upd = await fetch(`${s.base}/admin/leads/${id}`, {
      method: 'POST', redirect: 'manual',
      headers: { ...auth, 'content-type': 'application/x-www-form-urlencoded' },
      body: 'status=qualified&sales_notes=Wants+black+Vista',
    });
    assert.equal(upd.status, 303);
    assert.equal(s.db.getById(id).status, 'qualified');
    const csv = await (await fetch(`${s.base}/admin/export.csv`, { headers: auth })).text();
    assert.match(csv, /Wants black Vista/);
  } finally {
    await s.close();
  }
});

test('pages render, finance page hidden until FCA wording is set', async () => {
  const s = await start();
  try {
    for (const p of ['/', '/used-levc-tx', '/sell-or-part-exchange-your-cab', '/privacy']) {
      const res = await fetch(`${s.base}${p}`);
      assert.equal(res.status, 200, p);
      const html = await res.text();
      assert.ok(!/\{\{/.test(html), `no template tags left on ${p}`);
      assert.ok(html.includes('not affiliated with'), `independence disclaimer on ${p}`);
    }
    const fin = await fetch(`${s.base}/levc-tx-finance`, { redirect: 'manual' });
    assert.equal(fin.status, 302);
    assert.ok(!(await (await fetch(`${s.base}/sitemap.xml`)).text()).includes('finance'));
  } finally {
    await s.close();
  }
  const f = await start(makeConfig({ finance: { fcaStatement: 'Reverie Autos Ltd is authorised and regulated by the FCA (FRN 000000).', enabled: true } }));
  try {
    const html = await (await fetch(`${f.base}/levc-tx-finance`)).text();
    assert.ok(html.includes('FRN 000000'));
  } finally {
    await f.close();
  }
});
