# Launch checklist

Items we did **not** assume. Each one is either hidden on the site until set, or flagged here.

## Must do before going live

- [ ] **Domain:** pick one (suggestion: `cabs.reverieautos.co.uk`) and set `SITE_URL`.
- [ ] **Sales phone number:** set `SALES_PHONE`. Hidden until set.
- [ ] **Public email:** set `SALES_PUBLIC_EMAIL` (shown in footer and privacy notice). Hidden until set.
- [ ] **Admin password:** set `ADMIN_PASSWORD`. `/admin` is disabled until set.
- [ ] **Sales alerts:** set `SALES_WEBHOOK_URL` and/or `RESEND_API_KEY` + `FROM_EMAIL` + `SALES_EMAILS`. Without them, bookings only appear in `/admin`.
- [ ] **Team size and hours:** set `SALES_REPS`; confirm call hours in `src/config.js` DEFAULT_HOURS (Mon–Fri 9–6, Sat 10–2 by default) and the hours text in `sites/cabs/views/partials/booking.html`.
- [ ] **Bank holidays:** set `CLOSED_DATES`.
- [ ] **Confirm Trustpilot link** in `sites/cabs/site.js` points at the right Reverie Autos profile.
- [ ] **Review all copy** with the team, especially "what we check" on the used TX page, so it matches what you actually do.
- [ ] **ICO registration:** confirm Reverie Autos Ltd's data protection fee registration is current.

## Only if offering finance

- [ ] Confirm FCA status (own permission or appointed representative of a principal).
- [ ] Set `FCA_STATEMENT` with exact approved wording (FRN, broker-not-lender, commission disclosure as required). This switches on the finance page, nav link and finance options in the form.
- [ ] Have the principal/compliance approve the finance page copy.

## Nice to have in week 1

- [ ] Photos of real stock (replace the figure panels with images in `public/assets/`).
- [ ] Google Business Profile category "Used car dealer" with a link to the site.
- [ ] Zap: webhook → Google Sheet row + Slack/WhatsApp message to the sales group.
- [ ] If adding Google Ads / Meta pixels: add a cookie consent banner and update the privacy notice first.
