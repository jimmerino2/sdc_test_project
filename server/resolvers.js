import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { pool, harvestsSql, toHarvest } from "./db.js";

const SECRET = process.env.JWT_SECRET;

const fail = (message, code) => new GraphQLError(message, { extensions: { code } });
const sign = (id) => ({ token: jwt.sign({ id }, SECRET, { expiresIn: "7d" }) });

function requireUser(ctx) {
  if (ctx.userId == null) throw fail("login required", "UNAUTHENTICATED");
  return ctx.userId;
}

// Postgres rejects malformed ids/dates with these codes; report them as bad input, not 500s
const BAD_INPUT = new Set(["22P02", "22007", "22008", "22003"]);

// Expected errors pass through; anything else is logged and hidden behind a generic message
const guard = (fn) => async (args, ctx) => {
  try {
    return await fn(args, ctx);
  } catch (err) {
    if (err instanceof GraphQLError) throw err;
    if (BAD_INPUT.has(err.code)) throw fail("invalid input", "BAD_USER_INPUT");
    console.error(err);
    throw fail("server error", "INTERNAL");
  }
};

// WHERE clause + params shared by harvests / myHarvests
function harvestFilter({ categoryId, status }, userId) {
  const where = [];
  const params = [];
  const add = (sql, value) => where.push(sql.replace("?", `$${params.push(value)}`));
  if (userId != null) add("h.user_id = ?", userId);
  if (categoryId != null) add("h.category_id = ?", categoryId);
  if (status) add("h.status = ?", status.toLowerCase());
  if (status === "AVAILABLE" && userId == null) where.push("h.available_until >= CURRENT_DATE");
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

async function listHarvests(args, userId, viewerId) {
  const { sql, params } = harvestFilter(args, userId);
  const order = args.status === "DONATED" ? "h.donated_at DESC, h.id" : "h.available_until, h.id";
  const { rows } = await pool.query(`${harvestsSql(sql)} ORDER BY ${order}`, params);
  return rows.map((r) => toHarvest(r, viewerId));
}

async function getHarvest(id, viewerId) {
  const { rows } = await pool.query(harvestsSql("WHERE h.id = $1"), [id]);
  return toHarvest(rows[0], viewerId);
}

async function weeklyDonationReport({ weekStart, foodBankId }) {
  // Normalise to Monday; the donations window is [Monday, next Monday)
  const { rows: [week] } = await pool.query(`
    SELECT to_char(s, 'YYYY-MM-DD') AS "weekStart", to_char(s + 6, 'YYYY-MM-DD') AS "weekEnd"
    FROM (SELECT date_trunc('week', COALESCE($1::date, CURRENT_DATE))::date AS s) w`, [weekStart ?? null]);

  const { rows } = await pool.query(`
    SELECT fb.id AS "foodBankId", fb.name AS "foodBankName", fb.address AS "foodBankAddress",
           h.crop, c.name AS category, h.quantity_kg::float AS "quantityKg",
           to_char(h.donated_at, 'YYYY-MM-DD') AS "donatedAt"
    FROM harvests h
    JOIN food_banks fb ON fb.id = h.food_bank_id
    JOIN categories c ON c.id = h.category_id
    WHERE h.status = 'donated'
      AND h.donated_at >= $1::date AND h.donated_at < $1::date + 7
      AND ($2::int IS NULL OR fb.id = $2::int)
    ORDER BY fb.name, h.donated_at, h.id`, [week.weekStart, foodBankId ?? null]);

  const banks = new Map();
  for (const r of rows) {
    if (!banks.has(r.foodBankId)) {
      banks.set(r.foodBankId, {
        foodBank: { id: r.foodBankId, name: r.foodBankName, address: r.foodBankAddress },
        totalKg: 0,
        harvestCount: 0,
        byCategory: new Map(),
        donations: [],
      });
    }
    const b = banks.get(r.foodBankId);
    b.totalKg += r.quantityKg;
    b.harvestCount += 1;
    b.byCategory.set(r.category, (b.byCategory.get(r.category) ?? 0) + r.quantityKg);
    b.donations.push({ crop: r.crop, category: r.category, quantityKg: r.quantityKg, donatedAt: r.donatedAt });
  }

  const round = (n) => Math.round(n * 100) / 100;
  const foodBanks = [...banks.values()].map((b) => ({
    ...b,
    totalKg: round(b.totalKg),
    byCategory: [...b.byCategory].map(([category, kg]) => ({ category, kg: round(kg) })),
  }));
  return {
    ...week,
    totalKg: round(foodBanks.reduce((sum, b) => sum + b.totalKg, 0)),
    harvestCount: foodBanks.reduce((sum, b) => sum + b.harvestCount, 0),
    foodBanks,
  };
}

const resolvers = {
  // --- Public ---
  categories: async () => (await pool.query("SELECT id, name FROM categories ORDER BY id")).rows,
  foodBanks: async () => (await pool.query("SELECT id, name, address FROM food_banks ORDER BY name")).rows,
  harvests: (args, ctx) => listHarvests(args, null, ctx.userId),
  weeklyDonationReport,
  summary: async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(quantity_kg) FILTER (WHERE status = 'available' AND available_until >= CURRENT_DATE), 0)::float AS "availableKg",
        COALESCE(SUM(quantity_kg) FILTER (WHERE status = 'donated'), 0)::float AS "donatedKg"
      FROM harvests`);
    return rows[0];
  },

  // --- Accounts ---
  register: async ({ email, password }) => {
    if (!email.includes("@") || password.length < 8) {
      throw fail("email and a password of 8+ characters required", "BAD_USER_INPUT");
    }
    try {
      const { rows } = await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        [email.toLowerCase(), await bcrypt.hash(password, 10)]
      );
      return sign(rows[0].id);
    } catch (err) {
      if (err.code === "23505") throw fail("email already registered", "BAD_USER_INPUT");
      throw err;
    }
  },
  login: async ({ email, password }) => {
    const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [email.toLowerCase()]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      throw fail("invalid email or password", "UNAUTHENTICATED");
    }
    return sign(rows[0].id);
  },

  // --- Gardener's inventory (login required) ---
  myHarvests: (args, ctx) => listHarvests(args, requireUser(ctx), ctx.userId),

  addHarvest: async ({ input }, ctx) => {
    const userId = requireUser(ctx);
    const { crop, categoryId, quantityKg, availableUntil } = input;
    if (!crop.trim() || !(quantityKg > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(availableUntil)) {
      throw fail("crop, a quantity above 0 and an available-until date are required", "BAD_USER_INPUT");
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO harvests (user_id, category_id, crop, quantity_kg, available_until)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, categoryId, crop.trim().toLowerCase(), quantityKg, availableUntil]
      );
      return getHarvest(rows[0].id, userId);
    } catch (err) {
      if (err.code === "23503") throw fail("category not found", "BAD_USER_INPUT");
      throw err;
    }
  },

  // Hand one of your available harvests to a food bank
  donateHarvest: async ({ id, foodBankId }, ctx) => {
    const userId = requireUser(ctx);
    try {
      const { rowCount } = await pool.query(
        `UPDATE harvests SET status = 'donated', food_bank_id = $1, donated_at = now()
         WHERE id = $2 AND user_id = $3 AND status = 'available'`,
        [foodBankId, id, userId]
      );
      if (!rowCount) throw fail("available harvest not found", "NOT_FOUND");
    } catch (err) {
      if (err.code === "23503") throw fail("food bank not found", "NOT_FOUND");
      throw err;
    }
    return getHarvest(id, userId);
  },

  removeHarvest: async ({ id }, ctx) => {
    const { rowCount } = await pool.query("DELETE FROM harvests WHERE id = $1 AND user_id = $2", [id, requireUser(ctx)]);
    return rowCount > 0;
  },
};

export default Object.fromEntries(Object.entries(resolvers).map(([name, fn]) => [name, guard(fn)]));
