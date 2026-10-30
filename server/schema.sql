DROP TABLE IF EXISTS favorites, recipe_ingredients, recipes, users;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE recipes (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  cooking_time INT NOT NULL,  -- minutes
  calories     INT NOT NULL,
  protein      INT NOT NULL   -- grams
);

CREATE TABLE recipe_ingredients (
  recipe_id  INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  PRIMARY KEY (recipe_id, ingredient)
);

CREATE TABLE favorites (
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, recipe_id)
);
