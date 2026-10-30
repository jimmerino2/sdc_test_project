import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, recipesQuery } from "./db.js";

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

// --- Recipes ---

// GET /api/recipes?ingredients=egg,rice -> recipes using at least one, best match first
app.get("/api/recipes", wrap(async (req, res) => {
  const have = String(req.query.ingredients || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { rows } = await pool.query(recipesQuery());
  const matches = rows
    .map((r) => ({
      ...r,
      used: r.ingredients.filter((i) => have.includes(i)),
      missing: r.ingredients.filter((i) => !have.includes(i)),
    }))
    .filter((r) => r.used.length > 0)
    .sort((a, b) => b.used.length / b.ingredients.length - a.used.length / a.ingredients.length);

  res.json(matches);
}));

// --- Favorites (login required) ---

app.get("/api/favorites", auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    recipesQuery("JOIN favorites f ON f.recipe_id = r.id AND f.user_id = $1"),
    [req.userId]
  );
  res.json(rows);
}));

app.post("/api/favorites/:recipeId", auth, wrap(async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.userId, req.params.recipeId]
    );
    res.status(204).end();
  } catch (err) {
    if (err.code === "23503" || err.code === "22P02") return res.status(404).json({ error: "recipe not found" });
    throw err;
  }
}));

app.delete("/api/favorites/:recipeId", auth, wrap(async (req, res) => {
  await pool.query("DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2", [req.userId, req.params.recipeId]);
  res.status(204).end();
}));

app.listen(3001, () => console.log("API on http://localhost:3001"));
