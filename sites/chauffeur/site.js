'use strict';

// Reverie Executive: nearly new Mercedes-Benz and BMW executive cars for UK
// chauffeurs and private hire drivers. Facts and sources: docs/chauffeur/RESEARCH.md

const fields = [
  {
    name: 'interest',
    label: 'Looking to',
    required: true,
    options: {
      buy: 'Buy an exec car (new or nearly new)',
      source: 'Find a specific spec',
      part_exchange: 'Part-exchange my current car',
      sell: 'Sell my car outright',
      fleet: 'Add cars to a chauffeur fleet',
      rental: 'Supply cars for my rental business',
      finance: 'Talk about finance',
    },
  },
  {
    name: 'model',
    label: 'Car',
    required: true,
    options: {
      s_class: 'Mercedes S-Class',
      eqs: 'Mercedes EQS',
      eqe: 'Mercedes EQE',
      e_class_phev: 'Mercedes E-Class plug-in hybrid',
      v_class: 'Mercedes V-Class / EQV',
      bmw_i7: 'BMW i7',
      bmw_7: 'BMW 7 Series',
      open: 'Not sure yet',
    },
  },
  {
    name: 'condition',
    label: 'New or used',
    options: { new: 'New', nearly_new: 'Nearly new', either: 'Either' },
  },
  {
    name: 'work',
    label: 'Main work',
    required: true,
    options: {
      uber: 'Uber Exec / Lux',
      wheely: 'Wheely',
      blacklane: 'Blacklane',
      addison_lee: 'Addison Lee',
      bolt: 'Bolt Premium / Luxury',
      own_clients: 'My own or corporate clients',
      rental: 'I rent cars to drivers',
      several: 'Several platforms',
      starting: 'Just starting out',
    },
  },
  {
    name: 'licence',
    label: 'Licence',
    required: true,
    options: {
      tfl: 'TfL private hire (PCO) licence',
      council: 'Council private hire licence (outside London)',
      both: 'Both TfL and a council',
      applying: 'Applying for a licence',
      operator: 'Operator / fleet owner',
      business: 'No licence: I run a rental or car business',
    },
  },
  {
    name: 'business',
    label: 'Trading as',
    options: {
      sole_trader: 'Sole trader',
      ltd: 'Limited company',
      partnership: 'Partnership',
      not_sure: 'Not sure yet',
    },
  },
  {
    name: 'budget',
    label: 'Budget',
    options: {
      under_40: 'Under £40,000',
      '40_60': '£40,000 to £60,000',
      '60_80': '£60,000 to £80,000',
      '80_100': '£80,000 to £100,000',
      over_100: 'Over £100,000',
      monthly: 'Thinking monthly',
    },
  },
  { name: 'current_car', label: 'Current car', type: 'text', max: 80 },
  { name: 'current_year', label: 'Current car registered', type: 'year' },
  {
    name: 'timeframe',
    label: 'Timeframe',
    required: true,
    options: {
      asap: 'As soon as possible',
      '1_3_months': 'In 1 to 3 months',
      '3_6_months': 'In 3 to 6 months',
      researching: 'Just researching',
    },
  },
];

function score(d, nowYear) {
  let s = 0;
  if (['tfl', 'council', 'both', 'operator', 'business'].includes(d.licence)) s += 3;
  else if (d.licence === 'applying') s += 1;
  s += { asap: 3, '1_3_months': 2, '3_6_months': 1 }[d.timeframe] || 0;
  // Uber Exec allows 5-6 model years and Wheely 3, so a 4+ year old car is close to losing work.
  if (d.current_year && nowYear - d.current_year >= 4) s += 2;
  if (['ltd', 'partnership'].includes(d.business)) s += 1;
  if (d.budget) s += 1;
  if (['buy', 'source', 'fleet', 'rental'].includes(d.interest)) s += 1;
  // Multi-car buyers and S-Class buyers are the team's priority deals.
  if (['operator', 'business'].includes(d.licence) || ['fleet', 'rental'].includes(d.interest)) s += 2;
  if (d.model === 's_class') s += 1;
  return { score: s, label: s >= 8 ? 'hot' : s >= 5 ? 'warm' : 'nurture' };
}

