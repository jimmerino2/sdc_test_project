import express from "express";
import cors from "cors";
import { readFileSync } from "fs";

const recipes = JSON.parse(readFileSync("recipes.json"));

const app = express();
app.use(cors());

// GET /api/recipes?ingredients=egg,rice -> recipes using at least one, best match first
app.get("/api/recipes", (req, res) => {
  const have = String(req.query.ingredients || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const matches = recipes
    .map((r) => {
      const used = r.ingredients.filter((i) => have.includes(i));
      return { ...r, used, missing: r.ingredients.filter((i) => !have.includes(i)) };
    })
    .filter((r) => r.used.length > 0)
    .sort((a, b) => b.used.length / b.ingredients.length - a.used.length / a.ingredients.length);

  res.json(matches);
});

app.listen(3001, () => console.log("API on http://localhost:3001"));
