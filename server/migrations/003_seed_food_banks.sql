INSERT INTO food_banks (name, address) VALUES
  ('Riverside Community Pantry', '12 River Road'),
  ('Northside Food Bank', '48 Elm Street'),
  ('St. Mary''s Meal Share', '3 Church Lane'),
  ('Greenfield Neighbours Fridge', '90 Market Square')
ON CONFLICT (name) DO NOTHING;
