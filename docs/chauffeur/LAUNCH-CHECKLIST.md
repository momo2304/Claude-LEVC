# Reverie Executive: launch checklist

Items left for you to decide or confirm. Anything unset is hidden on the site.

## Must do before going live

- [ ] **Domain:** e.g. `executive.reverieautos.co.uk`; set `SITE_URL`. Run with `SITE=chauffeur`.
- [ ] **Phone and email:** set `SALES_PHONE` and `SALES_PUBLIC_EMAIL` (main showroom line, or a dedicated exec desk number).
- [ ] **Admin password:** `ADMIN_PASSWORD` (dashboard disabled until set).
- [ ] **Sales alerts:** `SALES_WEBHOOK_URL` (CRM / Slack / Sheets via Zapier or Make) and/or `RESEND_API_KEY` + `FROM_EMAIL` + `SALES_EMAILS`.
- [ ] **Team size and hours:** `SALES_REPS`; hours default to Mon–Fri 9–6, Sat 10–2 (`src/config.js` `DEFAULT_HOURS`, or add `hours` in `sites/chauffeur/site.js`). Chauffeurs often prefer early evening calls, so consider later hours and update the text in `sites/chauffeur/views/partials/booking.html`.
- [ ] **Bank holidays:** `CLOSED_DATES`.
- [ ] **Review the platform rules page** against the live Uber, Wheely and Blacklane pages on launch day, and set a monthly reminder to re-check (rules change often).
- [ ] **Refresh prices** on the model pages (`priceNew` / `priceSeen` in `sites/chauffeur/site.js`) or replace them with your own stock.
- [ ] **Delivery and inspection wording:** confirm "collect from Welwyn Garden City or ask about delivery" matches what you offer.

## Finance (only after compliance sign-off)

- [ ] Confirm the firm's FCA permissions and route with your compliance advisers, and check the firm reference on the FCA register.
- [ ] Set `FCA_STATEMENT` with approved wording (status, broker-not-lender, commission disclosure). This switches on the finance page, nav link and the finance options in the form.
- [ ] Agree with your lenders which products allow hire-and-reward use and any mileage caps, so sales give correct answers.

## Content you can add

- [ ] **Real testimonials** from chauffeur and luxury car customers, with their permission: add `{ quote, name, role }` items to `testimonials` in `sites/chauffeur/site.js`. The section shows them automatically.
- [ ] **Your own photos** (handovers, stock, happy drivers): drop JPG/WebP into `sites/chauffeur/public/assets/img/` with the same names to replace the stock photos, and update `credits.json`.
- [ ] Keep the Trustpilot score current in `templateData.reviews`.
- [ ] Re-check Hertsmere / RBWM policies on launch day (councils are changing out-of-area rules).

## Nice to have in week 1

- [ ] Real stock photos per model page.
- [ ] Google Ads campaigns per model page with UTM tags.
- [ ] Zap: webhook → Google Sheet + WhatsApp/Slack alert to the sales group.
- [ ] If you add Google Ads or Meta pixels, add a cookie consent banner and update the privacy notice first.
