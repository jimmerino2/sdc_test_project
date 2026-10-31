# Garden Surplus Share

A web-based inventory tool for community gardeners to track surplus produce and coordinate donations to local food banks, supporting UN SDG 2: Zero Hunger. Everyone can see which harvests are ready for distribution; gardeners with an account list their surplus and record when it is handed to a food bank; partners get a weekly donation summary.

**Stack:** React (Vite) frontend, Node.js + Express with a GraphQL API, PostgreSQL database managed by SQL migrations (applied by a Bash script).

## Features

- Public view of harvests filtered by **category** and **donation status** (available / donated); expired produce is hidden from the available list
- Community totals: kg ready for pickup and kg donated so far
- Sign up / log in (passwords hashed with bcrypt, sessions via JWT)
- Gardeners list surplus with a category, remove listings, and mark a harvest as donated to a partner food bank
- **Weekly donation report** per partner food bank (Monday-Sunday): total kg, kg by category and each delivery, with previous/next week navigation

## Run

Requires Node.js 20.6+, a running PostgreSQL server and the `psql` client on your PATH. On Windows run the migration step from Git Bash (or WSL).

```bash
# 1. Create an empty database
createdb garden

# 2. API on http://localhost:3001/graphql
cd server
cp .env.example .env     # then edit DATABASE_URL and set a long random JWT_SECRET
npm install
npm run migrate          # applies pending migrations (safe to re-run)
npm start

# 3. UI on http://localhost:5173 (second terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## Database migrations

SQL files in [server/migrations/](server/migrations) are applied in filename order by [server/scripts/migrate.sh](server/scripts/migrate.sh). Each file runs in its own transaction together with its bookkeeping row in `schema_migrations`, so a failing migration leaves the database untouched and the script exits non-zero.

```bash
npm run migrate          # apply pending migrations
npm run migrate:status   # list applied / pending
```

The script reads `DATABASE_URL` from the environment or `server/.env`, so it also works in CI or on a fresh machine (`DATABASE_URL=postgres://... bash scripts/migrate.sh`). To change the schema, add a new numbered file (e.g. `004_add_pickup_notes.sql`); never edit one that has been applied.

| Table                | Columns                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `users`              | `id`, `email` (unique), `password_hash`                                                                  |
| `food_banks`         | `id`, `name` (unique), `address`                                                                         |
| `categories`         | `id`, `name` (unique)                                                                                    |
| `harvests`           | `id`, `user_id`, `category_id`, `crop`, `quantity_kg`, `available_until`, `status`, `food_bank_id`, `donated_at`, `created_at` |
| `schema_migrations`  | `version`, `applied_at` (maintained by the script)                                                       |

A `CHECK` constraint keeps `status`, `food_bank_id` and `donated_at` consistent (a donated harvest always has both). Databases created by the earlier `schema.sql` are adopted by the same migrations; existing harvests land in the "Other" category.

## GraphQL API

Single endpoint `POST /graphql`; authenticated operations expect `Authorization: Bearer <token>`. Schema: [server/schema.js](server/schema.js).

```graphql
query {
  summary { availableKg donatedKg }
  harvests(categoryId: 3, status: AVAILABLE) { id crop quantityKg availableUntil category { name } }
  weeklyDonationReport(weekStart: "2026-10-26") {
    weekStart weekEnd totalKg harvestCount
    foodBanks { foodBank { name } totalKg byCategory { category kg } donations { crop quantityKg donatedAt } }
  }
}
```

| Operation                                    | Auth | Description                                                         |
| -------------------------------------------- | ---- | ------------------------------------------------------------------- |
| `categories`, `foodBanks`                    |      | Reference lists                                                     |
| `harvests(categoryId, status = AVAILABLE)`   |      | Public listing; `DONATED` shows the latest donations first          |
| `summary`                                    |      | `{ availableKg, donatedKg }`                                        |
| `weeklyDonationReport(weekStart, foodBankId)`|      | Donations in the Monday-Sunday week containing `weekStart` (default: this week), grouped by food bank |
| `myHarvests(categoryId, status)`             | yes  | The user's harvests, including donated ones                         |
| `register` / `login(email, password)`       |      | Returns `{ token }` (password 8+ chars)                             |
| `addHarvest(input)`                          | yes  | `{ crop, categoryId, quantityKg, availableUntil: "YYYY-MM-DD" }`    |
| `donateHarvest(id, foodBankId)`              | yes  | Marks your available harvest as donated now                         |
| `removeHarvest(id)`                          | yes  | Removes your harvest                                                |

Errors carry `extensions.code` (`UNAUTHENTICATED`, `BAD_USER_INPUT`, `NOT_FOUND`); unexpected failures are logged server-side and returned as a generic `server error`. The client loads the page with one query (totals, public list and the user's list via `@include`).
