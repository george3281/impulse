// Impulse service worker: fetches categories, proxies /classify, keeps counters.
const API = 'http://localhost:8787';

const MOCK = {
  month: new Date().toISOString().slice(0, 7),
  source: 'mock',
  top: 'food_delivery',
  taxonomy: 'lookup',
  categories: [
    { id: 'food_delivery', label: 'Food delivery & fast food', parent: 'food_delivery', total: 428, count: 23, lateNightCount: 19,
      keywords: ['doordash', 'uber eats', 'ubereats', 'grubhub', 'postmates', 'mcdonald', 'burger', 'pizza', 'taco bell', 'wendy', 'chipotle', 'kfc', 'fried chicken', 'mukbang', 'food delivery'] },
    { id: 'online_shopping', label: 'Online shopping', parent: 'online_shopping', total: 85, count: 3, lateNightCount: 1, keywords: ['amazon', 'shein', 'temu', 'etsy', 'walmart', 'add to cart'] },
    { id: 'coffee_snacks', label: 'Coffee & snacks', parent: 'coffee_snacks', total: 48, count: 12, lateNightCount: 0, keywords: ['starbucks', 'dunkin', 'latte', 'boba'] },
    { id: 'gaming', label: 'Gaming', parent: 'gaming', total: 30, count: 2, lateNightCount: 2, keywords: ['steam', 'playstation', 'xbox', 'nintendo'] },
    { id: 'rideshare', label: 'Rideshare', parent: 'rideshare', total: 22, count: 2, lateNightCount: 1, keywords: ['lyft', 'book a ride'] },
    { id: 'subscriptions', label: 'Subscriptions', parent: 'subscriptions', total: 16, count: 2, lateNightCount: 0, keywords: ['netflix', 'spotify', 'hulu', 'free trial'] },
  ],
  essentialsTotal: 1250,
};

// ponytail: tiny keyword fallback so the demo survives without the backend; backend/Gemini is the real classifier.
// Uses each category's keywords (Gemini-discovered when available), so it follows the same taxonomy.
const SELLING = /order|buy|shop|deal|% ?off|\$\d|promo|coupon|delivery fee|free trial|subscribe|download|install|get it|add to cart|book a ride|sale/i;
const NOT_SELLING = /recipe|how to make|review|homemade|ingredients/i;
// Craving content (mirrors backend TRIGGERS): blurred for a blocked group even though it's not an ad.
const TRIGGERS = {
  food_delivery: /mukbang|eating show|asmr eat|food challenge|eating (every|\d+|the (biggest|entire))|tr(y|ied|ying) every|taste test|cheat day|drive[- ]?thru|fast food haul|what i eat in a day|food tour|10,?000 calorie/i,
  online_shopping: /\bhaul\b|unboxing|amazon finds|tiktok made me buy|must[- ]haves|try[- ]on/i,
  gaming: /\bskins?\b|item shop|v-?bucks|robux|battle ?pass|\bloot\b|gacha|\bpulls?\b|pack opening|\btokens?\b|new season|\bcrates?\b|unlock|rare (item|skin)|limited[- ]time|pre-?order|new release|grinding for/i,
};
const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function mockClassify(items) {
  const { categories } = await chrome.storage.local.get('categories');
  const all = (categories || MOCK).categories;
  const cats = all.filter((c) => c.keywords?.length)
    .map((c) => [c.id, new RegExp(`\\b(${c.keywords.map(esc).join('|')})`, 'i')]);
  return items.map(({ id, text = '', alt = '', href = '', adMarker }) => {
    const s = `${text} ${alt} ${href}`;
    const trig = Object.keys(TRIGGERS).find((g) => TRIGGERS[g].test(`${text} ${alt}`));
    const category = cats.find(([, rx]) => rx.test(s))?.[0] || all.find((c) => c.parent === trig)?.id || 'other';
    const group = all.find((c) => c.id === category)?.parent || 'other';
    const selling = category !== 'other' && (adMarker || SELLING.test(s)) && !(NOT_SELLING.test(s) && !adMarker);
    return { id, category, group, selling, trigger: trig === group };
  });
}

async function refreshCategories() {
  let data;
  try {
    const r = await fetch(`${API}/categories`);
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch {
    data = MOCK;
  }
  data = { ...data, fetchedAt: Date.now() }; // pages ask for a refresh when this is stale
  await chrome.storage.local.set({ categories: data });
  return data;
}

async function classify(items) {
  try {
    const r = await fetch(`${API}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch {
    return { source: 'keywords-local', results: await mockClassify(items) };
  }
}

// Counters reset when the month changes. Bumps are chained so concurrent messages don't lose increments.
let chain = Promise.resolve();
const bump = (key) => (chain = chain.then(() => bumpNow(key)).catch(() => {}));
async function bumpNow(key) {
  const month = new Date().toISOString().slice(0, 7);
  const s = await chrome.storage.local.get(['statsMonth', 'blockedThisMonth', 'shownAnyway', 'days']);
  if (s.statsMonth !== month) Object.assign(s, { statsMonth: month, blockedThisMonth: 0, shownAnyway: 0, days: {} });
  s[key] = (s[key] || 0) + 1;
  // Per local day: blocks and reveals. "Est. saved" counts at most one avoided order per day that had a block and no
  // "Show anyway" (one impulse moment per night), so a busy feed can't inflate it.
  const day = new Date().toLocaleDateString('en-CA');
  const d = ((s.days ??= {})[day] ??= { b: 0, s: 0 });
  if (key === 'shownAnyway') d.s++; else d.b++;
  await chrome.storage.local.set(s);
}

// Toolbar icon opens the side panel (docked, stays open while browsing) instead of a popup.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.local.get('enabled');
  if (enabled === undefined) await chrome.storage.local.set({ enabled: true });
  refreshCategories();
});
chrome.runtime.onStartup.addListener(refreshCategories);
chrome.alarms.get('refresh', (a) => a || chrome.alarms.create('refresh', { periodInMinutes: 5 }));
chrome.alarms.onAlarm.addListener((a) => a.name === 'refresh' && refreshCategories());

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'classify') classify(msg.items).then(reply);
  else if (msg.type === 'blocked') bump('blockedThisMonth').then(() => reply({ ok: true }));
  else if (msg.type === 'shown') bump('shownAnyway').then(() => reply({ ok: true }));
  else if (msg.type === 'refresh') refreshCategories().then(reply);
  else return false;
  return true; // async reply
});
