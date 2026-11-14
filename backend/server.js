import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { rank, LABELS } from './categories.js';
import { getTaxonomy } from './discover.js';
import * as db from './db.js';

const PORT = process.env.PORT || 8787;
const IDS_PATH = new URL(`../${process.env.NESSIE_IDS || 'scripts/nessie-ids.json'}`, import.meta.url); // NESSIE_IDS=scripts/ids-maya.json switches persona

// ---------- /categories ----------

function mock() {
  const c = (id, total, count, lateNightCount) => ({ id, label: LABELS[id], parent: id, keywords: [], total, count, lateNightCount });
  return {
    month: new Date().toISOString().slice(0, 7),
    source: 'mock',
    taxonomy: 'lookup',
    top: 'food_delivery',
    categories: [
      c('food_delivery', 428, 23, 19),
      c('online_shopping', 85.2, 4, 1),
      c('coffee_snacks', 48.3, 11, 0),
      c('gaming', 29.99, 1, 1),
      c('rideshare', 22.1, 2, 1),
      c('subscriptions', 15.99, 1, 0),
    ],
    essentialsTotal: 1250,
  };
}

async function fromNessie(force) {
  const ids = JSON.parse(await readFile(IDS_PATH, 'utf8'));
  const { getPurchases, getMerchant } = await import('./nessie.js');
  const names = Object.fromEntries(Object.entries(ids.merchants || {}).map(([name, id]) => [id, name]));
  const purchases = await getPurchases(ids.accountId);
  for (const p of purchases) names[p.merchant_id] ??= (await getMerchant(p.merchant_id))?.name ?? '';
  const rows = purchases.map(p => ({
    merchantName: names[p.merchant_id] || '',
    amount: Number(p.amount) || 0,
    date: p.purchase_date || '',
    description: p.description || '',
  }));
  return rank(rows, undefined, 'nessie', await getTaxonomy(rows, { force, accountId: ids.accountId }));
}

let catCache = null; // { at, data }
async function getCategories(force = false) {
  if (!force && catCache && Date.now() - catCache.at < 5 * 60_000) return catCache.data;
  let data;
  try {
    if (!process.env.NESSIE_API_KEY) throw new Error('no NESSIE_API_KEY');
    data = await fromNessie(force);
  } catch (e) {
    console.warn('categories: using mock -', e.message);
    data = mock();
  }
  catCache = { at: Date.now(), data };
  return data;
}

// ---------- /classify ----------

// Coarse domain hints; mapped onto whichever discovered category has that parent.
const DOMAINS = {
  food_delivery: ['doordash.com', 'ubereats.com', 'grubhub.com', 'mcdonalds.com', 'burgerking.com', 'tacobell.com', 'wendys.com', 'postmates.com', 'seamless.com'],
  coffee_snacks: ['starbucks.com', 'dunkindonuts.com', 'dunkin.com'],
  online_shopping: ['amazon.com', 'amzn.to', 'target.com', 'shein.com', 'temu.com', 'walmart.com'],
  gaming: ['store.steampowered.com', 'playstation.com', 'xbox.com', 'epicgames.com'],
  subscriptions: ['netflix.com', 'spotify.com', 'hulu.com', 'disneyplus.com'],
  rideshare: ['uber.com', 'lyft.com'],
};
const SELL = /order now|promo code|free delivery|\$0 delivery|delivery fee|add to cart|buy now|shop now|checkout|% off|coupon|limited time|sponsored|subscribe now|free trial/i;
// Craving content per group: not an ad, but made to make you want to buy. Recipes/reviews/tutorials are NOT triggers.
const TRIGGERS = {
  food_delivery: /mukbang|eating show|asmr eat|food challenge|eating (every|\d+|the (biggest|entire))|tr(y|ied|ying) every|taste test|cheat day|drive[- ]?thru|fast food haul|what i eat in a day|food tour|10,?000 calorie|street food|food vlog|foodie|all you can eat|buffet|\beating\b|\btasting\b|#food\b/i,
  online_shopping: /\bhaul\b|unboxing|amazon finds|tiktok made me buy|must[- ]haves|try[- ]on/i,
  coffee_snacks: /starbucks (secret|drink)|trying every (drink|snack)|snack haul/i,
  gaming: /\bskins?\b|item shop|v-?bucks|robux|battle ?pass|\bloot\b|gacha|\bpulls?\b|pack opening|\btokens?\b|new season|\bcrates?\b|unlock|rare (item|skin)|limited[- ]time|pre-?order|new release|grinding for/i,
};
const INFO = /recipe|how to (make|cook)|cooking|homemade|ingredients|tutorial/i; // make-it-yourself content is never a craving trigger
const esc = k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function hostParent(href = '') {
  let host;
  try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { return null; }
  for (const [cat, list] of Object.entries(DOMAINS)) if (list.some(d => host === d || host.endsWith('.' + d))) return cat;
  return null;
}

