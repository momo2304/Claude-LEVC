# Reverie Executive: plan

Nearly new Mercedes-Benz and BMW executive cars for UK chauffeurs and executive private hire drivers. Every enquiry becomes a booked sales call. Research and sources: [RESEARCH.md](RESEARCH.md).

## 1. The opportunity

| Fact (Oct 2026) | What it means |
|---|---|
| **290,000 licensed PHVs in England**, +13% in two years; 93,300 in London (DfT, Apr 2026). | Large, growing market of owner-drivers who must buy or rent a compliant car. |
| **Uber's new Exec/Lux rules** apply to cars added from 1 Aug 2026 (London) and **19 Oct 2026** (rest of UK): Exec = Mercedes/BMW/Audi/Jaguar/Lexus saloons, 5 model years in London/Manchester/Birmingham, 6 elsewhere, dark colours in the big three. | A wave of drivers outside London need eligible cars now; drivers on older cars will age out. |
| **Wheely takes cars 3 years old or newer**; Wheely First = S-Class W223 LWB, 2024+, panoramic roof, rear blinds. | Nearly new is the sweet spot; exact spec matching is a service drivers will pay for. |
| **TfL: every new London PHV licence must be zero emission capable** (since 2023). | Diesel V-Class, E 220 d, S 350 d can't be newly licensed in London. Steer London drivers to EQV, EQE, EQS, i7, S 580 e, E 300 e, 750e. Avoid selling the wrong car. |
| **Big luxury EVs list at about half their new price at 2–3 years** (EQS 450+ ~£45k vs £91,765 new; i7 eDrive50 from ~£50k vs £104,230). | Nearly new EVs are the strongest value story for owner-drivers. |
| **Rent-to-buy dominates** (EQE £229–£355/wk, EQS ~£520/wk) and its reviews complain about deposits, damage charges and insurance payouts. | "Own it, in your name, spec checked in writing" is the positioning. |
| **Reverie already offers sourcing, part-exchange, finance and delivery** as a premium used-car dealer. | The sub-brand packages an existing strength for a specific buyer. |

## 2. Brand decision

**"Reverie Executive", with the line "Chauffeur cars · by Reverie Autos".**

- Chauffeurs search and talk in "exec" terms (Uber Exec, executive PHV, exec car). "Executive" is premium without sounding like a taxi firm.
- "Chauffeur cars" in the strap makes clear it sells cars, so passengers don't mistake it for a ride service.
- "by Reverie Autos" borrows 10+ years of trading history and the existing reviews. No name clash found in a search.
- It sits alongside "Reverie Cab Sales" on the same code and booking engine, one Reverie family.
- Independent: not a franchised Mercedes-Benz or BMW retailer, and not affiliated with any platform. Every page says so.

## 3. Audience and offers

| Segment | Trigger | Landing page | Offer |
|---|---|---|---|
| Uber Exec drivers outside London | 19 Oct 2026 rules for added cars | Home, E-Class hybrid, EQE | Eligible nearly new car + part-exchange |
| Wheely drivers | 3-year age limit, First spec | S-Class, EQS, i7, V-Class | Spec-matched sourcing |
| Drivers on 4–5 year old cars | About to age out of Exec/Wheely | Part-exchange | Valuation call, swap in the same deal |
| Airport / group specialists | XL fares | V-Class / EQV | London: EQV; elsewhere V-Class |
| Small chauffeur companies / fleets | Blacklane, Addison Lee, corporate accounts | Home (fleet option) | Multi-car sourcing |
| New licence holders | First exec car | Platform rules page | Advice call: which car for which platform |

## 4. Funnel (MVP built)

1. Ad / search / social → model page or home
2. **Eligibility checker** (car + year + city → Uber, Wheely, Blacklane, Bolt, TfL verdicts) builds trust and intent
3. Five-step form: need → car, work and licence → trading as, budget, current car, timeframe → call slot → name and mobile
4. Booking saved and scored (licensed + urgent + ageing current car + Ltd company + budget = hot); sales alerted by webhook/email with calendar invite
5. Thank-you page with calendar invite, reschedule/cancel link
6. Rep calls at the slot with the platform spec in front of them, logs outcome in `/admin`

**Pages:** home, 7 model pages (S-Class, EQS, EQE, E-Class hybrid, V-Class/EQV, i7, 7 Series), platform rules, sell/part-exchange, finance (hidden until FCA wording set), privacy, thank-you, manage booking.

**Next after MVP:** live stock feed per model page; SMS reminder before the call; WhatsApp click-to-chat; per-platform landing pages for ads ("Uber Exec cars outside London"); total-cost calculator (buy vs rent-to-buy) once finance wording is approved.

## 5. Traffic plan

| Channel | Approach | Suggested start |
|---|---|---|
| Google Search | Ad groups per model and platform: "uber exec car for sale", "wheely approved car", "s class for chauffeur", "eqe pco", "v class for sale chauffeur", "i7 chauffeur". Send each to its model page. | £30–40/day |
| Meta | Drivers 25–60 in London, Manchester, Birmingham, Leeds; creative on the 19 Oct Uber change and the Wheely 3-year rule; send to the checker | £20/day |
| Communities | Driver WhatsApp and Facebook groups, chauffeur associations, airport holding areas (QR to the checker with `utm_source=flyer`) | Time |
| SEO | Platform rules page targets "uber exec car requirements 2026" and "wheely car requirements". Keep it updated monthly. | Time |
| Existing customers | Reverie's chauffeur buyers: email the checker and part-exchange page | Free |

Tag every link with UTM parameters: they're saved with each lead and appear in the CSV export.

## 6. KPIs

| Metric | First-month aim (adjust once data is in) |
|---|---|
| Page → booked call | 3–6% |
| Booked → answered | 70%+ |
| Answered → qualified | 50%+ |
| Qualified → sale | track from week 1 |
| Cost per booked call by campaign | from UTM in CSV |

## 7. Compliance

- **Finance:** the site does not promote finance until `FCA_STATEMENT` is set. Regulated deals (consumers, and sole traders or small partnerships borrowing £25,000 or less) need the full FCA treatment with commission disclosure. Business lending to limited companies is unregulated, and sole-trader borrowing over £25,000 for business can be exempt with a declaration, but promotions still need sign-off. The form records how the driver trades so sales can route the deal correctly.
- **Platform claims:** every page states that rules change and drivers must confirm with the platform. Rules are summarised from public pages with dates and links.
- **Data protection:** explicit call consent, separate optional marketing consent, privacy notice, no tracking cookies by default.
- **Trade marks:** Mercedes-Benz, BMW and platform names are used only to describe vehicles and rules. No logos.
