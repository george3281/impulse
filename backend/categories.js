// Merchant name -> app category (see docs/API.md). First match wins, case-insensitive substring.
export const RULES = [
  ['essentials', ['rent', 'landlord', 'rentals', 'tuition', 'utilities', 'big y', 'stop & shop', 'grocery', "trader joe"]],
  ['food_delivery', ['doordash', 'uber eats', 'mcdonald', 'grubhub', 'burger king', 'taco bell', "wendy's", 'wendys']],
  ['coffee_snacks', ['starbucks', 'dunkin']],
  ['online_shopping', ['amazon', 'target', 'shein', 'sephora', 'ulta', 'zara']],
  ['gaming', ['steam', 'playstation']],
  ['subscriptions', ['netflix', 'spotify']],
  ['rideshare', ['uber', 'lyft']], // after food_delivery so "Uber Eats" isn't rideshare
];

// Broad group labels. Blocking works on a whole group ("Food"), so ads AND craving content (mukbangs) for any of its
// specific categories get blurred. Specific categories (Gemini-discovered) still show in the side panel.
export const LABELS = {
  food_delivery: 'Food',
  coffee_snacks: 'Coffee & snacks',
  online_shopping: 'Shopping',
  gaming: 'Gaming',
  subscriptions: 'Subscriptions',
  rideshare: 'Rides',
};

// Word-start match so "current" isn't rent and "Upstream" isn't Steam.
const RX = RULES.map(([cat, keys]) => [cat, new RegExp('\\b(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'i')]);

export function categorize(name = '') {
  for (const [cat, rx] of RX) if (rx.test(name)) return cat;
  return 'other';
}

export function isLateNight(description = '') {
  const m = description.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return false;
  const h = Number(m[1]);
  return h >= 22 || h < 4;
}

const round = x => Math.round(x * 100) / 100;

// purchases: [{merchantName, amount, date: 'YYYY-MM-DD', description}]
// since: 'YYYY-MM-DD' (or 'YYYY-MM'); default = rolling last 30 days so the seeded month reads as "this month"
// tax: taxonomy from discover.js ({categories:[{id,label,parent,keywords}], merchants:{name:id}}); default = coarse lookup table
export function rank(purchases, since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), source = 'nessie', tax = null) {
  const meta = Object.fromEntries((tax?.categories || []).map(c => [c.id, c]));
  const by = {};
  let essentials = 0;
  for (const p of purchases) {
    if (String(p.date) < since) continue;
    const id = tax ? tax.merchants?.[p.merchantName] : categorize(p.merchantName);
    const m = tax ? meta[id] : LABELS[id] && { id, label: LABELS[id], parent: id, keywords: [] };
    if (id === 'essentials' || m?.parent === 'essentials') { essentials += p.amount; continue; }
    if (!m) continue; // unplaced merchant
    const parent = m.parent === 'other' && LABELS[categorize(p.merchantName)] ? categorize(p.merchantName) : m.parent; // Gemini sometimes files fast food under 'other'
    const c = (by[id] ??= { id, label: m.label, parent, keywords: m.keywords, total: 0, count: 0, lateNightCount: 0 });
    c.total += p.amount;
    c.count++;
    if (isLateNight(p.description)) c.lateNightCount++;
  }
  const categories = Object.values(by).map(c => ({ ...c, total: round(c.total) })).sort((a, b) => b.total - a.total);
  const gs = {};
  for (const c of categories) {
    const g = (gs[c.parent] ??= { id: c.parent, label: LABELS[c.parent] || 'Other', total: 0, count: 0, lateNightCount: 0, members: [] });
    g.total = round(g.total + c.total); g.count += c.count; g.lateNightCount += c.lateNightCount; g.members.push(c.id);
  }
  const groups = Object.values(gs).sort((a, b) => b.total - a.total);
  const top = (groups.find(g => g.id !== 'other') || groups[0])?.id ?? null;
  return { month: new Date().toISOString().slice(0, 7), since, source, taxonomy: tax?.source || 'lookup', top, groups, categories, essentialsTotal: round(essentials) };
}

if (import.meta.main) {
  const { strict: assert } = await import('node:assert');
  assert.equal(categorize('UBER EATS'), 'food_delivery');
  assert.equal(categorize('Uber'), 'rideshare');
  assert.equal(categorize('Pioneer Valley Rentals'), 'essentials');
  assert.equal(categorize("McDonald's"), 'food_delivery');
  assert.equal(categorize('Joe Hardware'), 'other');
  assert.equal(categorize('the current price'), 'other');
  assert.ok(isLateNight('DoorDash order 23:40'));
  assert.ok(isLateNight('01:15 tacos'));
  assert.ok(!isLateNight('lunch 12:30'));
  const r = rank([
    { merchantName: 'DoorDash', amount: 30.5, date: '2026-11-02', description: '23:40' },
    { merchantName: 'DoorDash', amount: 20, date: '2026-11-03', description: '13:00' },
    { merchantName: 'Starbucks', amount: 6, date: '2026-11-03', description: '' },
    { merchantName: 'Starbucks', amount: 99, date: '2026-10-03', description: '' },
    { merchantName: 'Landlord', amount: 1000, date: '2026-11-01', description: '' },
    { merchantName: 'Mystery', amount: 500, date: '2026-11-01', description: '' },
  ], '2026-11');
  assert.equal(r.top, 'food_delivery');
  assert.deepEqual(r.categories[0], { id: 'food_delivery', label: LABELS.food_delivery, parent: 'food_delivery', keywords: [], total: 50.5, count: 2, lateNightCount: 1 });
  const t = rank([
    { merchantName: "McDonald's", amount: 12, date: '2026-11-02', description: '23:10' },
    { merchantName: 'Gucci', amount: 300, date: '2026-11-02', description: '' },
    { merchantName: 'Big Y', amount: 80, date: '2026-11-02', description: '' },
  ], '2026-11', 'nessie', {
    source: 'gemini',
    categories: [
      { id: 'fast_food', label: 'Fast food', parent: 'food_delivery', keywords: ['big mac'] },
      { id: 'designer_clothes', label: 'Designer clothes', parent: 'online_shopping', keywords: ['gucci'] },
      { id: 'groceries', label: 'Groceries', parent: 'essentials', keywords: [] },
    ],
    merchants: { "McDonald's": 'fast_food', Gucci: 'designer_clothes', 'Big Y': 'groceries' },
  });
  assert.equal(t.top, 'online_shopping');
  assert.deepEqual(t.groups.map(g => [g.id, g.label, g.total]), [['online_shopping', 'Shopping', 300], ['food_delivery', 'Food', 12]]);
  assert.deepEqual(t.categories.map(c => c.id), ['designer_clothes', 'fast_food']);
  assert.equal(t.categories[1].lateNightCount, 1);
  assert.equal(t.essentialsTotal, 80);
  assert.equal(r.categories[1].total, 6);
  assert.equal(r.categories.length, 2);
  assert.equal(r.essentialsTotal, 1000);
  console.log('categories.js ok');
}
