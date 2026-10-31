-- Harvest categories (filterable) and the moment a harvest was donated (drives weekly reports).

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO categories (name) VALUES
  ('Leafy greens'), ('Root vegetables'), ('Fruiting vegetables'),
  ('Fruit'), ('Herbs'), ('Legumes'), ('Other');

ALTER TABLE harvests
  ADD COLUMN category_id INT REFERENCES categories(id),
  ADD COLUMN donated_at  TIMESTAMPTZ;

-- Backfill rows that predate this migration
UPDATE harvests SET category_id = (SELECT id FROM categories WHERE name = 'Other');
UPDATE harvests SET donated_at = created_at WHERE status = 'donated';

ALTER TABLE harvests
  ALTER COLUMN category_id SET NOT NULL,
  ADD CONSTRAINT harvests_donation_consistent CHECK (
    (status = 'donated' AND food_bank_id IS NOT NULL AND donated_at IS NOT NULL)
    OR (status = 'available' AND food_bank_id IS NULL AND donated_at IS NULL)
  );

CREATE INDEX harvests_status_category_idx ON harvests (status, category_id, available_until);
CREATE INDEX harvests_donated_at_idx ON harvests (donated_at) WHERE status = 'donated';
CREATE INDEX harvests_user_idx ON harvests (user_id);
