import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Harvest rows joined with their category and (once donated) food bank, in one round trip.
// `extra` is a WHERE clause using the h/c/fb aliases; callers append their own ORDER BY.
export const harvestsSql = (extra = "") => `
  SELECT h.id, h.user_id AS "userId", h.crop, h.quantity_kg::float AS "quantityKg",
         to_char(h.available_until, 'YYYY-MM-DD') AS "availableUntil",
         upper(h.status) AS status,
         to_char(h.donated_at, 'YYYY-MM-DD') AS "donatedAt",
         c.id AS "categoryId", c.name AS "categoryName",
         fb.id AS "foodBankId", fb.name AS "foodBankName", fb.address AS "foodBankAddress"
  FROM harvests h
  JOIN categories c ON c.id = h.category_id
  LEFT JOIN food_banks fb ON fb.id = h.food_bank_id
  ${extra}`;

// Turns a flat harvestsSql row into the nested shape the GraphQL schema exposes
export const toHarvest = (r, viewerId) => ({
  id: r.id,
  crop: r.crop,
  quantityKg: r.quantityKg,
  availableUntil: r.availableUntil,
  status: r.status,
  donatedAt: r.donatedAt,
  mine: viewerId != null && r.userId === viewerId,
  category: { id: r.categoryId, name: r.categoryName },
  foodBank: r.foodBankId && { id: r.foodBankId, name: r.foodBankName, address: r.foodBankAddress },
});
