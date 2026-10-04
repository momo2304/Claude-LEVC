'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { zonedToUtc, zonedParts } = require('../src/time');
const { buildSlots, isOfferedSlot } = require('../src/slots');
const { validateLead, normalisePhone, describeDetails } = require('../src/leads');
const cabs = require('../sites/cabs/site');
const { buildIcs } = require('../src/ics');
const { createRenderer } = require('../src/render');
const path = require('node:path');

const TZ = 'Europe/London';
const booking = {
  slotMinutes: 20,
  capacity: 2,
  leadTimeMinutes: 120,
  daysAhead: 14,
  hours: { 0: null, 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [10, 14] },
  closedDates: [],
};

test('London wall clock converts across BST and GMT', () => {
  assert.equal(new Date(zonedToUtc(2026, 7, 1, 9, 0, TZ)).toISOString(), '2026-07-01T08:00:00.000Z');
  assert.equal(new Date(zonedToUtc(2026, 12, 1, 9, 0, TZ)).toISOString(), '2026-12-01T09:00:00.000Z');
  // Day after clocks go back (25 Oct 2026).
  assert.equal(new Date(zonedToUtc(2026, 10, 26, 9, 0, TZ)).toISOString(), '2026-10-26T09:00:00.000Z');
  assert.equal(zonedParts(Date.parse('2026-10-04T12:00:00Z'), TZ).weekday, 0);
});

test('slots skip Sundays, respect lead time and Saturday hours', () => {
  const now = Date.parse('2026-10-03T09:30:00Z'); // Saturday 10:30 London
  const days = buildSlots(booking, TZ, now);
  const sat = days[0];
  assert.equal(sat.date, '2026-10-03');
  assert.equal(sat.slots[0].label, '12:40'); // 10:30 + 2h lead, rounded up to a slot
  assert.equal(sat.slots.at(-1).label, '13:40');
  assert.ok(!days.some((d) => d.date === '2026-10-04'), 'no Sunday');
  const mon = days.find((d) => d.date === '2026-10-05');
  assert.equal(mon.slots.length, 27);
  assert.equal(mon.slots[0].start, '2026-10-05T08:00:00.000Z');
});

test('full slots are unavailable and closed dates removed', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');
  const counts = new Map([['2026-10-05T08:00:00.000Z', 2]]);
  const days = buildSlots({ ...booking, closedDates: ['2026-10-06'] }, TZ, now, counts);
  assert.equal(days[0].slots[0].available, false);
  assert.ok(!days.some((d) => d.date === '2026-10-06'));
  assert.equal(isOfferedSlot(booking, TZ, now, '2026-10-05T08:00:00.000Z', counts), false);
  assert.equal(isOfferedSlot(booking, TZ, now, '2026-10-05T08:20:00.000Z', counts), true);
  assert.equal(isOfferedSlot(booking, TZ, now, '2026-10-05T08:05:00.000Z', counts), false);
});

test('UK phone numbers normalise to +44', () => {
  assert.equal(normalisePhone('07700 900123'), '+447700900123');
  assert.equal(normalisePhone('+44 (0)20'), null);
  assert.equal(normalisePhone('020 7946 0000'), '+442079460000');
  assert.equal(normalisePhone('0044 7700 900123'), '+447700900123');
  assert.equal(normalisePhone('12345'), null);
  assert.equal(normalisePhone('0900 123 4567'), null);
});

test('lead validation reports each missing field', () => {
  const { errors } = validateLead({}, 2026, cabs.fields);
  for (const f of ['name', 'phone', 'interest', 'licence', 'timeframe', 'slot_start', 'consent_contact']) {
    assert.ok(errors[f], `expected error for ${f}`);
  }
  const ok = validateLead(
    { name: 'A Driver', phone: '07700900123', interest: 'used_tx', licence: 'all_london', timeframe: 'asap', slot_start: '2026-10-05T08:00:00.000Z', consent_contact: true, utm: { utm_source: 'google', evil: 'x' } },
    2026,
    cabs.fields
  );
  assert.ok(ok.lead);
  assert.equal(ok.lead.details.licence, 'all_london');
  assert.deepEqual(JSON.parse(ok.lead.utm), { utm_source: 'google' });
  assert.deepEqual(describeDetails(cabs.fields, ok.lead.details).map((d) => d.value), ['Buying a used LEVC TX', 'Licensed - All London (Green badge)', 'As soon as possible']);
});

test('cab scoring ranks an urgent licensed driver as hot', () => {
  const scoreLead = cabs.score;
  assert.equal(scoreLead({ licence: 'all_london', timeframe: 'asap', plate_year: 2013, payment: 'cash', interest: 'part_exchange' }, 2026).label, 'hot');
  assert.equal(scoreLead({ licence: 'suburban', timeframe: 'researching', interest: 'used_tx' }, 2026).label, 'warm');
  assert.equal(scoreLead({ licence: 'outside_london', timeframe: 'researching', interest: 'sell_cab' }, 2026).label, 'nurture');
});

test('ics escapes text and folds long lines', () => {
  const ics = buildIcs({ uid: 'x', startIso: '2026-10-05T08:00:00.000Z', minutes: 20, summary: 'Call, test; ok', description: 'a'.repeat(200) });
  assert.match(ics, /SUMMARY:Call\\, test\\; ok/);
  assert.match(ics, /DTEND:20261005T082000Z/);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});

test('renderer escapes values and handles sections', () => {
  const r = createRenderer(path.join(__dirname, 'fixtures'));
  assert.equal(r.render('tpl', { a: '<b>', on: true, off: false }).trim(), '&lt;b&gt; yes no-off $&');
});