// cats: specific categories from /categories (each has .parent = broad group).
// Returns { category, group, selling, trigger, sure }; sure=false -> Jev decides.
function keywords(it, cats) {
  const text = `${it.text} ${it.alt}`;
  const all = `${text} ${it.href}`;
  const byParent = parent => cats.find(c => c.parent === parent)?.id;
  const kw = cats.find(c => c.keywords?.length && new RegExp(`\\b(${c.keywords.map(esc).join('|')})`, 'i').test(all))?.id;
  const domParent = hostParent(it.href);
  const trigGroup = INFO.test(text) ? null : Object.keys(TRIGGERS).find(g => TRIGGERS[g].test(text));
  const category = kw || byParent(domParent) || byParent(trigGroup) || 'other';
  const group = cats.find(c => c.id === category)?.parent || domParent || trigGroup || 'other';
  const trigger = Boolean(trigGroup && trigGroup === group);
  const selling = Boolean(domParent || it.adMarker || SELL.test(text));
  return { category, group, selling, trigger, sure: group !== 'other' && (selling || trigger) };
}

const clip = (s, n = 500) => String(s ?? '').slice(0, n);
const aiCache = new Map(); // Jev results by content hash. ponytail: unbounded, fine for a demo; add LRU if it runs for days

// Jev (TypeSafe AI System One): typed decisions, ~0.2s per batch. Two choice questions per page item:
// which spending group it belongs to, and what kind of content it is.
const GROUP_DESC = {
  food_delivery: 'Food of any kind: restaurants, fast food, delivery apps, snacks shown being eaten, food videos',
  coffee_snacks: 'Coffee shops, cafe drinks, bubble tea, snacks',
  online_shopping: 'Shopping: products, clothes, gadgets, Amazon, hauls, unboxings',
  gaming: 'Video games: gameplay, skins, items, loot, in-game currency (V-Bucks, Robux), battle passes, game stores, consoles',
  subscriptions: 'Streaming and subscription services',
  rideshare: 'Rideshare and taxis',
};
const KIND = {
  ad: 'An ad, sponsored post, promo, deal, product listing, or a way to order/buy/subscribe',
  craving: 'Content that makes you want to spend in its category. Food: mukbangs, eating shows, food vlogs, street food, restaurant reviews and rankings, taste tests, food challenges. Shopping: hauls, unboxings, try-ons, product reviews. Gaming: skins, item shop, battle pass, rare items, tokens, loot or chest openings, gacha or pack pulls, new seasons and updates, game trailers, grinding for an item',
  info: 'Teaches a skill or is unrelated to buying: recipes, cooking tutorials, building or strategy guides, nutrition, news, education',
  other: 'Anything else, including plain gameplay with no items, skins or purchases',
};

