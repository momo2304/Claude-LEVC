'use strict';

// Lead form options. Keys are stored; labels are shown to customers and sales.
const OPTIONS = {
  interest: {
    used_tx: 'Buying a used LEVC TX',
    part_exchange: 'Part-exchanging my current cab',
    sell_cab: 'Selling my cab outright',
    finance: 'Finance options',
    fleet: 'Fleet / multiple cabs',
  },
  licence: {
    all_london: 'Licensed - All London (Green badge)',
    suburban: 'Licensed - Suburban (Yellow badge)',
    knowledge: 'Doing the Knowledge',
    fleet_operator: 'Fleet operator',
    outside_london: 'Licensed outside London',
  },
  current_vehicle: {
    tx4: 'TX4 (diesel)',
    vito: 'Mercedes Vito taxi',
    tx_electric: 'LEVC TX (electric)',
    other: 'Other',
    none: 'No cab at the moment',
  },
  payment: {
    cash: 'Cash / bank transfer',
    finance: 'Finance',
    px_plus_cash: 'Part-exchange plus balance',
    unsure: 'Not sure yet',
  },
  timeframe: {
    asap: 'As soon as possible',
    '1_3_months': 'In 1-3 months',
    '3_6_months': 'In 3-6 months',
    researching: 'Just researching',
  },
};

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

// Validates the public form. Returns { lead } or { errors }.
function validateLead(body, nowYear) {
  const errors = {};
  const lead = {
    name: clean(body.name, 80),
    phone: normalisePhone(body.phone),
    email: clean(body.email, 120).toLowerCase(),
    interest: clean(body.interest, 40),
    licence: clean(body.licence, 40),
    current_vehicle: clean(body.current_vehicle, 40) || null,
    plate_year: body.plate_year ? Number.parseInt(body.plate_year, 10) : null,
    payment: clean(body.payment, 40) || null,
    timeframe: clean(body.timeframe, 40),
    message: clean(body.message, 1000) || null,
    slot_start: clean(body.slot_start, 40),
    consent_marketing: body.consent_marketing === true || body.consent_marketing === 'on' ? 1 : 0,
    source_page: clean(body.source_page, 120) || null,
    utm: body.utm && typeof body.utm === 'object' ? JSON.stringify(pickUtm(body.utm)) : null,
  };

  if (lead.name.length < 2) errors.name = 'Please tell us your name.';
  if (!lead.phone) errors.phone = 'Please enter a UK phone number we can call.';
  if (lead.email && !validEmail(lead.email)) errors.email = 'That email address does not look right.';
  if (!lead.email) lead.email = null;
  for (const field of ['interest', 'licence', 'timeframe']) {
    if (!OPTIONS[field][lead[field]]) errors[field] = 'Please choose an option.';
  }
  for (const field of ['current_vehicle', 'payment']) {
    if (lead[field] && !OPTIONS[field][lead[field]]) errors[field] = 'Please choose an option.';
  }
  if (lead.plate_year !== null && (!Number.isInteger(lead.plate_year) || lead.plate_year < 2000 || lead.plate_year > nowYear)) {
    errors.plate_year = 'Please enter the year the cab was first registered.';
  }
  if (!lead.slot_start || Number.isNaN(Date.parse(lead.slot_start))) errors.slot_start = 'Please pick a call time.';
  if (body.consent_contact !== true && body.consent_contact !== 'on') {
    errors.consent_contact = 'We need your OK to call you about your enquiry.';
  }

  return Object.keys(errors).length ? { errors } : { lead };
}

function pickUtm(utm) {
  const out = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'referrer']) {
    if (utm[key]) out[key] = clean(utm[key], 200);
  }
  return out;
}

// Simple priority score so sales call the hottest leads first.
function scoreLead(lead, nowYear) {
  let score = 0;
  if (['all_london', 'suburban', 'fleet_operator'].includes(lead.licence)) score += 3;
  else if (lead.licence === 'knowledge') score += 1;

  score += { asap: 3, '1_3_months': 2, '3_6_months': 1, researching: 0 }[lead.timeframe] || 0;

  // A TfL cab must leave the London fleet at 15 years old, so older cabs mean urgency.
  if (lead.plate_year && nowYear - lead.plate_year >= 12) score += 2;
  if (lead.payment && lead.payment !== 'unsure') score += 1;
  if (['used_tx', 'fleet', 'part_exchange'].includes(lead.interest)) score += 1;

  const label = score >= 7 ? 'hot' : score >= 4 ? 'warm' : 'nurture';
  return { score, label };
}

function label(field, key) {
  return (OPTIONS[field] && OPTIONS[field][key]) || key || '';
}

module.exports = { OPTIONS, STATUSES, validateLead, scoreLead, normalisePhone, label, clean };
