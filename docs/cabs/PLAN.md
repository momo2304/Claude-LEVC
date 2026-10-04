# Reverie Cab Sales: plan and research

Research checked 4 October 2026. Sources are listed at the end.

## 1. The opportunity

| Fact | What it means for us |
|---|---|
| Final assembly of the current LEVC TX ended in **September 2026**. The next-generation LEVC cab is planned for the **second half of 2027**, with build location still uncertain. | For about a year, London drivers who want a new-generation cab can only buy used. Used TX supply is tight and that is our headline. |
| The **Plug-in Taxi Grant closed in April 2026** (it had fallen from £7,500 to £3,000–£4,000). | New cabs got more expensive; well-priced used stock and part-exchange matter more. |
| TfL licenses a London taxi for a **maximum of 15 years** from first registration; **newly licensed taxis must be zero emission capable**. | Every TX4 and Vito has a hard end date. A plate-age checker turns that into urgency without hype. |
| About **59% of London cabbies are 56 or older**; the fleet fell from ~19,000 (2020) to ~14,750 (2024). | The buyer is experienced, phone-first and price-aware. Calls, not chatbots. |
| LEVC says TX owners keep getting parts, servicing and support after assembly ends. | Answers the main objection to buying a TX now. |
| Published used TX valuations range widely (e.g. £25k–£36k quoted for 2020–22 TXs by one buyer site; dealer listings for very low-mile cabs far higher). | We don't publish prices until we have stock; the call handles price. |

## 2. Brand decision

**Endorsed sub-brand: "Reverie Cab Sales, by Reverie Autos".**

- Reverie Autos (Reverie Autos Ltd, company 09304340, Welwyn Garden City / Hatfield) is an established general used-car dealer, appointment-only, with Trustpilot reviews and CarGurus awards. Its main site speaks to car buyers.
- Cab drivers buy from specialists. A dedicated name and pages let us speak their language (green badge, Knowledge, plate age, Vista/Icon) without confusing Reverie's car customers.
- "by Reverie Autos" borrows ten years of trading history and reviews, which a brand-new name would lack.
- "Cab Sales" rather than "Cabs" or "Taxis" stops members of the public mistaking it for a taxi firm and booking rides.
- We are independent, not an LEVC franchised dealer. Every page says so and uses LEVC/TX names only to describe the vehicles. No LEVC logos or imagery.

## 3. Audience and offers

| Segment | Trigger | Page | Offer |
|---|---|---|---|
| TX4 / Vito owners near the 15-year limit | Plate end date | `/sell-or-part-exchange-your-cab` | Valuation call, part-exchange into a used TX |
| Drivers wanting a TX now | No new stock, no grant | `/used-levc-tx` | We source and prepare a TX to spec |
| Knowledge students about to get their badge | First cab | home | Call to plan first cab and budget |
| Small fleet owners | Replacing several cabs | home (fleet option) | Multi-cab sourcing call |
| Drivers leaving the trade | Retirement | part-exchange page | Straight purchase |

## 4. Funnel and the MVP

**One conversion: a booked call.** No "request a callback" limbo.

1. Ad / search / social → landing page matched to intent
2. Plate-age checker (home and part-exchange pages) pre-fills the form
3. Four-step form: need → licence and cab → call time → name and mobile
4. Booking saved, scored hot/warm/nurture, alerts sent to sales (webhook + email + calendar invite)
5. Thank-you page with calendar invite and reschedule/cancel link
6. Rep calls at the slot, logs outcome in `/admin`

**MVP scope (built in this repo):** 3 landing pages + finance page (gated), booking engine with real slot capacity, sales dashboard, CRM/Slack/Sheets webhook, email + .ics, reschedule/cancel, spam protection, UTM capture, SEO basics, privacy notice, tests, Docker/Render deploy.

**Not in the MVP (next):** SMS reminders (Twilio) 1 hour before the call, live stock pages fed from the dealer management system, Google Calendar two-way sync per rep, call recording/CRM-native dialler, A/B testing of headlines, WhatsApp click-to-chat.