async function jev(items, cats) {
  // Offer every group, not just the ones this person spends in: otherwise a game ad gets forced into "Shopping".
  const groups = Object.keys(GROUP_DESC);
  const groupCriteria = { ...Object.fromEntries(groups.map(g => [g, GROUP_DESC[g]])), none: 'None of these' };
  const state = 'Items from a social media / video page (title, caption, image text, link):\n' +
    items.map((it, i) => `[${i}] ${it.adMarker ? '(marked Sponsored) ' : ''}${it.text} ${it.alt} ${it.href ? `<${it.href.slice(0, 120)}>` : ''}`.replace(/\s+/g, ' ')).join('\n');
  const questions = {};
  items.forEach((_, i) => {
    questions[`g${i}`] = { type: 'choice', instructions: `Which spending category is item [${i}] about?`, criteria: groupCriteria };
    questions[`k${i}`] = { type: 'choice', instructions: `What kind of content is item [${i}]?`, criteria: KIND };
  });
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.JEV_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.JEV_MODEL || 'jev-latest', state, questions }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`jev ${res.status}`);
  const { answers = {} } = await res.json();
  const byParent = parent => cats.find(c => c.parent === parent)?.id;
  return new Map(items.map((it, i) => {
    const g = answers[`g${i}`]?.choice, k = answers[`k${i}`]?.choice;
    const category = (g && g !== 'none' && byParent(g)) || 'other';
    return [it.id, { category, selling: k === 'ad', trigger: k === 'craving' }];
  }));
}

const MAX_ITEMS = 40; // extension batches the same size

async function classify(raw) {
  const cats = (await getCategories()).categories;
  const ver = cats.map(c => c.id).join(',');
  const keyOf = it => createHash('sha1').update(`${ver}\n${it.text}\n${it.alt}\n${it.href}`).digest('hex');
  const items = (Array.isArray(raw) ? raw : []).slice(0, MAX_ITEMS).map(it => ({
    id: clip(it?.id, 100), text: clip(it?.text), alt: clip(it?.alt), href: clip(it?.href), adMarker: Boolean(it?.adMarker),
  }));
  const results = new Map();
  const todo = [];
  for (const it of items) {
    const k = keywords(it, cats);
    if (k.sure) results.set(it.id, { category: k.category, selling: k.selling, trigger: k.trigger });
    else if (aiCache.has(keyOf(it))) results.set(it.id, aiCache.get(keyOf(it)));
    else todo.push(it);
  }
  // Jev for anything keywords weren't sure about; keywords cover whatever is left.
  let source = 'keywords';
  if (todo.length && process.env.JEV_API_KEY) {
    try {
      const got = await jev(todo, cats);
      for (const it of todo) {
        const r = got.get(it.id);
        if (r) { aiCache.set(keyOf(it), r); results.set(it.id, r); }
      }
      source = 'jev';
    } catch (e) {
      console.warn('classify: jev failed -', e.message);
    }
  }
  for (const it of todo) if (!results.has(it.id)) {
    const { category, selling, trigger } = keywords(it, cats);
    results.set(it.id, { category, selling, trigger });
  }
  const groupOf = id => cats.find(c => c.id === id)?.parent || 'other';
  return { source, results: items.map(it => { const r = results.get(it.id); return { id: it.id, ...r, group: groupOf(r.category) }; }) };
}

// ---------- server ----------

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('body too large');
  }
  return JSON.parse(body || '{}');
}

async function hasIds() {
  try { await readFile(IDS_PATH); return true; } catch { return false; }
}

http.createServer(async (req, res) => {
  // No CORS on purpose: only the extension (via host_permissions) should read spending data.
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  try {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    if (req.method === 'GET' && path === '/health') return send(200, { ok: true, nessie: Boolean(process.env.NESSIE_API_KEY) && await hasIds(), gemini: Boolean(process.env.GEMINI_API_KEY), db: await db.ping().catch(() => false) });
    if (req.method === 'POST' && path === '/events') {
      let body;
      try { body = await readJson(req); } catch (e) { return send(400, { error: e.message }); }
      if (!['blocked', 'shown'].includes(body?.type)) return send(400, { error: 'type must be blocked or shown' });
      await db.logEvent(body.type, clip(body.category, 60) || null);
      return send(200, { ok: true, stored: db.enabled });
    }
    if (req.method === 'GET' && path === '/categories') return send(200, await getCategories(url.searchParams.has('rediscover')));
    if (req.method === 'POST' && path === '/classify') {
      let body;
      try { body = await readJson(req); } catch (e) { return send(400, { error: e.message }); }
      return send(200, await classify(body?.items));
    }
    send(404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    send(500, { error: 'internal error' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Impulse backend on http://localhost:${PORT}`));
