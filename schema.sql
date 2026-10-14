CREATE TABLE IF NOT EXISTS championships (
  id text PRIMARY KEY,
  name varchar(40) NOT NULL,
  data jsonb NOT NULL DEFAULT '{"players":[],"races":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE championships ADD COLUMN IF NOT EXISTS owner_id text;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id text PRIMARY KEY,
  email text NOT NULL,
  alias varchar(35) NOT NULL,
  avatar_data text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS championship_members (
  championship_id text NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  alias varchar(35) NOT NULL,
  avatar_data text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (championship_id, user_id)
);

CREATE TABLE IF NOT EXISTS championship_invites (
  id bigserial PRIMARY KEY,
  championship_id text NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  email text,
  token_hash text NOT NULL UNIQUE,
  invited_by text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS championship_invites_email_idx ON championship_invites (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS championship_members_user_idx ON championship_members (user_id);
