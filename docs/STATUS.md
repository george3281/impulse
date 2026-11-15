# Status - 2026-11-14

## Works (verified end to end in headless Chromium with the unpacked extension)
- Nessie seed: Jordan persona, 10 merchants, 43 purchases (Oct 15 - Nov 14), saved to `scripts/nessie-ids.json`.
- `GET /categories` on real Nessie data: food delivery & fast food $428 (19 of 23 late night) is the top category.
- Demo page: exactly the 5 food ads blur with "$428 ... this month"; sneaker/game ads, recipe, review and normal posts stay visible. "Show anyway" unblurs; popup counters correct (5 blocked / 1 shown).
- Backend down: extension falls back to built-in mock data + local keyword classifier, demo still blurs the same 5.
- Specific categories: with a Gemini-shaped taxonomy (simulated), the top category becomes "Late-night delivery apps" ($352), the overlay uses that label, and the McDonald's ad stays visible because "Fast food" is now its own category.
- Review agent: no secrets in git history, `.env*` ignored. All 12 findings fixed (batch size 40, throttled rescans, leftover rescans, no CORS + bind 127.0.0.1, popup refresh on open, no moving page nodes, inline hosts, YouTube SPA reset, promise catches, tighter ad selectors, focus after "Show anyway", unique button labels).

## Update - broader blocking + sites
- Blocking works on a broad group ("Food" $428 = delivery apps + fast food). Ads AND craving content (mukbangs, "I tried every item", eating challenges; hauls/unboxings for Shopping) blur at any hour. Recipes/reviews stay visible.
- YouTube verified live (signed out): "mukbang" search 31/32 blurred, "easy burger recipe" 0/40 blurred, Shorts non-food not blurred.
- TikTok + Instagram/Reels: selectors added (TikTok data-e2e feed/search items; Instagram `main article`; on both, each <video> climbs to its own post/reel container). NOT verified: headless gets TikTok's error page and Instagram's login wall. Test signed in.
- Blurred videos are paused and kept paused.
- Neon Postgres: taxonomy persisted.
- Gemini free tier now returns 429 (quota); keyword fallback handles classification.

## Mocked / untested
- Gemini discovery verified for real (gemini-3.8-flash): 7 specific categories, top category "Food Delivery Apps" $352. `/classify` via Gemini has only timed out so far (model overloaded, 503s); keyword fallback produced the right blurs. New-merchant placement not yet exercised.
- Not tested on live YouTube / Instagram yet.

## Decisions
- Plain `http://api.nessieisreal.com` times out on this network; using `https://`.
- "This month" = rolling last 30 days so the seeded month shows in full.
- Nessie stores whole dollars (cents truncated). Accepted.
- Jev (TypeSafe AI) dropped per owner; Gemini both discovers categories and places new merchants into them (one cached call per new merchant).
- Est. saved = one avoided order per day that had a block and no "Show anyway", times the average order in the blocked groups, capped at actual spend in those groups.
- Zero dependencies in backend and extension.
- "Claude Better Design" skill not installed; followed the brief's design rules (contrast, keyboard, screen-reader labels, reduced motion).

## Blockers / needed from owner
- `GEMINI_API_KEY` in `backend/.env` (https://aistudio.google.com/apikey, free tier). Then hit `GET /categories?rediscover=1` once.
- Repo: https://github.com/george3281/impulse (make sure it is public and both members are contributors).

## Next 5 tasks
1. Re-run `GET /categories?rediscover=1` when gemini-3.8-flash is less loaded (prompt now puts fast food under the food parent) and confirm `/classify` gets real Gemini answers.
2. If Gemini splits "delivery apps" from "fast food", decide the demo story: block top 1 (precise) or let the user pick several categories (stretch goal) so the McDonald's ad also blurs.
3. Try live YouTube / Instagram web and tune `SELECTORS` in `extension/content.js`.
4. Seed a few more merchants (e.g. a designer brand) so discovered categories show off specificity in the popup.
5. Update DEVPOST.md for specific categories, record the <3 min demo video, submit before Saturday 11:59 PM.