## 5. Traffic plan

| Channel | Approach | Start budget (suggested) |
|---|---|---|
| Google Search | Exact/phrase: "used levc tx", "levc tx for sale", "sell my tx4", "tx4 part exchange", "black cab for sale london". Separate ad groups per page. | £20–30/day |
| Meta (Facebook) | London, 45–70, interests in taxi trade groups/pages; plate-age creative ("Is your TX4's plate running out?") | £15/day |
| Trade press / groups | TaxiPoint, cab trade Facebook groups, LTDA/UCG member offers, cab ranks and garages (QR code to `/sell-or-part-exchange-your-cab?utm_source=flyer`) | Print only |
| SEO | Pages already target the main terms; add a stock page and a "TX4 age limit" guide next | Time |

Always tag links with `utm_source`, `utm_medium`, `utm_campaign`: they are stored with each lead and exported in the CSV.

## 6. KPIs

| Metric | Target to aim for in month 1 (set your own once data is in) |
|---|---|
| Landing page → booked call | 4–8% |
| Booked → call answered | 70%+ |
| Answered → qualified | 50%+ |
| Qualified → sale | track from week 1 |
| Cost per booked call | track by `utm_campaign` |

Measure from the `/admin` CSV export (status + UTM columns).

## 7. Compliance notes

- **Finance:** promoting or arranging finance is FCA-regulated credit broking. The finance page and finance options stay hidden until `FCA_STATEMENT` is set with Reverie Autos' authorisation wording (own FRN or appointed-representative status). No APRs or monthly prices are shown anywhere.
- **Data protection (UK GDPR / PECR):** explicit consent to be called, separate optional marketing consent, privacy notice, no analytics or ad cookies by default. If you add Google Ads/Meta pixels, add a cookie consent banner first.
- **Trade marks / passing off:** independence disclaimer on every page; LEVC/TX used descriptively only.
- **Claims:** every factual claim on the pages has a public source listed in the page footer.

## Sources

- TfL taxi age limits consultation report: https://content.tfl.gov.uk/taxi-age-limits-consultation-report.pdf
- TaxiPoint, next LEVC cab 2027 and end of TX assembly: https://www.taxi-point.co.uk/post/new-black-cab-revealed-levc-confirms-2027-launch-as-current-tx-production-reaches-the-end-of-the-ro
- DM News, LEVC targets H2 2027 (assembly concluding September 2026): https://dmnews.co.uk/levc-targets-second-half-of-2027-for-next-generation-london-taxi/
- Autocar, LEVC new cab 2027, may not build in UK: https://www.autocar.co.uk/car-news/new-cars/levc-launch-new-black-cab-2027-%E2%80%93-may-not-build-uk
- TaxiPoint, Plug-in Taxi Grant ends: https://www.taxi-point.co.uk/post/plug-in-taxi-grant-ends-raising-fresh-questions-around-cost-of-electric-taxis-wheelchair-accessibi
- TaxiPoint, fleet decline and TX supply: https://www.taxi-point.co.uk/post/what-will-replace-them-tfl-challenged-over-shrinking-older-london-taxi-fleet-as-tx-production-winds
- TaxiPoint, 59% of cabbies 56+: https://www.taxi-point.co.uk/post/the-trade-is-retiring-london-taxi-retirement-timebomb-as-six-in-ten-cabbies-are-now-aged-56-or-ov
- LEVC TX specifications: https://en.wikipedia.org/wiki/LEVC_TX
- SellYourCab, age limit guide and used values: https://sellyourcab.co.uk/blog/tfl-black-cab-age-limit-2026
- Companies House, Reverie Autos Ltd: https://find-and-update.company-information.service.gov.uk/company/09304340
- AutoTrader dealer page, Reverie Autos: https://www.autotrader.co.uk/dealers/hertfordshire/hatfield/reverie-autos-limited-10004338
- FCA, motor dealers and credit broking: https://www.fca.org.uk/firms/authorisation/consumer-credit-brokers/motor-dealers
