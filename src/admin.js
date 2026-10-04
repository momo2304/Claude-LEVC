'use strict';

const { escapeHtml: e } = require('./render');
const { STATUSES, label } = require('./leads');
const { formatLondon } = require('./time');

const STATUS_LABELS = {
  booked: 'Booked',
  called: 'Called',
  no_answer: 'No answer',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
  cancelled: 'Cancelled',
};

function csvCell(value) {
  let s = String(value ?? '');
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function leadsCsv(leads) {
  const cols = [
    'id', 'created_at', 'slot_start', 'status', 'score_label', 'score', 'name', 'phone', 'email',
    'interest', 'licence', 'current_vehicle', 'plate_year', 'payment', 'timeframe', 'message',
    'sales_notes', 'consent_marketing', 'source_page', 'utm',
  ];
  const rows = leads.map((l) => cols.map((c) => csvCell(l[c])).join(','));
  return [cols.join(','), ...rows].join('\n') + '\n';
}

function renderAdmin({ leads, view, focusId, timeZone, brandName, nowMs }) {
  const fmt = (iso) =>
    formatLondon(Date.parse(iso), timeZone, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const counts = { hot: 0, warm: 0, nurture: 0 };
  let todayCount = 0;
  const todayKey = formatLondon(nowMs, timeZone, { dateStyle: 'short' });
  for (const l of leads) {
    if (l.status === 'cancelled') continue;
    counts[l.score_label] = (counts[l.score_label] || 0) + 1;
    if (formatLondon(Date.parse(l.slot_start), timeZone, { dateStyle: 'short' }) === todayKey) todayCount++;
  }

  const rows = leads
    .map((l) => {
      const past = Date.parse(l.slot_start) < nowMs;
      const options = STATUSES.map(
        (s) => `<option value="${s}"${s === l.status ? ' selected' : ''}>${STATUS_LABELS[s]}</option>`
      ).join('');
      return `<tr id="lead-${e(l.id)}" class="${l.id === focusId ? 'focus' : ''} ${past ? 'past' : ''} st-${e(l.status)}">
  <td><strong>${e(fmt(l.slot_start))}</strong><br><a href="/admin/leads/${e(l.id)}.ics">Add to calendar</a></td>
  <td><span class="pill ${e(l.score_label)}">${e(l.score_label)}</span><br><small>${e(l.score)} pts</small></td>
  <td><strong>${e(l.name)}</strong><br><a href="tel:${e(l.phone)}">${e(l.phone)}</a>${l.email ? `<br><a href="mailto:${e(l.email)}">${e(l.email)}</a>` : ''}</td>
  <td>${e(label('interest', l.interest))}<br><small>${e(label('licence', l.licence))}</small></td>
  <td>${e(label('current_vehicle', l.current_vehicle))}${l.plate_year ? ` (${e(l.plate_year)})` : ''}<br><small>${e(label('payment', l.payment))} &middot; ${e(label('timeframe', l.timeframe))}</small>${l.message ? `<p class="msg">${e(l.message)}</p>` : ''}</td>
  <td>
    <form method="post" action="/admin/leads/${e(l.id)}">
      <select name="status" aria-label="Status">${options}</select>
      <textarea name="sales_notes" rows="2" placeholder="Call notes" aria-label="Call notes">${e(l.sales_notes || '')}</textarea>
      <button type="submit">Save</button>
    </form>
  </td>
</tr>`;
    })
    .join('\n');

  const tab = (key, text) => `<a class="tab${view === key ? ' on' : ''}" href="/admin?view=${key}">${text}</a>`;

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sales calls - ${e(brandName)}</title>
<link rel="stylesheet" href="/assets/admin.css">
</head><body>
<header><h1>${e(brandName)} &middot; Sales calls</h1><a href="/admin/export.csv">Export CSV</a></header>
<section class="stats">
  <div><b>${todayCount}</b><span>calls today</span></div>
  <div><b>${counts.hot}</b><span>hot</span></div>
  <div><b>${counts.warm}</b><span>warm</span></div>
  <div><b>${counts.nurture}</b><span>nurture</span></div>
</section>
<nav>${tab('upcoming', 'Upcoming')}${tab('all', 'All leads')}</nav>
${leads.length ? `<div class="wrap"><table>
<thead><tr><th>Call time (UK)</th><th>Priority</th><th>Contact</th><th>Wants</th><th>Details</th><th>Outcome</th></tr></thead>
<tbody>${rows}</tbody></table></div>` : '<p class="empty">No calls booked yet.</p>'}
</body></html>`;
}

module.exports = { renderAdmin, leadsCsv, STATUS_LABELS };
