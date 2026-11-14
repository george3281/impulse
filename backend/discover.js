// Spending taxonomy: Gemini reads the transactions once and invents specific categories
// ("Late-night fast food", "Designer clothes") instead of coarse ones ("food", "shopping").
// New merchants later get placed into that same list with one small Gemini call (cached).
// No GEMINI_API_KEY -> coarse fallback built from the lookup table, same shape.
import { categorize, LABELS, RULES } from './categories.js';
import { loadTaxonomy, saveTaxonomy } from './db.js'; // persisted in Neon Postgres (taxonomy table)
export const PARENTS = [...Object.keys(LABELS), 'essentials', 'other'];

// Taxonomy shape: { source, categories: [{ id, label, parent, keywords: [] }], merchants: { name: id } }

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'other';

// Trust boundary: Gemini output is untrusted JSON, keep only well-formed bits.
export function normalize(raw, merchantNames) {
  const cats = [];
  for (const c of Array.isArray(raw?.categories) ? raw.categories : []) {
    const id = slug(c?.id || c?.label);
    if (cats.some(x => x.id === id)) continue;
    cats.push({
      id,
      label: String(c?.label || id).slice(0, 40),
      parent: PARENTS.includes(c?.parent) ? c.parent : 'other',
      keywords: (Array.isArray(c?.keywords) ? c.keywords : []).map(k => String(k).toLowerCase().trim().slice(0, 40)).filter(Boolean).slice(0, 25),
    });
  }
  const ids = new Set(cats.map(c => c.id));
  const merchants = {};
  for (const name of merchantNames) {
    const id = slug(raw?.merchants?.[name] ?? '');
    merchants[name] = ids.has(id) ? id : null;
  }
  return { categories: cats, merchants };
}

export function fallback(merchantNames) {
  const categories = Object.entries(LABELS).map(([id, label]) => ({
    id, label, parent: id, keywords: (RULES.find(([c]) => c === id)?.[1] || []).slice(),
  }));
  categories.push({ id: 'essentials', label: 'Essentials', parent: 'essentials', keywords: [] });
  return { source: 'lookup', categories, merchants: Object.fromEntries(merchantNames.map(n => [n, categorize(n)])) };
}

async function askGemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return JSON.parse((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
}

const RULES_TEXT = `Each category needs: "id" (snake_case), "label" (2-4 words, plain language),
"parent" (one of ${PARENTS.join(', ')}; rent/tuition/utilities/groceries are "essentials"; any restaurant, fast food or food delivery is "food_delivery"; use "other" only if nothing fits),
"keywords" (5-20 lowercase brand names, domains and product words that would appear in an ad selling this, e.g. "doordash", "ubereats.com", "big mac").`;

// purchases: [{ merchantName, amount, description }]
async function discoverAll(purchases) {
  const summary = {};
  for (const p of purchases) {
    const s = (summary[p.merchantName] ??= { merchant: p.merchantName, total: 0, count: 0, examples: [] });
    s.total += p.amount; s.count++;
    if (s.examples.length < 3) s.examples.push(p.description);
  }
  const raw = await askGemini(`You are building a personal spending taxonomy for a college student.
Group these merchants into 4-10 SPECIFIC categories that describe what the money actually goes to
(e.g. "Late-night fast food", "Food delivery apps", "Designer clothes", "Coffee runs"), not generic ones like "food" or "shopping".
${RULES_TEXT}
Return JSON: {"categories": [...], "merchants": {"<merchant name exactly as given>": "<category id>"}}.
Merchants: ${JSON.stringify(Object.values(summary))}`);
  return normalize(raw, Object.keys(summary));
}

async function placeNew(tax, names) {
  const raw = await askGemini(`Place each new merchant into the best existing category id, or "other".
Categories: ${JSON.stringify(tax.categories.map(({ id, label }) => ({ id, label })))}
Return JSON: {"merchants": {"<merchant name exactly as given>": "<category id>"}}.
New merchants: ${JSON.stringify(names)}`);
  return normalize({ categories: tax.categories, merchants: raw?.merchants }, names).merchants;
}

let mem = null;
export async function getTaxonomy(purchases, { force = false, accountId = 'default' } = {}) {
  const names = [...new Set(purchases.map(p => p.merchantName).filter(Boolean))];
  if (!process.env.GEMINI_API_KEY) return fallback(names);
  try {
    mem ??= await loadTaxonomy(accountId).catch(e => (console.warn('taxonomy: db read failed -', e.message), null));
    if (force || !mem?.categories?.length) {
      mem = { source: 'gemini', ...(await discoverAll(purchases)) };
    } else {
      const fresh = names.filter(n => !(n in mem.merchants));
      if (fresh.length) Object.assign(mem.merchants, await placeNew(mem, fresh));
      else return mem;
    }
    // Anything Gemini left unplaced falls back to the lookup table if that category exists.
    for (const n of names) if (!mem.merchants[n] && mem.categories.some(c => c.id === categorize(n))) mem.merchants[n] = categorize(n);
    await saveTaxonomy(accountId, mem).catch(e => console.warn('taxonomy: db write failed -', e.message));
    return mem;
  } catch (e) {
    console.warn('taxonomy: gemini failed, lookup fallback -', e.message);
    return mem?.categories?.length ? mem : fallback(names);
  }
}

if (import.meta.main) {
  const { strict: assert } = await import('node:assert');
  const t = normalize({
    categories: [
      { id: 'Late-Night Fast Food', label: 'Late-night fast food', parent: 'food_delivery', keywords: ['McDonalds', 7] },
      { id: 'late_night_fast_food', label: 'dupe' },
      { id: 'designer', label: 'Designer clothes', parent: 'bogus' },
    ],
    merchants: { "McDonald's": 'late_night_fast_food', Gucci: 'designer', Mystery: 'nope' },
  }, ["McDonald's", 'Gucci', 'Mystery', 'Absent']);
  assert.equal(t.categories.length, 2);
  assert.equal(t.categories[0].id, 'late_night_fast_food');
  assert.deepEqual(t.categories[0].keywords, ['mcdonalds', '7']);
  assert.equal(t.categories[1].parent, 'other');
  assert.deepEqual(t.merchants, { "McDonald's": 'late_night_fast_food', Gucci: 'designer', Mystery: null, Absent: null });
  const f = fallback(['DoorDash', 'Big Y']);
  assert.equal(f.merchants.DoorDash, 'food_delivery');
  assert.equal(f.merchants['Big Y'], 'essentials');
  console.log('discover.js ok');
}
