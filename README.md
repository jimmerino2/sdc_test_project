# Garden Surplus Share

A web-based inventory tool for community gardeners to track surplus produce and coordinate donations to local food banks, supporting UN SDG 2: Zero Hunger. Everyone can see which harvests are ready for distribution; gardeners with an account list their surplus and record when it is handed to a food bank.

**Stack:** React (Vite) frontend, Node.js + Express REST API, PostgreSQL database.

## Features

- Public view of available harvests (crop, kg, last good day), soonest-to-spoil first; expired produce is hidden
- Community totals: kg ready for pickup and kg donated so far
- Sign up / log in (passwords hashed with bcrypt, sessions via JWT)
- Gardeners list surplus, remove listings, and mark a harvest as donated to a partner food bank

## Run

Requires Node.js 20.6+ and a running PostgreSQL server.

```bash
# 1. Create an empty database
createdb garden

# 2. API on http://localhost:3001
cd server
cp .env.example .env     # then edit DATABASE_URL and set a long random JWT_SECRET
npm install
npm run db:init          # creates tables and loads the food banks (wipes existing data!)
npm start

# 3. UI on http://localhost:5173 (second terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## Database

Defined in [server/schema.sql](server/schema.sql), food banks in [server/seed.sql](server/seed.sql).

| Table        | Columns                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `users`      | `id`, `email` (unique), `password_hash`                                                                    |
| `food_banks` | `id`, `name` (unique), `address`                                                                           |
| `harvests`   | `id`, `user_id` -> users, `crop`, `quantity_kg`, `available_until`, `status`, `food_bank_id`, `created_at` |

`status` is `available` or `donated`; `food_bank_id` is set when donated.

## API

| Method | Route                      | Auth | Description                                           |
| ------ | -------------------------- | ---- | ----------------------------------------------------- |
| POST   | `/api/register`            |      | `{ email, password }` (8+ chars) -> `{ token }`       |
| POST   | `/api/login`               |      | `{ email, password }` -> `{ token }`                  |
| GET    | `/api/harvests`            |      | Available, unexpired harvests, soonest-to-spoil first |
| GET    | `/api/summary`             |      | `{ availableKg, donatedKg }`                          |
| GET    | `/api/food-banks`          |      | Partner food banks                                    |
| GET    | `/api/my-harvests`         | yes  | The user's harvests, including donated ones           |
| POST   | `/api/harvests`            | yes  | `{ crop, quantityKg, availableUntil: "YYYY-MM-DD" }`  |
| POST   | `/api/harvests/:id/donate` | yes  | `{ foodBankId }` marks your harvest donated           |
| DELETE | `/api/harvests/:id`        | yes  | Remove your harvest                                   |

Authenticated routes expect `Authorization: Bearer <token>`.
