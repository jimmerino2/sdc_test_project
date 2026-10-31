import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Harvests as camelCase JSON; `extra` is an optional join/where (must keep the h/fb aliases).
export const harvestsQuery = (extra = "") => `
  SELECT h.id, h.crop, h.quantity_kg::float AS "quantityKg",
         to_char(h.available_until, 'YYYY-MM-DD') AS "availableUntil",
         h.status, fb.name AS "foodBank"
  FROM harvests h
  LEFT JOIN food_banks fb ON fb.id = h.food_bank_id
  ${extra}
  ORDER BY h.available_until, h.id`;
