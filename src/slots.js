'use strict';

const { zonedParts, zonedToUtc, dateKey, pad, formatLondon } = require('./time');

// Build the list of bookable call slots.
// bookedCounts: Map of slot start ISO string -> number of active bookings.
function buildSlots(booking, timeZone, nowMs, bookedCounts = new Map()) {
  const earliest = nowMs + booking.leadTimeMinutes * 60_000;
  const today = zonedParts(nowMs, timeZone);
  const days = [];

  for (let i = 0; i < booking.daysAhead; i++) {
    // Noon UTC on day i avoids DST edge cases when stepping through dates.
    const noon = Date.UTC(today.year, today.month - 1, today.day + i, 12);
    const d = zonedParts(noon, timeZone);
    const key = dateKey(d);
    const hours = booking.hours[d.weekday];
    if (!hours || booking.closedDates.includes(key)) continue;

    const [open, close] = hours;
    const slots = [];
    for (let mins = open * 60; mins + booking.slotMinutes <= close * 60; mins += booking.slotMinutes) {
      const start = zonedToUtc(d.year, d.month, d.day, Math.floor(mins / 60), mins % 60, timeZone);
      if (start < earliest) continue;
      const iso = new Date(start).toISOString();
      const taken = bookedCounts.get(iso) || 0;
      slots.push({
        start: iso,
        label: `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`,
        available: taken < booking.capacity,
      });
    }
    if (slots.some((s) => s.available)) {
      days.push({
        date: key,
        label: formatLondon(noon, timeZone, { weekday: 'short', day: 'numeric', month: 'short' }),
        slots,
      });
    }
  }
  return days;
}

// True when iso is a real, currently offered slot start.
function isOfferedSlot(booking, timeZone, nowMs, iso, bookedCounts) {
  const days = buildSlots(booking, timeZone, nowMs, bookedCounts);
  return days.some((d) => d.slots.some((s) => s.start === iso && s.available));
}

module.exports = { buildSlots, isOfferedSlot };
