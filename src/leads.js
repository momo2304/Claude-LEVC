'use strict';

// Lead validation shared by every site. Each site describes its own questions
// as a list of fields (see sites/*/site.js); answers are stored in `details`.
//
// Field shape:
//   { name, label, required?, options?: { key: label }, type?: 'choice' | 'year' | 'text', max? }
// Every site must define `interest` and `timeframe` choice fields: they are
// kept in their own columns for filtering.

const STATUSES = ['booked', 'called', 'no_answer', 'qualified', 'won', 'lost', 'cancelled'];

function clean(value, max = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// UK mobile or landline, normalised to +44 format.
function normalisePhone(raw) {
  const digits = clean(raw, 30).replace(/[\s\-().]/g, '');
  let national;
  if (/^\+44\d{9,10}$/.test(digits)) national = digits.slice(3);
  else if (/^0044\d{9,10}$/.test(digits)) national = digits.slice(4);
  else if (/^0\d{9,10}$/.test(digits)) national = digits.slice(1);
  else return null;
  if (!/^[1-37]\d{8,9}$/.test(national)) return null;
  return `+44${national}`;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function pickUtm(utm) {
  const out = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'referrer']) {
    if (utm[key]) out[key] = clean(utm[key], 200);
  }
  return out;
}

function isTicked(v) {
  return v === true || v === 'on' || v === 'true';
}

// Validates the public form against a site's fields. Returns { lead } or { errors }.
function validateLead(body, nowYear, fields) {
  const errors = {};
  const details = {};

  for (const f of fields) {
    const type = f.type || (f.options ? 'choice' : 'text');
    const raw = clean(body[f.name], f.max || 200);
    if (!raw) {
      if (f.required) errors[f.name] = type === 'choice' ? 'Please choose an option.' : 'Please fill this in.';
      continue;
    }
    if (type === 'choice' && !f.options[raw]) {
      errors[f.name] = 'Please choose an option.';
    } else if (type === 'year') {
      const y = Number.parseInt(raw, 10);
      if (!/^\d{4}$/.test(raw) || y < 2000 || y > nowYear + 1) errors[f.name] = 'Please enter a year like 2022.';
      else details[f.name] = y;
    } else {
      details[f.name] = raw;
    }
  }

  const lead = {
    name: clean(body.name, 80),
    phone: normalisePhone(body.phone),
    email: clean(body.email, 120).toLowerCase() || null,
    message: clean(body.message, 1000) || null,
    slot_start: clean(body.slot_start, 40),
    consent_marketing: isTicked(body.consent_marketing) ? 1 : 0,
    source_page: clean(body.source_page, 120) || null,
    utm: body.utm && typeof body.utm === 'object' ? JSON.stringify(pickUtm(body.utm)) : null,
    interest: details.interest || null,
    timeframe: details.timeframe || null,
    details,
  };

  if (lead.name.length < 2) errors.name = 'Please tell us your name.';
  if (!lead.phone) errors.phone = 'Please enter a UK phone number we can call.';
  if (lead.email && !validEmail(lead.email)) errors.email = 'That email address does not look right.';
  if (!lead.slot_start || Number.isNaN(Date.parse(lead.slot_start))) errors.slot_start = 'Please pick a call time.';
  if (!isTicked(body.consent_contact)) errors.consent_contact = 'We need your OK to call you about your enquiry.';

  return Object.keys(errors).length ? { errors } : { lead };
}

// Human-readable label for a stored answer.
function labelFor(fields, name, value) {
  const f = fields.find((x) => x.name === name);
  if (value === undefined || value === null || value === '') return '';
  return (f && f.options && f.options[value]) || String(value);
}

// [{ label, value }] for every answered field, in the site's order.
function describeDetails(fields, details) {
  return fields
    .filter((f) => details[f.name] !== undefined && details[f.name] !== null && details[f.name] !== '')
    .map((f) => ({ name: f.name, label: f.label, value: labelFor(fields, f.name, details[f.name]) }));
}

module.exports = { STATUSES, validateLead, normalisePhone, clean, labelFor, describeDetails };
