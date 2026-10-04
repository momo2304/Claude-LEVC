# Reverie Cab Sales (by Reverie Autos)

Landing pages for selling used LEVC TX electric taxis to London cab drivers. Every enquiry becomes a **booked sales call**: the driver picks a time, the sales team gets the call with a priority score, and nobody has to chase anyone to book a callback.

- **Pages:** home, used LEVC TX, sell or part-exchange your cab, finance (hidden until FCA wording is set), privacy, thank-you, manage booking
- **Booking:** 4-step form → live call slots in UK time → booking saved → sales alerted → customer gets a confirmation and calendar invite
- **Sales dashboard** at `/admin`: today's calls, hot/warm/nurture priority, click-to-call, outcome and notes per call, CSV export
- **No dependencies:** Node 22 standard library only (built-in `node:sqlite` for storage)

See [docs/PLAN.md](docs/PLAN.md) for the strategy and research, [docs/SALES-PLAYBOOK.md](docs/SALES-PLAYBOOK.md) for the call script, and [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md) for what to fill in before going live.

## Run it

```bash
cp .env.example .env    # optional; edit values
ADMIN_PASSWORD=choose-one npm start
# open http://localhost:3000 and http://localhost:3000/admin (user: sales)
npm test
```

Node 22.5 or newer is required.

## How a lead flows

```
Driver lands (ad / Google / social)
  → picks what they need, licence, current cab, timeframe
  → picks a free 20-minute slot (Mon–Fri 9–6, Sat 10–2, UK time)
  → enters name + mobile, consents to the call
  → POST /api/leads: validated, slot re-checked, saved, scored
  → sales alerted: webhook (CRM/Slack/Sheets) + email with .ics invite
  → driver sees thank-you page, gets email + calendar invite, can reschedule/cancel
  → rep calls at the slot, logs outcome in /admin
```

**Priority score.** Licensed London driver +3, Knowledge student +1; timeframe ASAP +3 / 1–3 months +2 / 3–6 months +1; cab 12+ years old (near TfL's 15-year limit) +2; payment method decided +1; buying or part-exchanging +1. Hot ≥ 7, warm ≥ 4, otherwise nurture.

**Capacity.** `SALES_REPS` sets how many calls can share a slot, so double-booking is impossible beyond your team size. Slots are rechecked on submit and on reschedule.

## Connect the sales team's tools

| Want | Set |
|---|---|
| Bookings in HubSpot / Pipedrive / Google Sheets / Slack | `SALES_WEBHOOK_URL` to a Zapier, Make or n8n catch hook. The JSON payload has `event` (`booked`, `rescheduled`, `cancelled`), the lead, readable labels, `call_time_uk` and an `admin_url`. |
| Email alerts with calendar invite to reps | `RESEND_API_KEY`, `FROM_EMAIL`, `SALES_EMAILS` |
| Customer confirmation email + invite | same as above (sent when the driver gives an email) |
| Calls in Google/Outlook calendar | each alert email carries an `.ics` invite; `/admin` has "Add to calendar" per call |

Notifications never block a booking: if a channel fails, the lead is still saved and visible in `/admin`.

## Deploy

- **Render:** `render.yaml` is a blueprint with a persistent disk for the database. Set `SITE_URL`, then the other variables.
- **Anywhere with Docker:** `docker build -t reverie-cab-sales . && docker run -p 3000:3000 -v $(pwd)/data:/app/data --env-file .env reverie-cab-sales`
- Needs a persistent disk for `data/leads.db`. Serverless hosts without a disk are not suitable as-is.

## Preview

`npm run build:preview` writes `preview/index.html`, a single-file copy of the home page with example call times that does not submit anything. Useful for sharing the design.

## Project layout

```
server.js            starts the HTTP server
src/config.js        brand details, hours, env vars
src/app.js           routes: pages, /api/slots, /api/leads, /api/bookings/:token, /admin
src/slots.js         call-slot engine (Europe/London, DST-safe)
src/leads.js         form options, validation, scoring
src/notify.js        webhook + email + calendar invite
src/db.js            SQLite storage
views/               page templates and partials
public/assets/       CSS, JS, favicon
test/                node:test suite
```
