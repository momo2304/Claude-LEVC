'use strict';

// Reverie Cab Sales: used LEVC TX taxis for London cab drivers.

const fields = [
  {
    name: 'interest',
    label: 'Interested in',
    required: true,
    options: {
      used_tx: 'Buying a used LEVC TX',
      part_exchange: 'Part-exchanging my current cab',
      sell_cab: 'Selling my cab outright',
      finance: 'Finance options',
      fleet: 'Fleet / multiple cabs',
    },
  },
  {
    name: 'licence',
    label: 'Licence',
    required: true,
    options: {
      all_london: 'Licensed - All London (Green badge)',
      suburban: 'Licensed - Suburban (Yellow badge)',
      knowledge: 'Doing the Knowledge',
      fleet_operator: 'Fleet operator',
      outside_london: 'Licensed outside London',
    },
  },
  {
    name: 'current_vehicle',
    label: 'Current cab',
    options: {
      tx4: 'TX4 (diesel)',
      vito: 'Mercedes Vito taxi',
      tx_electric: 'LEVC TX (electric)',
      other: 'Other',
      none: 'No cab at the moment',
    },
  },
  { name: 'plate_year', label: 'First registered', type: 'year' },
  {
    name: 'payment',
    label: 'Paying by',
    options: {
      cash: 'Cash / bank transfer',
      finance: 'Finance',
      px_plus_cash: 'Part-exchange plus balance',
      unsure: 'Not sure yet',
    },
  },
  {
    name: 'timeframe',
    label: 'Timeframe',
    required: true,
    options: {
      asap: 'As soon as possible',
      '1_3_months': 'In 1-3 months',
      '3_6_months': 'In 3-6 months',
      researching: 'Just researching',
    },
  },
];

// Simple priority score so sales call the hottest leads first.
function score(d, nowYear) {
  let s = 0;
  if (['all_london', 'suburban', 'fleet_operator'].includes(d.licence)) s += 3;
  else if (d.licence === 'knowledge') s += 1;
  s += { asap: 3, '1_3_months': 2, '3_6_months': 1 }[d.timeframe] || 0;
  // A TfL cab must leave the London fleet at 15 years old, so older cabs mean urgency.
  if (d.plate_year && nowYear - d.plate_year >= 12) s += 2;
  if (d.payment && d.payment !== 'unsure') s += 1;
  if (['used_tx', 'fleet', 'part_exchange'].includes(d.interest)) s += 1;
  return { score: s, label: s >= 7 ? 'hot' : s >= 4 ? 'warm' : 'nurture' };
}

module.exports = {
  brand: {
    name: 'Reverie Cab Sales',
    parent: 'Reverie Autos',
    legalName: 'Reverie Autos Ltd',
    companyNumber: '09304340',
    address: '57 Great North Road, Welwyn Garden City, AL8 7TL',
    trustpilotUrl: 'https://uk.trustpilot.com/review/reverieautos.co.uk',
    icsProdId: 'Reverie Cab Sales',
  },
  fields,
  score,
  pages: {
    '/': {
      view: 'home',
      title: 'Used LEVC TX Electric Taxis for London Cabbies',
      description: 'New TX assembly has ended and the next LEVC cab is not due until late 2027. Book a call with Reverie Cab Sales to source a used LEVC TX or move on from your TX4.',
      nav: 'home',
      defaultInterest: 'used_tx',
    },
    '/used-levc-tx': {
      view: 'used-tx',
      title: 'Used LEVC TX for Sale, Sourced and Prepared for TfL',
      description: 'Used LEVC TX electric taxis sourced, checked and prepared for TfL licensing. Tell us your spec and budget and book a call with a cab specialist.',
      nav: 'used',
      defaultInterest: 'used_tx',
    },
    '/sell-or-part-exchange-your-cab': {
      view: 'part-exchange',
      title: 'Sell or Part-Exchange Your TX4, Vito or TX',
      description: 'Your London taxi licence ends at 15 years. Get a straight valuation for your TX4, Vito or TX and part-exchange into a used LEVC TX. Book a call.',
      nav: 'px',
      defaultInterest: 'part_exchange',
    },
    '/levc-tx-finance': {
      view: 'finance',
      title: 'LEVC TX Finance for London Cab Drivers',
      description: 'Finance options for a used LEVC TX, explained on a call by a cab specialist. Finance subject to status.',
      nav: 'finance',
      defaultInterest: 'finance',
      needsFinance: true,
    },
    '/privacy': { view: 'privacy', title: 'Privacy Notice', description: 'How Reverie Cab Sales uses the details you give us.', nav: '' },
  },
};
