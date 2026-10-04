'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ACTIVE = "status NOT IN ('cancelled')";

function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      interest TEXT NOT NULL,
      licence TEXT NOT NULL,
      current_vehicle TEXT,
      plate_year INTEGER,
      payment TEXT,
      timeframe TEXT NOT NULL,
      message TEXT,
      score INTEGER NOT NULL,
      score_label TEXT NOT NULL,
      slot_start TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      sales_notes TEXT,
      manage_token TEXT NOT NULL UNIQUE,
      consent_marketing INTEGER NOT NULL DEFAULT 0,
      source_page TEXT,
      utm TEXT
    );
    CREATE INDEX IF NOT EXISTS leads_slot ON leads (slot_start);
  `);

  const stmts = {
    countsFrom: db.prepare(
      `SELECT slot_start, COUNT(*) AS n FROM leads WHERE ${ACTIVE} AND slot_start >= ? GROUP BY slot_start`
    ),
    insert: db.prepare(`INSERT INTO leads (
      id, created_at, updated_at, name, phone, email, interest, licence, current_vehicle, plate_year,
      payment, timeframe, message, score, score_label, slot_start, status, manage_token,
      consent_marketing, source_page, utm
    ) VALUES (
      :id, :created_at, :updated_at, :name, :phone, :email, :interest, :licence, :current_vehicle, :plate_year,
      :payment, :timeframe, :message, :score, :score_label, :slot_start, 'booked', :manage_token,
      :consent_marketing, :source_page, :utm
    )`),
    byId: db.prepare('SELECT * FROM leads WHERE id = ?'),
    byToken: db.prepare('SELECT * FROM leads WHERE manage_token = ?'),
    setSlot: db.prepare("UPDATE leads SET slot_start = ?, status = 'booked', updated_at = ? WHERE id = ?"),
    setStatus: db.prepare('UPDATE leads SET status = ?, sales_notes = ?, updated_at = ? WHERE id = ?'),
    all: db.prepare('SELECT * FROM leads ORDER BY slot_start ASC'),
    upcoming: db.prepare(`SELECT * FROM leads WHERE ${ACTIVE} AND slot_start >= ? ORDER BY slot_start ASC`),
  };

  return {
    raw: db,
    bookedCounts(fromIso) {
      const map = new Map();
      for (const row of stmts.countsFrom.all(fromIso)) map.set(row.slot_start, row.n);
      return map;
    },
    insertLead(lead) {
      stmts.insert.run(lead);
      return stmts.byId.get(lead.id);
    },
    getById: (id) => stmts.byId.get(id),
    getByToken: (token) => stmts.byToken.get(token),
    reschedule(id, slotIso, nowIso) {
      stmts.setSlot.run(slotIso, nowIso, id);
      return stmts.byId.get(id);
    },
    setStatus(id, status, notes, nowIso) {
      stmts.setStatus.run(status, notes, nowIso, id);
      return stmts.byId.get(id);
    },
    allLeads: () => stmts.all.all(),
    upcomingLeads: (fromIso) => stmts.upcoming.all(fromIso),
  };
}

module.exports = { openDb };
