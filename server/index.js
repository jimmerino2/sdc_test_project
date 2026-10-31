import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, harvestsQuery } from "./db.js";

const SECRET = process.env.JWT_SECRET;
if (!SECRET || !process.env.DATABASE_URL) {
  console.error("DATABASE_URL and JWT_SECRET must be set (see .env.example)");
  process.exit(1);
}

const app = express();
app.use(cors(), express.json());

// Wrap async handlers so rejected promises become 500s instead of crashing
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "server error" });
  });

const sign = (user) => jwt.sign({ id: user.id }, SECRET, { expiresIn: "7d" });

function auth(req, res, next) {
  try {
    req.userId = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: "login required" });
  }
}

// --- Accounts ---

app.post("/api/register", wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "email and a password of 8+ characters required" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email.toLowerCase(), hash]
    );
    res.status(201).json({ token: sign(rows[0]) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "email already registered" });
    throw err;
  }
}));

app.post("/api/login", wrap(async (req, res) => {
  const { email = "", password = "" } = req.body;
  const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(401).json({ error: "invalid email or password" });
  }
  res.json({ token: sign(rows[0]) });
}));

// --- Public views ---

app.get("/api/food-banks", wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, address FROM food_banks ORDER BY name");
  res.json(rows);
}));

// Produce still ready for distribution (not donated, not past its date), soonest-to-spoil first
app.get("/api/harvests", wrap(async (req, res) => {
  const { rows } = await pool.query(
    harvestsQuery("WHERE h.status = 'available' AND h.available_until >= CURRENT_DATE")
  );
  res.json(rows);
}));

// Community totals for the dashboard
app.get("/api/summary", wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(quantity_kg) FILTER (WHERE status = 'available' AND available_until >= CURRENT_DATE), 0)::float AS "availableKg",
      COALESCE(SUM(quantity_kg) FILTER (WHERE status = 'donated'), 0)::float AS "donatedKg"
    FROM harvests`);
  res.json(rows[0]);
}));

// --- Gardener's own harvests (login required) ---

app.get("/api/my-harvests", auth, wrap(async (req, res) => {
  const { rows } = await pool.query(harvestsQuery("WHERE h.user_id = $1"), [req.userId]);
  res.json(rows);
}));

app.post("/api/harvests", auth, wrap(async (req, res) => {
  const { crop, quantityKg, availableUntil } = req.body;
  const qty = Number(quantityKg);
  if (!String(crop || "").trim() || !(qty > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(availableUntil || "")) {
    return res.status(400).json({ error: "crop, a quantity above 0 and an available-until date are required" });
  }
  try {
    await pool.query(
      "INSERT INTO harvests (user_id, crop, quantity_kg, available_until) VALUES ($1, $2, $3, $4)",
      [req.userId, crop.trim().toLowerCase(), qty, availableUntil]
    );
    res.status(201).end();
  } catch (err) {
    if (err.code === "22008" || err.code === "22007") return res.status(400).json({ error: "invalid date" });
    throw err;
  }
}));

// Mark one of your harvests as handed over to a food bank
app.post("/api/harvests/:id/donate", auth, wrap(async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE harvests SET status = 'donated', food_bank_id = $1
       WHERE id = $2 AND user_id = $3 AND status = 'available'`,
      [req.body.foodBankId, req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: "available harvest not found" });
    res.status(204).end();
  } catch (err) {
    if (err.code === "23503" || err.code === "22P02") return res.status(404).json({ error: "food bank not found" });
    throw err;
  }
}));

app.delete("/api/harvests/:id", auth, wrap(async (req, res) => {
  try {
    await pool.query("DELETE FROM harvests WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  } catch (err) {
    if (err.code !== "22P02") throw err;
  }
  res.status(204).end();
}));

app.listen(3001, () => console.log("API on http://localhost:3001"));
