# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who impulse-spends: people whose purchases are triggered in the moment by what they see while browsing (food ads, mukbangs, shopping hauls, promos), often late at night, and who switch off hard blockers. The founding case is a college student who spends about $400 a month on late-night food delivery right after seeing food content. HackUMass 2026 judges see the product in a 2-minute live demo.

## Product Purpose

Impulse is a Chrome extension that reads the user's real spending, finds the categories they overspend on, and blurs ads and craving content for those categories while they browse, showing their own number on top. Success is fewer impulse purchases without the user switching the tool off.

## Positioning

Friction built from the user's own money, not a time or app blocker. The overlay shows what the user has actually spent in that category this month, and every blur can be dismissed with "Show anyway". It blocks ways to buy and content made to make you crave (ads, promos, mukbangs, hauls), not interests: recipes, tutorials and normal posts stay visible.

## Operating Context

- Runs on YouTube, TikTok (feed, viewer, search, DMs), Instagram (feed, explore, reels) only.
- Chrome side panel: shows spending by category, lets the user pick up to 3 groups to block, a master on/off, and counters (blocked, shown anyway, estimated money saved).
- Overlay: sits on top of third-party pages inside each blurred post, at every size from a 150px thumbnail to a full video player.
- Spending comes from Capital One's Nessie sandbox; categories are discovered by Gemini; page content is classified by Jev (TypeSafe AI) with a keyword fallback; categories are stored in Neon Postgres.

## Capabilities and Constraints

- Chrome Manifest V3 extension: content script, service worker, side panel. No build step, no frameworks, zero runtime dependencies in the extension.
- Overlay CSS must be namespaced and must not break host pages; it lives inside each blurred host's own stacking context.
- Spending groups: Food, Shopping, Rides, Coffee & snacks, Gaming, Subscriptions; specific categories under each come from Gemini. Essentials (rent, groceries) are never blocked.
- Maximum of 3 blocked groups at once.
- Backend may be offline: the extension falls back to built-in sample data and must say so.
- Prototype on sandbox data; "Not financial advice" must remain visible.

## Brand Commitments

- Name: "Impulse".
- Icon and wordmark: the square icon with lowercase "impulse" (extension/icons). The icon's colors are not binding for the UI.
- "Show anyway" stays deliberately unattractive and monochrome: clicking it should feel like a small cost, never an invitation.
- Voice: blunt and dry. Facts, not encouragement or shame. Example: "$428 on food. 19 orders after 10 PM."
- Visual standard (chosen 2026-11-14 over two rolled worlds): the category standard executed at full craft, no thematic world. Benchmarks for the quality bar: Linear (precision, density), Arc / Chrome's own side panel (native browser chrome), Opal / one sec (calm one-message friction screens).

## Evidence on Hand

- Demo persona "Jordan" seeded in the Nessie sandbox (scripts/seed.mjs, scripts/nessie-ids.json): $428 on food in 30 days, 19 of 23 food orders after 10 PM.
- Offline demo feed page: extension/demo/index.html.
- No real users, testimonials, metrics or press. Do not invent them.

## Product Principles

1. The user's own number does the work. Every intervention shows real spending, never generic warnings.
2. Friction, not prison. Blocking is always reversible in one click, and that click is logged.
3. Block ways to buy, not interests.
4. Say it once, plainly. No streaks, guilt, or gamified pressure.
5. Never pretend: sample data, estimates and gaps are labeled as such.

## Accessibility & Inclusion

Keyboard-operable overlay and panel, screen-reader labels on every overlay, WCAG AA contrast, reduced-motion support. Designed for users with ADHD: low noise, one clear message per surface.
