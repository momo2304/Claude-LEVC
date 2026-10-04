'use strict';

// Timezone helpers built on Intl so we need no date library.

const formatters = new Map();

function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
      })
    );
  }
  return formatters.get(timeZone);
}

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Wall-clock parts of a UTC timestamp in the given zone.
function zonedParts(ms, timeZone) {
  const parts = {};
  for (const p of formatter(timeZone).formatToParts(new Date(ms))) {
    parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday],
  };
}

function offsetMs(ms, timeZone) {
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// UTC timestamp for a wall-clock time in the given zone.
function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ms = guess - offsetMs(guess, timeZone);
  // Re-check once in case the guess straddled a DST change.
  const second = guess - offsetMs(ms, timeZone);
  if (second !== ms) ms = second;
  return ms;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateKey(p) {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function formatLondon(ms, timeZone, opts) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...opts }).format(new Date(ms));
}

module.exports = { zonedParts, zonedToUtc, dateKey, pad, formatLondon };
