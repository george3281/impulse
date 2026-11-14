// Applies schema.sql over the direct (unpooled) connection, as Neon recommends for migrations.
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL_UNPOOLED not set (run `neon env pull` in the repo root)'); process.exit(1); }
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
const { rows } = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`);
console.log('migrated; tables:', rows.map(r => r.table_name).join(', '));
await client.end();
