-- Impulse schema. Apply with `npm run migrate` (uses the direct DATABASE_URL_UNPOOLED). Idempotent.
CREATE TABLE IF NOT EXISTS taxonomy (
  account_id text PRIMARY KEY,          -- Nessie account the categories were discovered from
  data       jsonb NOT NULL,            -- { source, categories: [...], merchants: { name: id } }
  updated_at timestamptz NOT NULL DEFAULT now()
);
