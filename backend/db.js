// Neon Postgres via node-postgres: this backend is a long-running server, so one pooled connection pool is reused.
// No DATABASE_URL -> every function is a no-op and the app keeps working without persistence.
import pg from 'pg';

const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 }) : null;
pool?.on('error', e => console.warn('db pool error -', e.message)); // idle client dropped (e.g. scale-to-zero); pool reconnects

export const enabled = Boolean(pool);

export async function loadTaxonomy(accountId) {
  if (!pool) return null;
  const { rows } = await pool.query('SELECT data FROM taxonomy WHERE account_id = $1', [accountId]);
  return rows[0]?.data ?? null;
}

export async function saveTaxonomy(accountId, data) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO taxonomy (account_id, data) VALUES ($1, $2)
     ON CONFLICT (account_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [accountId, data]);
}

export async function ping() {
  if (!pool) return false;
  await pool.query('SELECT 1');
  return true;
}
