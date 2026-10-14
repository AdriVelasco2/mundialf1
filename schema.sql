CREATE TABLE IF NOT EXISTS championships (
  id text PRIMARY KEY,
  name varchar(40) NOT NULL,
  data jsonb NOT NULL DEFAULT '{"players":[],"races":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
