import { useEffect, useState } from "react";

const LOW_STOCK = 10;
const empty = { name: "", category: "", quantity: "" };

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);

  const load = () => fetch("/api/items").then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(empty);
    load();
  };

  const update = async (id, quantity) => {
    await fetch(`/api/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    load();
  };

  const total = items.reduce((sum, i) => sum + i.quantity, 0);
  const byCategory = items.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + i.quantity;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Community Pantry Tracker</h1>

      <h2>Summary</h2>
      <p>{items.length} items, {total} units total</p>
      <ul>
        {Object.entries(byCategory).map(([c, q]) => <li key={c}>{c}: {q}</li>)}
      </ul>

      <h2>Inventory</h2>
      <table width="100%">
        <thead><tr><th align="left">Item</th><th align="left">Category</th><th>Qty</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} style={{ color: i.quantity < LOW_STOCK ? "crimson" : "inherit" }}>
              <td>{i.name}{i.quantity < LOW_STOCK && " (low stock)"}</td>
              <td>{i.category}</td>
              <td align="center">
                <input type="number" min="0" defaultValue={i.quantity} key={i.quantity}
                  style={{ width: 60 }} onBlur={(e) => update(i.id, e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add item</h2>
      <form onSubmit={add}>
        <input required placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />{" "}
        <input required placeholder="Category" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />{" "}
        <input required type="number" min="0" placeholder="Qty" style={{ width: 70 }} value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })} />{" "}
        <button>Add</button>
      </form>
    </div>
  );
}
