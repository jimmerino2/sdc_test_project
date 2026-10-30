INSERT INTO recipes (name, cooking_time, calories, protein) VALUES
  ('Tomato Pasta', 20, 520, 15),
  ('Vegetable Omelette', 10, 350, 22),
  ('Fried Rice', 15, 480, 14),
  ('Banana Pancakes', 20, 410, 13),
  ('Garlic Bread', 10, 300, 7),
  ('Chicken Stir Fry', 25, 560, 38),
  ('Cheese Toastie', 8, 420, 16),
  ('Potato Soup', 35, 330, 8);

INSERT INTO recipe_ingredients (recipe_id, ingredient)
SELECT r.id, i.ingredient FROM recipes r JOIN (VALUES
  ('Tomato Pasta', 'pasta'), ('Tomato Pasta', 'tomato'), ('Tomato Pasta', 'garlic'), ('Tomato Pasta', 'olive oil'),
  ('Vegetable Omelette', 'egg'), ('Vegetable Omelette', 'onion'), ('Vegetable Omelette', 'bell pepper'), ('Vegetable Omelette', 'cheese'),
  ('Fried Rice', 'rice'), ('Fried Rice', 'egg'), ('Fried Rice', 'onion'), ('Fried Rice', 'carrot'), ('Fried Rice', 'soy sauce'),
  ('Banana Pancakes', 'banana'), ('Banana Pancakes', 'egg'), ('Banana Pancakes', 'flour'), ('Banana Pancakes', 'milk'),
  ('Garlic Bread', 'bread'), ('Garlic Bread', 'garlic'), ('Garlic Bread', 'butter'),
  ('Chicken Stir Fry', 'chicken'), ('Chicken Stir Fry', 'bell pepper'), ('Chicken Stir Fry', 'onion'), ('Chicken Stir Fry', 'soy sauce'), ('Chicken Stir Fry', 'rice'),
  ('Cheese Toastie', 'bread'), ('Cheese Toastie', 'cheese'), ('Cheese Toastie', 'butter'),
  ('Potato Soup', 'potato'), ('Potato Soup', 'onion'), ('Potato Soup', 'milk'), ('Potato Soup', 'butter')
) AS i(name, ingredient) ON i.name = r.name;
