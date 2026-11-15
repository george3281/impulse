# Impulse

A Chrome extension that reads your real spending and blocks content built to make you buy more, and shows what you've already spent in that category this month.

Built at HackUMass 2026. Prototype on Capital One's Nessie sandbox data.

## Getting Started

First, add your API keys:

```bash
cp .env.example backend/.env
```

Then fill in `NESSIE_API_KEY`, `GEMINI_API_KEY` and `JEV_API_KEY` in `backend/.env`.

Install and start the backend:

```bash
cd backend
npm install
npm start
```

The backend runs at http://localhost:8787.

Then load the extension in Chrome:

1. Open `chrome://extensions` and turn on Developer mode.
2. Click Load unpacked and pick the `extension/` folder.
3. Click the Impulse icon to open the side panel.

Now browse YouTube, TikTok or Instagram. Posts that push you to spend in the groups you block get blurred.

## Demo Data

Impulse comes with two sample people in the Nessie sandbox:

```bash
npm start                                    # Jordan, spends most on food
NESSIE_IDS=scripts/ids-maya.json npm start   # Maya, spends most on shopping
```

To create your own, copy `scripts/personas/maya.json`, edit it, and run:

```bash
node --env-file=backend/.env scripts/seed.mjs --persona scripts/personas/<name>.json --out scripts/ids-<name>.json
```

There's also an offline demo page in `extension/demo/`. Serve it with `python3 -m http.server 8000` from that folder and open http://localhost:8000.

## Database

Impulse can save its categories and a log of blocks to Neon Postgres. This is optional; everything else works without it.

```bash
npm i -g neon
neon deploy
npm run migrate
```

## How It Works

- **Capital One Nessie** provides the purchases.
- **Gemini** sorts your merchants into spending categories.
- **Jev** (TypeSafe AI) decides which posts on the page are trying to make you buy something.
- **Neon Postgres** stores the categories and every block.

API keys stay in the backend and are never sent to the extension.

## Team

- George Ji
- Justin Nguyen