// Platform fit per model. Status: ok | check | no. Kept short; the full table
// lives on /platform-requirements.
const models = {
  s_class: {
    image: 's-class-card',
    featured: true,
    priceNew: 'from £103,450',
    priceSeen: '2024 S 580 e L, 11k miles: £78,890',
    slug: 'mercedes-s-class',
    name: 'Mercedes-Benz S-Class',
    short: 'S-Class',
    tagline: 'The only car Wheely accepts for First class.',
    variants: 'S 580 e L plug-in hybrid; S 350 d L and S 400 d L diesels',
    london: 'The S 580 e plug-in hybrid (about 65 miles electric range) meets TfL’s zero emission capable rule for first licensing. Diesels do not.',
    londonOk: 'PHEV yes · diesel no',
    why: [
      { h: 'Top tier on every platform', p: 'Wheely First, Blacklane First, Addison Lee First, Uber Lux and Bolt Luxury all list the S-Class.' },
      { h: 'Wheely First has a strict spec', p: 'Long wheelbase, first registered 2024 or later, panoramic roof, rear blinds, reclining heated rear seats and rear climate control. We check every one before you commit.' },
      { h: 'Two routes into First class', p: 'For a TfL licence choose the S 580 e plug-in hybrid. Licensing with Hertsmere or Windsor and Maidenhead, which Wheely accepts? A diesel S 350 d L or S 400 d L can be an option.' },
      { h: 'New or nearly new', p: 'New gives you the longest life on platforms with age limits and your exact spec. Nearly new saves the first-year drop. We compare both for you on the call.' },
    ],
    fit: [
      { p: 'Wheely First', s: 'ok', n: 'W223 long wheelbase, 2024+, panoramic roof, rear blinds' },
      { p: 'Uber Lux / Exec', s: 'ok', n: '5 model years or newer in London, Manchester, Birmingham' },
      { p: 'Blacklane First', s: 'ok', n: 'Listed for First class' },
      { p: 'Addison Lee First', s: 'ok', n: 'Listed for First class' },
      { p: 'Bolt Luxury', s: 'ok', n: 'S 450 and S 580 on Bolt’s list' },
    ],
    watch: 'Short-wheelbase cars, black wheels and missing rear blinds fail Wheely First.',
  },
  eqs: {
    image: 'eqs',
    priceNew: 'from £91,765',
    priceSeen: '2023 EQS 450+, 6k to 26k miles: about £45,000',
    slug: 'mercedes-eqs',
    name: 'Mercedes-Benz EQS',
    short: 'EQS',
    tagline: 'Fully electric, and accepted across Uber Lux, Wheely and Blacklane.',
    variants: 'EQS 450+ and EQS 580 4MATIC saloons',
    london: 'Fully electric, so it meets TfL’s zero emission capable rule. 25% Congestion Charge discount on Auto Pay.',
    londonOk: 'Yes',
    why: [
      { h: 'One car, several platforms', p: 'Drivers stack Uber Lux, Wheely Business and Blacklane work on the same EQS.' },
      { h: 'Long range for airport work', p: 'One of the longest-range executive saloons, which matters on Heathrow and Gatwick runs with no return job.' },
      { h: 'Colour matters', p: 'Wheely only takes an EQS in black or graphite grey (gloss). We filter for it.' },
    ],
    fit: [
      { p: 'Uber Lux / Exec', s: 'ok', n: '5 model years or newer in the big three cities' },
      { p: 'Wheely Business', s: 'ok', n: 'Black or graphite grey, 3 years old or newer' },
      { p: 'Blacklane', s: 'check', n: 'Lists S-Class for First "or similar"; confirm in your partner portal' },
      { p: 'Bolt Luxury', s: 'ok', n: 'On Bolt’s list' },
    ],
    watch: 'Real-world range drops in winter; plan charging around long airport days.',
  },
  eqe: {
    image: 'eqe',
    priceNew: 'from £69,365',
    priceSeen: '2025 EQE 350+, 5k to 12k miles: £39,926 to £46,440',
    slug: 'mercedes-eqe',
    name: 'Mercedes-Benz EQE',
    short: 'EQE',
    tagline: 'The volume electric Exec car, and the one rental firms lead with.',
    variants: 'EQE 300 and EQE 350+ saloons',
    london: 'Fully electric, so it meets TfL’s zero emission capable rule.',
    londonOk: 'Yes',
    why: [
      { h: 'Exec and Wheely Business', p: 'Accepted on Uber Exec and Wheely Business, and widely used for Blacklane Business work.' },
      { h: 'Own it, not rent it', p: 'Rent-to-buy firms charge around £229 to £355 a week for an EQE. Owning one on finance in your name means the car and any insurance payout are yours.' },
      { h: 'Colour matters', p: 'Wheely only takes an EQE in black or graphite grey (gloss).' },
    ],
    fit: [
      { p: 'Uber Exec', s: 'ok', n: '5 model years or newer in London, Manchester, Birmingham' },
      { p: 'Wheely Business', s: 'ok', n: 'Black or graphite grey, 3 years old or newer' },
      { p: 'Blacklane Business', s: 'check', n: 'Lists E-Class "or similar"; confirm in your partner portal' },
      { p: 'Bolt Premium / Luxury', s: 'ok', n: 'On Bolt’s lists' },
    ],
    watch: 'Not on Uber Lux lists. Choose an EQS or S-Class if Lux is the goal.',
  },
  e_class_phev: {
    image: 'e-class',
    priceNew: 'from £56,940',
    priceSeen: '2025 E 300 e, 12k to 24k miles: £39,800 to £41,699',
    slug: 'mercedes-e-class-hybrid',
    name: 'Mercedes-Benz E-Class plug-in hybrid',
    short: 'E-Class hybrid',
    tagline: 'The classic Exec car, as a plug-in hybrid that London will license.',
    variants: 'E 300 e, and E 400 e where available (W214, 2023 on)',
    london: 'Plug-in hybrids meet TfL’s zero emission capable rule for first licensing. The E 220 d diesel does not.',
    londonOk: 'PHEV yes · diesel no',
    why: [
      { h: 'Exec on every platform', p: 'Uber Exec, Wheely Business (W214 only), Blacklane Business and Addison Lee Executive all name the E-Class.' },
      { h: 'No range worries', p: 'Electric for town work with a petrol engine for long runs, so no charging stops between jobs.' },
      { h: 'More colours accepted', p: 'Wheely takes an E-Class in black, silver, grey or nautic blue.' },
    ],
    fit: [
      { p: 'Uber Exec', s: 'ok', n: '5 model years or newer in the big three cities' },
      { p: 'Wheely Business', s: 'ok', n: 'W214 only, 3 years old or newer' },
      { p: 'Blacklane Business', s: 'ok', n: 'Listed for Business class' },
      { p: 'Addison Lee Executive', s: 'ok', n: 'Listed for Executive class' },
      { p: 'Bolt Premium', s: 'ok', n: 'E 300 and E 400 on Bolt’s list' },
    ],
    watch: 'Older W213 E-Classes are not accepted by Wheely.',
  },
  v_class: {
    image: 'v-class',
    priceNew: '£77,280 to £99,665',
    priceSeen: '2025 V 300 d, 5k to 20k miles: £63,250 to £71,000',
    slug: 'mercedes-v-class',
    name: 'Mercedes-Benz V-Class and EQV',
    short: 'V-Class / EQV',
    tagline: 'Airport, group and family work, where the fares are bigger.',
    variants: 'V-Class long and extra-long (V 220 d, V 300 d); EQV electric',
    london: 'Only the electric EQV can be licensed as a London PHV for the first time. A diesel V-Class can only be re-licensed if it already holds a London PHV licence.',
    londonOk: 'EQV yes · diesel re-licence only',
    why: [
      { h: 'XL work pays more', p: 'Wheely XL, Blacklane Business Van, Addison Lee First and Uber Exec XXL all use the V-Class or EQV.' },
      { h: 'Wheelbase matters', p: 'Wheely needs long or extra-long wheelbase, 3 years old or newer, plus a child seat.' },
      { h: 'Know the London rule first', p: 'Since 2023 a diesel V-Class cannot get a first London PHV licence. We’ll tell you straight which cars will work for you.' },
    ],
    fit: [
      { p: 'Wheely XL', s: 'ok', n: 'Long or extra-long, 3 years old or newer, child seat' },
      { p: 'Uber Exec XXL', s: 'ok', n: 'Licensed for 7+; 6 years London, 10 years elsewhere' },
      { p: 'Blacklane Business Van', s: 'ok', n: 'Listed' },
      { p: 'Addison Lee First / Airport', s: 'ok', n: 'Listed' },
      { p: 'Uber Exec (saloon tier)', s: 'no', n: 'Exec is saloons only' },
    ],
    watch: 'Vito-based vans are rejected by Wheely.',
  },
  bmw_i7: {
    image: 'bmw-i7',
    priceNew: 'from £104,230',
    priceSeen: '2024 i7 eDrive50, 10k to 22k miles: £49,799 to £65,700',
    slug: 'bmw-i7',
    name: 'BMW i7',
    short: 'i7',
    tagline: 'Fully electric luxury saloon for Uber Lux and Wheely Business.',
    variants: 'i7 eDrive50, xDrive60 and M70 (G70)',
    london: 'Fully electric, so it meets TfL’s zero emission capable rule.',
    londonOk: 'Yes',
    why: [
      { h: 'Lux and Business', p: 'On Uber’s Lux list and accepted for Wheely Business. Wheely places the i7 in Business, not First.' },
      { h: 'Wheely BMW rules', p: 'Tinted windows are mandatory and interior cameras must be off and covered.' },
      { h: 'Strong value used', p: 'Big luxury EVs lose value quickly when new, so a nearly new i7 can cost far less than list price. We’ll show you the numbers on the call.' },
    ],
    fit: [
      { p: 'Uber Lux / Exec', s: 'ok', n: '5 model years or newer in the big three cities' },
      { p: 'Wheely Business', s: 'ok', n: 'G70, 3 years old or newer, tinted windows' },
      { p: 'Blacklane First', s: 'check', n: 'Lists 7 Series "or similar"; confirm in your partner portal' },
      { p: 'Bolt Luxury', s: 'ok', n: 'On Bolt’s list' },
    ],
    watch: 'Wheely does not accept bi-colour paint on the 7 Series / i7.',
  },
  bmw_7: {
    image: 'bmw-7',
    priceNew: 'not published here',
    priceSeen: '750e xDrive asking prices: £54,989 to £79,650',
    slug: 'bmw-7-series',
    name: 'BMW 7 Series',
    short: '7 Series',
    tagline: 'Plug-in hybrid luxury with no charging stops.',
    variants: '750e xDrive and M760e xDrive plug-in hybrids (G70)',
    london: 'The 750e and M760e plug-in hybrids meet TfL’s zero emission capable rule. Diesel 7 Series cars cannot be licensed as a new London PHV.',
    londonOk: 'PHEV yes · diesel no',
    why: [
      { h: 'First class on Blacklane', p: 'Blacklane lists the 7 Series for First class; Uber lists it for Lux.' },
      { h: 'Wheely Business', p: 'G70 from 2022, 3 years old or newer, black, silver, grey or tanzanite blue, with tinted windows.' },
      { h: 'Hybrid flexibility', p: 'Electric in town, petrol for long motorway jobs.' },
    ],
    fit: [
      { p: 'Uber Lux / Exec', s: 'ok', n: '5 model years or newer in the big three cities' },
      { p: 'Wheely Business', s: 'ok', n: 'G70 2022+, 3 years old or newer, tinted windows' },
      { p: 'Blacklane First', s: 'ok', n: 'Listed for First class' },
      { p: 'Bolt Luxury', s: 'ok', n: '725 to 745 on Bolt’s list' },
    ],
    watch: 'Choose the 750e or M760e for London. Older diesel 740d cars can only be re-licensed.',
  },
};

