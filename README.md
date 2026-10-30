# Pantry Recipe Finder

A web app that helps home cooks reduce food waste by suggesting recipes from ingredients they already have, supporting UN SDG 2: Zero Hunger (responsible consumption). Users can create an account and save favorite recipes.

**Stack:** React (Vite) frontend, Node.js + Express REST API, PostgreSQL database.

## Features

- Enter available ingredients (comma-separated) and get matching recipes from the database, best match first
- Each recipe shows cooking time, calories, protein, its ingredients and the ones you already have
- Sign up / log in (passwords hashed with bcrypt, sessions via JWT)
- Save, view and remove favorite recipes

## Run

Requires Node.js 20.6+ and a running PostgreSQL server.

```bash
# 1. Create an empty database
createdb recipes

# 2. API on http://localhost:3001
cd server
cp .env.example .env     # then edit DATABASE_URL and set a long random JWT_SECRET
npm install
npm run db:init          # creates tables and loads the recipes (wipes existing data!)
npm start

# 3. UI on http://localhost:5173 (second terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## Database

Defined in [server/schema.sql](server/schema.sql), recipe data in [server/seed.sql](server/seed.sql).

| Table                | Columns                                                   |
| -------------------- | --------------------------------------------------------- |
| `users`              | `id`, `email` (unique), `password_hash`                   |
| `recipes`            | `id`, `name`, `cooking_time` (min), `calories`, `protein` |
| `recipe_ingredients` | `recipe_id` -> recipes, `ingredient`                      |
| `favorites`          | `user_id` -> users, `recipe_id` -> recipes (composite PK) |

## API

| Method | Route                       | Auth | Description                                              |
| ------ | --------------------------- | ---- | -------------------------------------------------------- |
| POST   | `/api/register`             |      | `{ email, password }` (8+ chars) -> `{ token }`          |
| POST   | `/api/login`                |      | `{ email, password }` -> `{ token }`                     |
| GET    | `/api/recipes?ingredients=` |      | Recipes using at least one ingredient, with `used`/`missing` |
| GET    | `/api/favorites`            | yes  | The user's favorite recipes                              |
| POST   | `/api/favorites/:recipeId`  | yes  | Save a favorite                                          |
| DELETE | `/api/favorites/:recipeId`  | yes  | Remove a favorite                                        |

Authenticated routes expect `Authorization: Bearer <token>`.
