import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Recipes (with their ingredient list) as camelCase JSON; `extra` is an optional join/where.
export const recipesQuery = (extra = "") => `
  SELECT r.id, r.name, r.cooking_time AS "cookingTime", r.calories, r.protein,
         array_agg(ri.ingredient ORDER BY ri.ingredient) AS ingredients
  FROM recipes r
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  ${extra}
  GROUP BY r.id
  ORDER BY r.name`;
