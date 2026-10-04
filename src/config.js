'use strict';

// All business details live here or in environment variables.
// Anything we could not verify publicly is left empty and the site hides it
// rather than inventing a value (see docs/LAUNCH-CHECKLIST.md).

const env = process.env;

function list(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  port: int(env.PORT, 3000),
  siteUrl: (env.SITE_URL || `http://localhost:${int(env.PORT, 3000)}`).replace(/\/$/, ''),
  dbPath: env.DB_PATH || 'data/leads.db',
  timeZone: 'Europe/London',

  brand: {
    name: 'Reverie Cab Sales',
    parent: 'Reverie Autos',
    legalName: 'Reverie Autos Ltd',
    companyNumber: '09304340',
    // Registered office per Companies House.
    address: '57 Great North Road, Welwyn Garden City, AL8 7TL',
    // Not verified: set in env before launch. Hidden when empty.
    phone: env.SALES_PHONE || '',
    email: env.SALES_PUBLIC_EMAIL || '',
    trustpilotUrl: 'https://uk.trustpilot.com/review/reverieautos.co.uk',
  },

  // Finance promotion is a regulated activity (FCA consumer credit broking).
  // Finance copy and the finance page only appear once the FCA wording is set.
  finance: {
    fcaStatement: env.FCA_STATEMENT || '',
    get enabled() {
      return Boolean(this.fcaStatement);
    },
  },

  booking: {
    slotMinutes: int(env.SLOT_MINUTES, 20),
    // How many sales reps can take a call in the same slot.
    capacity: int(env.SALES_REPS, 2),
    leadTimeMinutes: int(env.LEAD_TIME_MINUTES, 120),
    daysAhead: int(env.DAYS_AHEAD, 14),
    // Day of week (0 = Sunday) -> [openHour, closeHour] in London time.
    hours: {
      0: null,
      1: [9, 18],
      2: [9, 18],
      3: [9, 18],
      4: [9, 18],
      5: [9, 18],
      6: [10, 14],
    },
    // YYYY-MM-DD dates with no calls (bank holidays, staff days).
    closedDates: list(env.CLOSED_DATES),
  },

  notify: {
    webhookUrl: env.SALES_WEBHOOK_URL || '',
    resendApiKey: env.RESEND_API_KEY || '',
    fromEmail: env.FROM_EMAIL || '',
    salesEmails: list(env.SALES_EMAILS),
  },

  admin: {
    user: env.ADMIN_USER || 'sales',
    password: env.ADMIN_PASSWORD || '',
  },
};

module.exports = config;
