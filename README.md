# Impulse

Chrome extension that finds your biggest discretionary spending category (from Capital One's Nessie sandbox) and blurs ads and shopping content for that category, showing your own month-to-date spend: "You've spent $312 on food delivery this month. Still want to see this?"

> Prototype using sandbox data. Not financial advice.

HackUMass 2026.

## Layout
- `backend/` - Node server (no deps). Proxies Nessie + Gemini so keys never ship in the extension.
- `extension/` - Manifest V3 extension (content script, service worker, side panel).
- `scripts/` - Nessie seed script for the demo persona.
- `docs/` - API contract, status, Devpost draft.

## Setup
Requires Node 20+ (built-in fetch) and Chrome. No npm install needed.

1. `cp .env.example backend/.env` and fill in `NESSIE_API_KEY` (from http://api.nessieisreal.com) and optionally `GEMINI_API_KEY` (https://aistudio.google.com/apikey). Without Gemini, categories come from a fixed lookup table and classification falls back to keywords.
2. Seed the sandbox once (creates the Jordan persona, merchants and ~30 days of purchases, saves IDs to `scripts/nessie-ids.json`):
   `node --env-file=backend/.env scripts/seed.mjs` (add `--force` to reseed).
3. Database (Neon Postgres): `npm i -g neon && neon deploy` in the repo root pulls `DATABASE_URL` / `DATABASE_URL_UNPOOLED` into `.env.local`, then `npm run migrate` applies `backend/schema.sql` (tables `taxonomy`, `events`). Optional: without `DATABASE_URL` nothing is persisted but everything else works.
4. Start the backend: `npm start` (Jordan, food-heavy). Second persona, Maya (shopping-heavy): `NESSIE_IDS=scripts/ids-maya.json npm start`. Add your own: write `scripts/personas/<name>.json` and run `node --env-file=backend/.env scripts/seed.mjs --persona scripts/personas/<name>.json --out scripts/ids-<name>.json`.
   (http://localhost:8787, `GET /health`, `GET /categories`, `POST /classify`, `POST /events`). `npm test` runs the category self-check.
5. Load the extension: `chrome://extensions` -> Developer mode -> Load unpacked -> `extension/`.
6. Demo: serve the backup page with `cd extension/demo && python3 -m http.server 8000` and open http://localhost:8000 (or open the file directly and enable "Allow access to file URLs" in the extension's details).

If the backend is down, the extension falls back to built-in mock data and a local keyword classifier so the demo still works.

## Architecture
```
Nessie API  <--  backend (node:http)  <--  service worker (background.js)  <--  content.js (scan + blur)
Gemini API  <--   /categories /classify      caches categories (5 min)           side panel (chart, toggle, counters)
```
- `/categories`: Nessie purchases (last 30 days) -> Gemini-discovered specific categories ("Late-night delivery apps", "Designer clothes"; coarse lookup table without a key) -> ranked discretionary categories; top one is the top category. New merchants are placed into the existing categories by Gemini. Essentials (rent, groceries) are never blocked.
- `/classify`: keyword/domain pre-filter, then one batched Gemini call for the rest; returns `{category, selling}`. Only `selling: true` items in a blocked category get blurred, so recipes and reviews stay visible.
- Choose what to block: the side panel lists spending groups (Food, Shopping, Rides...) with checkboxes; the top group is checked to start. Each overlay shows the spend for that post's own group.
- Craving content (mukbangs, eating challenges, hauls) is blurred along with ads; recipes and tutorials stay visible.
- Neon Postgres (node-postgres pool): Gemini-discovered categories persist in `taxonomy`; every blur and "Show anyway" is logged to `events`.
- API keys live only in `backend/.env` and `.env.local`; the extension never sees them.

## Team
- George Ji
- Justin Nguyen

## Credits
No external code or libraries. Data: Capital One Nessie sandbox API. Classification: Google Gemini API.
