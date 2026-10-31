import { useEffect, useState } from "react";

// Small fetch helper that adds the JWT and returns parsed JSON (or throws the API error)
async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

function Login({ onToken }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = (path) => async (e) => {
    e.preventDefault();
    try {
      onToken((await api(path, { method: "POST", body: form })).token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit("/login")}>
      <input required type="email" placeholder="Email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} />{" "}
      <input required type="password" placeholder="Password (8+ chars)" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />{" "}
      <button>Log in</button>{" "}
      <button type="button" onClick={submit("/register")}>Sign up</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function AddHarvest({ token, onAdded }) {
  const empty = { crop: "", quantityKg: "", availableUntil: today() };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api("/harvests", { method: "POST", body: form, token });
      setForm(empty);
      setError("");
      onAdded();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <input required placeholder="Crop, e.g. tomatoes" value={form.crop}
        onChange={(e) => setForm({ ...form, crop: e.target.value })} />{" "}
      <input required type="number" min="0.1" step="0.1" placeholder="kg" style={{ width: 70 }} value={form.quantityKg}
        onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} />{" "}
      <label>Good until{" "}
        <input required type="date" min={today()} value={form.availableUntil}
          onChange={(e) => setForm({ ...form, availableUntil: e.target.value })} />
      </label>{" "}
      <button>Add surplus</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [available, setAvailable] = useState([]);
  const [summary, setSummary] = useState({ availableKg: 0, donatedKg: 0 });
  const [foodBanks, setFoodBanks] = useState([]);
  const [mine, setMine] = useState([]);
  const [target, setTarget] = useState({}); // harvest id -> chosen food bank id

  const saveToken = (t) => {
    t ? localStorage.setItem("token", t) : localStorage.removeItem("token");
    setToken(t);
  };

  const refresh = async () => {
    const [h, s] = await Promise.all([api("/harvests"), api("/summary")]);
    setAvailable(h);
    setSummary(s);
    if (!token) return setMine([]);
    try {
      setMine(await api("/my-harvests", { token }));
    } catch {
      saveToken(null); // an expired/invalid token logs the user out
    }
  };

  useEffect(() => { api("/food-banks").then(setFoodBanks); }, []);
  useEffect(() => { refresh(); }, [token]);

  const donate = async (h) => {
    const foodBankId = target[h.id] || foodBanks[0]?.id;
    await api(`/harvests/${h.id}/donate`, { method: "POST", body: { foodBankId }, token });
    refresh();
  };

  const remove = async (h) => {
    await api(`/harvests/${h.id}`, { method: "DELETE", token });
    refresh();
  };

  const row = { borderBottom: "1px solid #ccc", padding: "0.5rem 0" };
  const mineIds = new Set(mine.map((h) => h.id));

  return (
    <div style={{ maxWidth: 650, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Garden Surplus Share</h1>
      <p>Local gardeners list extra produce so it reaches food banks instead of the compost heap.</p>
      {token ? <button onClick={() => saveToken(null)}>Log out</button> : <Login onToken={saveToken} />}

      <p>
        <strong>{summary.availableKg} kg</strong> ready for pickup · <strong>{summary.donatedKg} kg</strong> donated so far
      </p>

      <h2>Available harvests</h2>
      {available.length === 0 && <p>Nothing listed right now.</p>}
      {available.map((h) => (
        <div key={h.id} style={row}>
          <strong>{h.crop}</strong> · {h.quantityKg} kg · good until {h.availableUntil}
          {mineIds.has(h.id) && " (yours)"}
        </div>
      ))}

      {token && (
        <>
          <h2>List surplus produce</h2>
          <AddHarvest token={token} onAdded={refresh} />

          <h2>My harvests</h2>
          {mine.length === 0 && <p>You haven't listed anything yet.</p>}
          {mine.map((h) => (
            <div key={h.id} style={row}>
              <strong>{h.crop}</strong> · {h.quantityKg} kg · good until {h.availableUntil}
              {h.status === "donated" ? (
                <p>Donated to {h.foodBank}</p>
              ) : (
                <p>
                  <select value={target[h.id] || foodBanks[0]?.id || ""}
                    onChange={(e) => setTarget({ ...target, [h.id]: e.target.value })}>
                    {foodBanks.map((fb) => <option key={fb.id} value={fb.id}>{fb.name} ({fb.address})</option>)}
                  </select>{" "}
                  <button onClick={() => donate(h)}>Mark donated</button>{" "}
                  <button onClick={() => remove(h)}>Remove</button>
                </p>
              )}
            </div>
          ))}
        </>
      )}

      <h2>Partner food banks</h2>
      <ul>{foodBanks.map((fb) => <li key={fb.id}>{fb.name} — {fb.address}</li>)}</ul>
    </div>
  );
}
