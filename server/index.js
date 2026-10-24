import express from "express";
import cors from "cors";
import fs from "fs";

const FILE = "data.json";
const load = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : []);
const save = (items) => fs.writeFileSync(FILE, JSON.stringify(items, null, 2));

const app = express();
app.use(cors(), express.json());

// List all items
app.get("/api/items", (req, res) => res.json(load()));

// Add an item
app.post("/api/items", (req, res) => {
  const { name, category, quantity } = req.body;
  if (!name || !category || !(Number(quantity) >= 0)) {
    return res.status(400).json({ error: "name, category and quantity required" });
  }
  const items = load();
  const item = { id: Date.now(), name, category, quantity: Number(quantity) };
  save([...items, item]);
  res.status(201).json(item);
});

// Update stock level
app.put("/api/items/:id", (req, res) => {
  const items = load();
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "not found" });
  if (!(Number(req.body.quantity) >= 0)) return res.status(400).json({ error: "invalid quantity" });
  item.quantity = Number(req.body.quantity);
  save(items);
  res.json(item);
});

app.listen(3001, () => console.log("API on http://localhost:3001"));
