'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildSlots, isOfferedSlot } = require('./slots');
const { validateLead, STATUSES, clean } = require('./leads');
const { createRenderer } = require('./render');
const { renderAdmin, leadsCsv } = require('./admin');
const { zonedParts, formatLondon } = require('./time');

const ROOT = path.join(__dirname, '..');
const SHARED_PUBLIC_DIR = path.join(ROOT, 'shared', 'public');

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

// Utility pages: rendered but kept out of search results.
const PRIVATE_PAGES = {
  '/thank-you': { view: 'thank-you', title: 'Your call is booked' },
  '/booking': { view: 'booking', title: 'Manage your call' },
};

function createApp({ config, db, notifier, now = () => Date.now(), log = console }) {
  const { site } = config;
  const PAGES = site.pages;
  const renderer = createRenderer(site.viewsDir, { cache: process.env.NODE_ENV === 'production' });
  const rateBuckets = new Map();

  function send(res, status, body, headers = {}) {
    res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
    res.end(body);
  }

  function json(res, status, data) {
    send(res, status, JSON.stringify(data), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  }

  function readBody(req, limit = 20_000) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) {
          reject(Object.assign(new Error('body too large'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  async function parseBody(req) {
    const raw = await readBody(req);
    const type = req.headers['content-type'] || '';
    if (type.includes('application/json')) {
      try {
        return JSON.parse(raw || '{}');
      } catch {
        throw Object.assign(new Error('invalid JSON'), { status: 400 });
      }
    }
    return Object.fromEntries(new URLSearchParams(raw));
  }

  function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    return (fwd ? String(fwd).split(',')[0] : req.socket.remoteAddress || '').trim();
  }

  // Allow `max` hits per `windowMs` per IP and bucket name.
  function rateLimited(req, bucket, max, windowMs) {
    const key = `${bucket}:${clientIp(req)}`;
    const t = now();
    const hits = (rateBuckets.get(key) || []).filter((h) => t - h < windowMs);
    hits.push(t);
    rateBuckets.set(key, hits);
    if (rateBuckets.size > 10_000) rateBuckets.clear();
    return hits.length > max;
  }

  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Same-origin form posts from older browsers omit it.
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  }

  function pageData(meta, pathname) {
    const { brand, finance } = config;
    return {
      brand,
      finance: finance.enabled,
      fcaStatement: finance.fcaStatement,
      phone: brand.phone,
      phoneHref: brand.phone.replace(/[^\d+]/g, ''),
      email: brand.email,
      title: meta.title,
      canonical: `${config.siteUrl}${pathname === '/' ? '/' : pathname}`,
      siteUrl: config.siteUrl,
      year: zonedParts(now(), config.timeZone).year,
      nav: { [meta.nav || 'none']: true },
      sourcePage: pathname,
      description: meta.description || '',
      defaultInterest: meta.defaultInterest || '',
      defaultModel: meta.defaultModel || '',
      slotMinutesText: `${config.booking.slotMinutes}-minute`,
      page: meta.data || {},
      site: site.templateData || {},
      noindex: Boolean(meta.noindex),
    };
  }

  function bookedCounts() {
    return db.bookedCounts(new Date(now()).toISOString());
  }

  function publicBooking(lead) {
    return {
      name: lead.name,
      status: lead.status,
      slot_start: lead.slot_start,
      when: formatLondon(Date.parse(lead.slot_start), config.timeZone, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }),
      phone_last4: lead.phone.slice(-4),
      minutes: config.booking.slotMinutes,
    };
  }

  function checkAdmin(req, res) {
    const { user, password } = config.admin;
    if (!password) {
      send(res, 503, 'Admin is disabled. Set ADMIN_PASSWORD to enable it.', { 'content-type': 'text/plain; charset=utf-8' });
      return false;
    }
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [u, ...rest] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      const p = rest.join(':');
      const ok =
        u.length === user.length &&
        p.length === password.length &&
        crypto.timingSafeEqual(Buffer.from(u), Buffer.from(user)) &&
        crypto.timingSafeEqual(Buffer.from(p), Buffer.from(password));
      if (ok) return true;
    }
    send(res, 401, 'Authentication required', {
      'www-authenticate': `Basic realm="${config.brand.name} admin", charset="UTF-8"`,
      'content-type': 'text/plain; charset=utf-8',
    });
    return false;
  }

  function serveStatic(res, pathname) {
    // Site files win over shared ones with the same name.
    for (const dir of [site.publicDir, SHARED_PUBLIC_DIR]) {
      const file = path.normalize(path.join(dir, pathname));
      if (!file.startsWith(dir + path.sep)) continue;
      let stat;
      try {
        stat = fs.statSync(file);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      send(res, 200, fs.readFileSync(file), {
        'content-type': MIME[path.extname(file)] || 'application/octet-stream',
        'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=3600' : 'public, max-age=300',
      });
      return true;
    }
    return false;
  }

  function sitemap() {
    const urls = Object.entries(PAGES)
      .filter(([, meta]) => !meta.needsFinance || config.finance.enabled)
      .map(([p]) => `  <url><loc>${config.siteUrl}${p}</loc></url>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }

  async function handleCreateLead(req, res) {
    if (!sameOrigin(req)) return json(res, 403, { error: 'Bad origin' });
    if (rateLimited(req, 'lead', 5, 10 * 60_000)) return json(res, 429, { error: 'Too many attempts. Please call us instead.' });
    const body = await parseBody(req);

    // Honeypot: real people never fill this hidden field. Pretend success.
    if (clean(body.company_website)) return json(res, 201, { ok: true, token: 'thanks' });

    const year = zonedParts(now(), config.timeZone).year;
    const { lead, errors } = validateLead(body, year, site.fields);
    if (errors) return json(res, 422, { errors });

    const counts = bookedCounts();
    if (!isOfferedSlot(config.booking, config.timeZone, now(), lead.slot_start, counts)) {
      return json(res, 409, { errors: { slot_start: 'Sorry, that time has just gone. Please pick another.' } });
    }

    const { score, label } = site.score(lead.details, year);
    const nowIso = new Date(now()).toISOString();
    const saved = db.insertLead({
      ...lead,
      id: crypto.randomUUID(),
      created_at: nowIso,
      updated_at: nowIso,
      score,
      score_label: label,
      manage_token: crypto.randomBytes(24).toString('base64url'),
    });
    notifier.bookingEvent('booked', saved).catch((err) => log.error('[notify]', err));
    return json(res, 201, { ok: true, token: saved.manage_token, booking: publicBooking(saved) });
  }

  async function handleBookingAction(req, res, token, action) {
    const lead = db.getByToken(token);
    if (!lead) return json(res, 404, { error: 'Booking not found' });

    if (req.method === 'GET' && !action) return json(res, 200, { booking: publicBooking(lead) });

    if (req.method === 'GET' && action === 'ics') {
      return send(res, 200, notifier.ics(lead, lead.status === 'cancelled' ? 'cancelled' : 'booked'), {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="call.ics"',
      });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    if (!sameOrigin(req)) return json(res, 403, { error: 'Bad origin' });
    if (rateLimited(req, 'manage', 10, 10 * 60_000)) return json(res, 429, { error: 'Too many attempts.' });
    const nowIso = new Date(now()).toISOString();

    if (action === 'cancel') {
      if (lead.status === 'cancelled') return json(res, 200, { booking: publicBooking(lead) });
      const updated = db.setStatus(lead.id, 'cancelled', lead.sales_notes, nowIso);
      notifier.bookingEvent('cancelled', updated).catch((err) => log.error('[notify]', err));
      return json(res, 200, { booking: publicBooking(updated) });
    }

    if (action === 'reschedule') {
      const body = await parseBody(req);
      const slot = clean(body.slot_start, 40);
      const counts = bookedCounts();
      // The customer's own slot should not count against them.
      if (lead.status !== 'cancelled' && counts.has(lead.slot_start)) {
        counts.set(lead.slot_start, counts.get(lead.slot_start) - 1);
      }
      if (!isOfferedSlot(config.booking, config.timeZone, now(), slot, counts)) {
        return json(res, 409, { errors: { slot_start: 'Sorry, that time is not available. Please pick another.' } });
      }
      const updated = db.reschedule(lead.id, slot, nowIso);
      notifier.bookingEvent('rescheduled', updated).catch((err) => log.error('[notify]', err));
      return json(res, 200, { booking: publicBooking(updated) });
    }

    return json(res, 404, { error: 'Not found' });
  }

  async function handleAdmin(req, res, url) {
    if (!checkAdmin(req, res)) return;
    const { pathname } = url;

    if (pathname === '/admin' && req.method === 'GET') {
      const view = url.searchParams.get('view') === 'all' ? 'all' : 'upcoming';
      // "Upcoming" keeps today's earlier calls visible so outcomes can be logged.
      const startOfDay = new Date(now() - 12 * 3600_000).toISOString();
      const leads = view === 'all' ? db.allLeads() : db.upcomingLeads(startOfDay);
      const html = renderAdmin({
        leads,
        fields: site.fields,
        view,
        focusId: url.searchParams.get('lead'),
        timeZone: config.timeZone,
        brandName: config.brand.name,
        nowMs: now(),
      });
      return send(res, 200, html, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    }

    if (pathname === '/admin/export.csv' && req.method === 'GET') {
      return send(res, 200, leadsCsv(db.allLeads(), site.fields), {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="leads-${new Date(now()).toISOString().slice(0, 10)}.csv"`,
        'cache-control': 'no-store',
      });
    }

    const icsMatch = pathname.match(/^\/admin\/leads\/([\w-]+)\.ics$/);
    if (icsMatch && req.method === 'GET') {
      const lead = db.getById(icsMatch[1]);
      if (!lead) return send(res, 404, 'Not found');
      return send(res, 200, notifier.ics(lead, lead.status === 'cancelled' ? 'cancelled' : 'booked'), {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="call-${lead.id}.ics"`,
      });
    }

    const updateMatch = pathname.match(/^\/admin\/leads\/([\w-]+)$/);
    if (updateMatch && req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, 'Bad origin');
      const lead = db.getById(updateMatch[1]);
      if (!lead) return send(res, 404, 'Not found');
      const body = await parseBody(req);
      const status = STATUSES.includes(body.status) ? body.status : lead.status;
      db.setStatus(lead.id, status, clean(body.sales_notes, 2000) || null, new Date(now()).toISOString());
      return send(res, 303, '', { location: `/admin?lead=${lead.id}#lead-${lead.id}` });
    }

    return send(res, 404, 'Not found');
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;

    if (pathname === '/healthz') return json(res, 200, { ok: true });

    if (pathname === '/api/slots' && req.method === 'GET') {
      if (rateLimited(req, 'slots', 120, 60_000)) return json(res, 429, { error: 'Slow down' });
      const days = buildSlots(config.booking, config.timeZone, now(), bookedCounts());
      return json(res, 200, { timeZone: config.timeZone, slotMinutes: config.booking.slotMinutes, days });
    }

    if (pathname === '/api/leads' && req.method === 'POST') return handleCreateLead(req, res);

    const bookingMatch = pathname.match(/^\/api\/bookings\/([\w-]{20,64})(?:\/(cancel|reschedule|ics))?$/);
    if (bookingMatch) return handleBookingAction(req, res, bookingMatch[1], bookingMatch[2]);

    if (pathname === '/admin' || pathname.startsWith('/admin/')) return handleAdmin(req, res, url);

    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });

    if (pathname === '/robots.txt') {
      return send(res, 200, `User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /booking\nDisallow: /thank-you\nSitemap: ${config.siteUrl}/sitemap.xml\n`, {
        'content-type': 'text/plain; charset=utf-8',
      });
    }
    if (pathname === '/sitemap.xml') return send(res, 200, sitemap(), { 'content-type': 'application/xml; charset=utf-8' });

    const page = PAGES[pathname] || PRIVATE_PAGES[pathname];
    if (page) {
      if (page.needsFinance && !config.finance.enabled) return send(res, 302, '', { location: '/' });
      const meta = PRIVATE_PAGES[pathname] ? { ...page, noindex: true } : page;
      const html = renderer.render(page.view, pageData(meta, pathname));
      return send(res, 200, html, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    }

    if (serveStatic(res, pathname)) return;

    const html = renderer.render('not-found', pageData({ title: 'Page not found', nav: '', noindex: true }, pathname));
    return send(res, 404, html, { 'content-type': 'text/html; charset=utf-8' });
  }

  return async function requestHandler(req, res) {
    try {
      await handle(req, res);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) log.error(err);
      if (!res.headersSent) json(res, status, { error: status >= 500 ? 'Something went wrong. Please call us.' : err.message });
      else res.end();
    }
  };
}

module.exports = { createApp };
