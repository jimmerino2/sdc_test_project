-- Accounts, partner food banks and harvest inventory.
-- IF NOT EXISTS so databases created by the earlier schema.sql adopt the migration history cleanly.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS food_banks (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS harvests (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop            TEXT NOT NULL,
  quantity_kg     NUMERIC(8,2) NOT NULL CHECK (quantity_kg > 0),
  available_until DATE NOT NULL,  -- last day the produce is good to hand over
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'donated')),
  food_bank_id    INT REFERENCES food_banks(id),  -- set once donated
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
