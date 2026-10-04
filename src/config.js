'use strict';

// Runtime configuration. Brand copy, form questions and pages come from the
// site chosen with SITE (see sites/); contact details, alerts and finance
// wording come from environment variables. Anything we could not verify is
// left empty and the site hides it rather than inventing a value.

const { loadSite } = require('./sites');

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

const DEFAULT_HOURS = {
  0: null,
  1: [9, 18],
  2: [9, 18],
  3: [9, 18],
  4: [9, 18],
  5: [9, 18],
  6: [10, 14],
};

function buildConfig(env = process.env) {
  const site = loadSite(env.SITE || 'cabs');
  const port = int(env.PORT, 3000);
  const fcaStatement = env.FCA_STATEMENT || '';

  return {
    port,
    siteUrl: (env.SITE_URL || `http://localhost:${port}`).replace(/\/$/, ''),
    dbPath: env.DB_PATH || `data/${site.id}-leads.db`,
    timeZone: 'Europe/London',
    site,

    brand: {
      ...site.brand,
      // Hidden on the site when empty.
      phone: env.SALES_PHONE || '',
      email: env.SALES_PUBLIC_EMAIL || '',
    },

    // Promoting finance to consumers and sole traders is FCA-regulated credit
    // broking. Finance copy and pages only appear once the FCA wording is set.
    finance: { fcaStatement, enabled: Boolean(fcaStatement) },

    booking: {
      slotMinutes: int(env.SLOT_MINUTES, 20),
      // How many sales reps can take a call in the same slot.
      capacity: int(env.SALES_REPS, 2),
      leadTimeMinutes: int(env.LEAD_TIME_MINUTES, 120),
      daysAhead: int(env.DAYS_AHEAD, 14),
      // Day of week (0 = Sunday) -> [openHour, closeHour] in London time.
      hours: site.hours || DEFAULT_HOURS,
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
}

module.exports = { buildConfig, DEFAULT_HOURS };
