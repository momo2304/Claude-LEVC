'use strict';

const { buildIcs } = require('./ics');
const { label } = require('./leads');
const { formatLondon } = require('./time');

// Sends a booking event to every configured channel. Never throws: a failed
// notification must not lose the lead, which is already saved.
function createNotifier(config, { fetchImpl = globalThis.fetch, log = console } = {}) {
  const { notify, brand, booking, siteUrl, timeZone } = config;

  function when(lead) {
    return formatLondon(Date.parse(lead.slot_start), timeZone, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function summaryLines(lead) {
    return [
      `Call: ${when(lead)} (UK time)`,
      `Priority: ${lead.score_label.toUpperCase()} (${lead.score})`,
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      lead.email ? `Email: ${lead.email}` : null,
      `Interested in: ${label('interest', lead.interest)}`,
      `Licence: ${label('licence', lead.licence)}`,
      lead.current_vehicle ? `Current cab: ${label('current_vehicle', lead.current_vehicle)}${lead.plate_year ? ` (${lead.plate_year})` : ''}` : null,
      lead.payment ? `Paying by: ${label('payment', lead.payment)}` : null,
      `Timeframe: ${label('timeframe', lead.timeframe)}`,
      lead.message ? `Notes: ${lead.message}` : null,
      `Admin: ${siteUrl}/admin?lead=${lead.id}`,
    ].filter(Boolean);
  }

  function ics(lead, event) {
    return buildIcs({
      uid: lead.id,
      startIso: lead.slot_start,
      minutes: booking.slotMinutes,
      summary: `${brand.name} call: ${lead.name} (${lead.score_label})`,
      description: summaryLines(lead).join('\n'),
      organizerEmail: notify.fromEmail,
      cancelled: event === 'cancelled',
      sequence: event === 'booked' ? 0 : Math.floor(Date.now() / 1000),
    });
  }

  async function postWebhook(event, lead) {
    if (!notify.webhookUrl) return;
    const payload = {
      event,
      lead: { ...lead, manage_token: undefined, utm: lead.utm ? JSON.parse(lead.utm) : null },
      labels: {
        interest: label('interest', lead.interest),
        licence: label('licence', lead.licence),
        current_vehicle: label('current_vehicle', lead.current_vehicle),
        payment: label('payment', lead.payment),
        timeframe: label('timeframe', lead.timeframe),
      },
      call_time_uk: when(lead),
      admin_url: `${siteUrl}/admin?lead=${lead.id}`,
    };
    const res = await fetchImpl(notify.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`webhook responded ${res.status}`);
  }

  async function sendEmail({ to, subject, text, icsContent }) {
    if (!notify.resendApiKey || !notify.fromEmail || !to.length) return;
    const body = { from: `${brand.name} <${notify.fromEmail}>`, to, subject, text };
    if (icsContent) {
      body.attachments = [{ filename: 'call.ics', content: Buffer.from(icsContent).toString('base64') }];
    }
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${notify.resendApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`email responded ${res.status}`);
  }

  function customerText(lead, event) {
    const manage = `${siteUrl}/booking?token=${lead.manage_token}`;
    if (event === 'cancelled') {
      return `Hi ${lead.name},\n\nYour call with ${brand.name} has been cancelled. If you change your mind you can book again at ${siteUrl}.\n\n${brand.name} - ${brand.parent}`;
    }
    return [
      `Hi ${lead.name},`,
      '',
      `Thanks for booking a call with ${brand.name}. One of our cab specialists will ring you on ${lead.phone} at:`,
      '',
      `  ${when(lead)} (UK time)`,
      '',
      `Need to change it? ${manage}`,
      '',
      `${brand.name} is part of ${brand.legalName} (company ${brand.companyNumber}).`,
    ].join('\n');
  }

  async function bookingEvent(event, lead) {
    const tasks = [];
    const icsContent = ics(lead, event);
    const verb = { booked: 'New call booked', rescheduled: 'Call rescheduled', cancelled: 'Call cancelled' }[event];

    tasks.push(['webhook', postWebhook(event, lead)]);
    tasks.push([
      'sales-email',
      sendEmail({
        to: notify.salesEmails,
        subject: `[${lead.score_label.toUpperCase()}] ${verb}: ${lead.name} - ${when(lead)}`,
        text: summaryLines(lead).join('\n'),
        icsContent,
      }),
    ]);
    if (lead.email) {
      tasks.push([
        'customer-email',
        sendEmail({
          to: [lead.email],
          subject: event === 'cancelled' ? `Your ${brand.name} call is cancelled` : `Your call with ${brand.name}: ${when(lead)}`,
          text: customerText(lead, event),
          icsContent,
        }),
      ]);
    }

    const results = await Promise.allSettled(tasks.map(([, p]) => p));
    results.forEach((r, i) => {
      if (r.status === 'rejected') log.error(`[notify] ${tasks[i][0]} failed for lead ${lead.id}: ${r.reason.message}`);
    });
    log.log(`[notify] ${event} lead=${lead.id} priority=${lead.score_label} slot=${lead.slot_start}`);
  }

  return { bookingEvent, ics, summaryLines };
}

module.exports = { createNotifier };
