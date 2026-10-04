'use strict';

function stamp(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Fold lines to 75 octets as RFC 5545 requires.
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

function buildIcs({ prodId = 'Reverie Autos', uid, startIso, minutes, summary, description, organizerEmail, cancelled = false, sequence = 0 }) {
  const start = Date.parse(startIso);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${prodId}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    `METHOD:${cancelled ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT',
    `UID:${uid}@reverie-booking`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + minutes * 60_000)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
  ];
  if (organizerEmail) lines.push(`ORGANIZER:mailto:${organizerEmail}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

module.exports = { buildIcs };
