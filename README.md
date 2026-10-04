# Reverie Autos landing pages

Two Reverie Autos sub-brands on one booking engine. Every enquiry becomes a **booked sales call**: the driver picks a time, sales get the call with a priority score, and nobody chases anyone to book a callback.

| Site | `SITE=` | For | Docs |
|---|---|---|---|
| **Reverie Cab Sales** | `cabs` | London cab drivers: used LEVC TX, TX4/Vito part-exchange | [plan](docs/cabs/PLAN.md) · [call playbook](docs/cabs/SALES-PLAYBOOK.md) · [launch checklist](docs/cabs/LAUNCH-CHECKLIST.md) |
| **Reverie Executive** | `chauffeur` | UK chauffeurs and exec PHV drivers: nearly new S-Class, EQS, EQE, E-Class hybrid, V-Class/EQV, i7, 7 Series | [research](docs/chauffeur/RESEARCH.md) · [plan](docs/chauffeur/PLAN.md) · [call playbook](docs/chauffeur/SALES-PLAYBOOK.md) · [launch checklist](docs/chauffeur/LAUNCH-CHECKLIST.md) |

What both sites get:

- **Booking:** multi-step form, then live call slots in UK time (DST-safe), capped by team size, rechecked on submit. The customer gets a confirmation, a calendar invite and a reschedule/cancel link.
- **Lead priority:** each site scores answers into hot / warm / nurture.
- **Sales alerts:** a webhook to any CRM (Zapier/Make/n8n into HubSpot, Pipedrive, Sheets or Slack) and an email with a calendar invite.
- **Sales dashboard** at `/admin`: today's calls, click-to-call, every answer, outcome and notes per call, CSV export with campaign source.
- **Basics:** spam honeypot, rate limits, CSP and security headers, sitemap, robots, schema.org, privacy notice, no tracking cookies.
- **Finance pages** stay hidden until FCA-approved wording is set (`FCA_STATEMENT`).
- **No dependencies:** Node 22.5+ standard library, using the built-in `node:sqlite`.

The chauffeur site also has an **eligibility checker**. Pick a car, its year and your city, and it gives verdicts for Uber Exec/Lux/XXL, Wheely Business/First/XL, Blacklane, Bolt and TfL's first-licence rule.

## Run it

```bash
SITE=cabs      ADMIN_PASSWORD=pick-one npm start           # http://localhost:3000
SITE=chauffeur ADMIN_PASSWORD=pick-one PORT=3001 npm start # http://localhost:3001
npm test
```

`/admin` uses HTTP basic auth (user `sales` by default). See `.env.example` for every setting.

## How a lead flows

```
Driver lands (ad / search / social / QR)
  → answers the site's questions
  → picks a free call slot (UK time)
  → name + mobile + consent
  → POST /api/leads: validated, slot rechecked, saved, scored
  → webhook + email with .ics to sales; confirmation + .ics to the driver
  → rep calls at the slot, logs the outcome in /admin
```

## Add another site

1. Create `sites/<id>/site.js` exporting `brand`, `fields` (must include `interest` and `timeframe`), `score(details, year)`, `pages`, and optionally `templateData` and `hours`.
2. Add `sites/<id>/views/` (pages and partials) and `sites/<id>/public/assets/` (styles, favicon, optional `<id>.js`).
3. Mark required inputs with `required` or `data-required` and year inputs with `data-type="year"`. The shared `booking.js` validates from the markup.
4. Run with `SITE=<id>`.

## Deploy

- **Render:** `render.yaml` defines one service per brand, each with its own persistent disk.
- **Docker:** `docker build -t reverie-sites . && docker run -p 3000:3000 -e SITE=chauffeur -v $(pwd)/data:/app/data --env-file .env reverie-sites`
- You need a persistent disk for `data/<site>-leads.db`.

## Preview

`npm run build:preview -- chauffeur` (or `cabs`) writes `preview/<site>.html`. It's a single-file home page with example call times that doesn't submit anything.

## Layout

```
server.js              starts the server for $SITE
src/                   shared engine: config, routes, slots, leads, db, notify, admin, render
shared/public/assets/  booking.js (form + slot picker), admin.css
sites/cabs/            Reverie Cab Sales: site.js, views/, public/
sites/chauffeur/       Reverie Executive: site.js, views/, public/
docs/                  plans, research, playbooks, checklists per site
test/                  node:test suites for engine and both sites
```
