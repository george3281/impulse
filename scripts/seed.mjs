// Seeds Nessie with demo persona "Jordan" (default) or a persona file. Run from repo root:
//   node --env-file=backend/.env scripts/seed.mjs [--force]
//   node --env-file=backend/.env scripts/seed.mjs --persona scripts/personas/maya.json --out scripts/ids-maya.json
// Point the backend at a persona with NESSIE_IDS=scripts/ids-maya.json npm start.
// Time of day: Nessie purchase_date is date-only, so every purchase description
// starts with "HH:MM " (24h), e.g. "23:40 DoorDash order". Parse with /^(\d{2}):(\d{2})/.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const B = 'https://api.nessieisreal.com';
const KEY = process.env.NESSIE_API_KEY;
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const persona = arg('--persona') ? JSON.parse(readFileSync(resolve(arg('--persona')), 'utf8')) : null;
const IDS = arg('--out') ? resolve(arg('--out')) : new URL('./nessie-ids.json', import.meta.url);
if (!KEY) throw new Error('NESSIE_API_KEY missing (use --env-file=backend/.env)');
if (existsSync(IDS) && !process.argv.includes('--force')) {
  console.error(`${IDS} exists; rerun with --force to create a fresh set`);
  process.exit(1);
}

async function post(path, body) {
  const r = await fetch(`${B}${path}?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.objectCreated?._id) throw new Error(`POST ${path} ${r.status}: ${JSON.stringify(j)}`);
  return j.objectCreated._id;
}

const amherst = (street_number, street_name, zip = '01002') => ({ street_number, street_name, city: 'Amherst', state: 'MA', zip });
const geo = { lat: 42.3732, lng: -72.5199 };

const who = persona?.customer ?? { first_name: 'Jordan', last_name: 'Rivera', street_number: '1040', street_name: 'N Pleasant St' };
const customerId = await post('/customers', {
  first_name: who.first_name, last_name: who.last_name, address: amherst(who.street_number, who.street_name),
});
const accountId = await post(`/customers/${customerId}/accounts`, {
  type: 'Checking', nickname: persona?.account.nickname ?? 'Jordan Checking', rewards: 0, balance: persona?.account.balance ?? 4000,
});

const MERCHANTS = persona?.merchants ?? {
  'DoorDash': 'food delivery',
  'Uber Eats': 'food delivery',
  "McDonald's": 'fast food',
  'Amazon': 'online shopping',
  'Starbucks': 'coffee',
  'Steam': 'gaming',
  'Uber': 'rideshare',
  'Netflix': 'subscription',
  'Puffton Village Rentals': 'rent',
  'Big Y': 'groceries',
};
const merchants = {};
for (const [name, category] of Object.entries(MERCHANTS)) {
  merchants[name] = await post('/merchants', { name, category, address: amherst('1', 'Main St'), geocode: geo });
}

// [merchant, date (Oct 15 - Nov 14 2026), "HH:MM", amount, note]
const P = persona?.purchases ?? [
  ['DoorDash', '2026-10-15', '23:40', 24.87, 'order'],
  ['DoorDash', '2026-10-18', '00:15', 19.62, 'order'],
  ['DoorDash', '2026-10-21', '22:55', 27.31, 'order'],
  ['DoorDash', '2026-10-24', '23:10', 21.45, 'order'],
  ['DoorDash', '2026-10-27', '18:30', 18.90, 'order'],
  ['DoorDash', '2026-10-31', '01:05', 31.20, 'order'],
  ['DoorDash', '2026-11-03', '23:25', 22.74, 'order'],
  ['DoorDash', '2026-11-06', '22:40', 25.18, 'order'],
  ['DoorDash', '2026-11-09', '12:20', 16.35, 'order'],
  ['DoorDash', '2026-11-12', '23:55', 28.66, 'order'],
  ['Uber Eats', '2026-10-17', '22:30', 26.40, 'order'],
  ['Uber Eats', '2026-10-23', '23:45', 23.15, 'order'],
  ['Uber Eats', '2026-10-30', '19:10', 21.80, 'order'],
  ['Uber Eats', '2026-11-05', '00:40', 27.95, 'order'],
  ['Uber Eats', '2026-11-11', '22:20', 24.60, 'order'],
  ["McDonald's", '2026-10-16', '23:50', 9.47, 'drive-thru'],
  ["McDonald's", '2026-10-20', '01:30', 11.28, 'drive-thru'],
  ["McDonald's", '2026-10-25', '13:15', 8.19, 'lunch'],
  ["McDonald's", '2026-10-29', '22:45', 10.56, 'drive-thru'],
  ["McDonald's", '2026-11-02', '23:20', 12.04, 'drive-thru'],
  ["McDonald's", '2026-11-07', '00:55', 9.83, 'drive-thru'],
  ["McDonald's", '2026-11-10', '22:15', 7.92, 'drive-thru'],
  ["McDonald's", '2026-11-13', '23:35', 10.71, 'drive-thru'],
  ['Starbucks', '2026-10-19', '08:40', 6.45, 'coffee'],
  ['Starbucks', '2026-10-22', '09:05', 5.95, 'coffee'],
  ['Starbucks', '2026-10-28', '08:30', 7.25, 'coffee'],
  ['Starbucks', '2026-11-04', '10:15', 6.10, 'coffee'],
  ['Starbucks', '2026-11-08', '14:20', 5.75, 'coffee'],
  ['Starbucks', '2026-11-12', '08:50', 6.85, 'coffee'],
  ['Amazon', '2026-10-21', '15:30', 34.99, 'order'],
  ['Amazon', '2026-11-03', '20:10', 22.47, 'order'],
  ['Amazon', '2026-11-10', '16:45', 18.99, 'order'],
  ['Steam', '2026-10-26', '21:00', 19.99, 'game purchase'],
  ['Steam', '2026-11-08', '20:30', 14.99, 'game purchase'],
  ['Uber', '2026-10-18', '02:10', 14.30, 'ride'],
  ['Uber', '2026-10-31', '23:50', 18.75, 'ride'],
  ['Uber', '2026-11-07', '01:40', 12.60, 'ride'],
  ['Netflix', '2026-11-01', '06:00', 15.49, 'monthly subscription'],
  ['Puffton Village Rentals', '2026-11-01', '09:00', 950.00, 'November rent'],
  ['Big Y', '2026-10-18', '11:30', 68.42, 'groceries'],
  ['Big Y', '2026-10-26', '16:15', 54.87, 'groceries'],
  ['Big Y', '2026-11-02', '12:40', 72.15, 'groceries'],
  ['Big Y', '2026-11-09', '17:05', 61.33, 'groceries'],
];

for (const [name, purchase_date, time, amount, note] of P) {
  await post(`/accounts/${accountId}/purchases`, {
    merchant_id: merchants[name], medium: 'balance', purchase_date, amount,
    status: 'completed', description: `${time} ${name} ${note}`,
  });
}

writeFileSync(IDS, JSON.stringify({ customerId, accountId, merchants }, null, 2) + '\n');
console.log(`Created customer ${customerId}, account ${accountId}, ${Object.keys(merchants).length} merchants, ${P.length} purchases`);