const FIT_LABELS = { ok: 'Yes', check: 'Check portal', no: 'No' };
for (const m of Object.values(models)) {
  for (const f of m.fit) f.label = FIT_LABELS[f.s];
}

const modelPages = {};
for (const [key, m] of Object.entries(models)) {
  modelPages[`/${m.slug}`] = {
    view: 'model',
    title: `Nearly New ${m.name} for Chauffeurs`,
    description: `${m.tagline} Nearly new ${m.short} sourced to the spec Uber, Wheely and Blacklane ask for. Book a call with a specialist.`,
    nav: 'range',
    defaultInterest: 'buy',
    defaultModel: key,
    data: { key, ...m },
  };
}

module.exports = {
  brand: {
    name: 'Reverie Executive',
    parent: 'Reverie Autos',
    legalName: 'Reverie Autos Ltd',
    companyNumber: '09304340',
    address: '57 Great North Road, Welwyn Garden City, AL8 7TL',
    trustpilotUrl: 'https://uk.trustpilot.com/review/reverieautos.co.uk',
  },
  fields,
  score,
  templateData: {
    models: Object.entries(models).map(([key, m]) => ({ key, ...m })),
    // Public Trustpilot figures for Reverie Autos; update when they change.
    reviews: { score: '4.8', count: 98, asOf: 'October 2026', url: 'https://uk.trustpilot.com/review/reverieautos.co.uk' },
    // Real customer quotes only, with their permission: { quote, name, role }.
    testimonials: [],
    credits: require('./public/assets/img/credits.json'),
  },
  pages: {
    '/': {
      view: 'home',
      title: 'Nearly New Mercedes and BMW Executive Cars for UK Chauffeurs',
      description: 'Nearly new S-Class, EQS, EQE, E-Class hybrid, V-Class, i7 and 7 Series sourced to Uber Exec, Wheely and Blacklane rules. Book a call with a chauffeur car specialist.',
      nav: 'home',
      defaultInterest: 'buy',
    },
    ...modelPages,
    '/platform-requirements': {
      view: 'platforms',
      title: 'Uber Exec, Wheely and Blacklane Car Requirements 2026',
      description: 'Which cars Uber Exec and Lux, Wheely Business, First and XL, Blacklane, Addison Lee and Bolt accept in 2026, and what TfL will license.',
      nav: 'platforms',
      defaultInterest: 'buy',
    },
    '/sell-or-part-exchange': {
      view: 'part-exchange',
      title: 'Part-Exchange Your Exec Car Before It Ages Out',
      description: 'Uber Exec allows 5 to 6 model years and Wheely 3. Part-exchange your E-Class, S-Class, EQE or V-Class into a newer car before it loses work.',
      nav: 'px',
      defaultInterest: 'part_exchange',
    },
    '/chauffeur-car-finance': {
      view: 'finance',
      title: 'Finance for Chauffeur and Executive Private Hire Cars',
      description: 'Hire purchase for sole traders and limited companies through specialist lenders. Finance subject to status.',
      nav: 'finance',
      defaultInterest: 'finance',
      needsFinance: true,
    },
    '/privacy': { view: 'privacy', title: 'Privacy Notice', description: 'How Reverie Executive uses the details you give us.', nav: '' },
    '/photo-credits': { view: 'credits', title: 'Photo Credits', description: 'Credits and licences for photographs used on this site.', nav: '' },
  },
};
