# Community Pantry Inventory Tracker

A minimal web app for food banks and community pantries to track non-perishable stock. It highlights low-stock items (under 10 units) so pantries can restock in time and avoid over-ordering, supporting UN SDG 2: Zero Hunger.

**Stack:** React (Vite) frontend, Node.js + Express REST API, JSON file for persistence.

## Features

- View inventory items with quantities
- Add new items, update stock levels (edit the quantity and click away to save)
- Summary of total items, total units and units per category

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

| Method | Route            | Body                            | Description        |
| ------ | ---------------- | ------------------------------- | ------------------ |
| GET    | `/api/items`     |                                 | List all items     |
| POST   | `/api/items`     | `{ name, category, quantity }`  | Add an item        |
| PUT    | `/api/items/:id` | `{ quantity }`                  | Update stock level |

Data is saved to `server/data.json`, created on first write.
