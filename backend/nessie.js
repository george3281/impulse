// Tiny Nessie client. Purchase descriptions start with "HH:MM " (time of day; see scripts/seed.mjs).
const B = 'https://api.nessieisreal.com';

async function get(path) {
  const r = await fetch(`${B}${path}?key=${process.env.NESSIE_API_KEY}`);
  if (!r.ok) throw new Error(`Nessie GET ${path} ${r.status}`);
  return r.json();
}

export const getPurchases = (accountId) => get(`/accounts/${accountId}/purchases`);

const merchantCache = new Map();
export function getMerchant(id) {
  if (!merchantCache.has(id)) merchantCache.set(id, get(`/merchants/${id}`).catch((e) => { merchantCache.delete(id); throw e; }));
  return merchantCache.get(id);
}
