# Pantry Recipe Finder

A simple web app that helps home cooks reduce food waste by suggesting recipes from ingredients they already have, supporting UN SDG 2: Zero Hunger (responsible consumption).

**Stack:** React (Vite) frontend, Node.js + Express REST API, static JSON recipe dataset.

## Features

- Enter available ingredients in a text field (comma-separated)
- Matching recipes are fetched from the API and ranked by how much of the recipe you already have
- Each recipe shows cooking time, calories, protein, the ingredients you can use and what's missing

## Run

Requires Node.js 18+. Use two terminals:

```bash
# Terminal 1 - API on http://localhost:3001
cd server
npm install
npm start

# Terminal 2 - UI on http://localhost:5173
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## API

`GET /api/recipes?ingredients=egg,rice,onion` returns recipes that use at least one of the ingredients, best match first:

```json
[{ "name": "Fried Rice", "cookingTime": 15, "ingredients": ["rice", "egg", "..."],
   "calories": 480, "protein": 14, "used": ["rice", "egg", "onion"], "missing": ["carrot", "soy sauce"] }]
```

Recipes live in `server/recipes.json`; add your own entries there.
