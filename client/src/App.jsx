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

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [text, setText] = useState("");
  const [recipes, setRecipes] = useState(null);
  const [favorites, setFavorites] = useState([]);

  const saveToken = (t) => {
    t ? localStorage.setItem("token", t) : localStorage.removeItem("token");
    setToken(t);
  };

  // Load favorites on login; an expired/invalid token logs the user out
  useEffect(() => {
    if (!token) return setFavorites([]);
    api("/favorites", { token }).then(setFavorites).catch(() => saveToken(null));
  }, [token]);

  const search = async (e) => {
    e.preventDefault();
    setRecipes(await api(`/recipes?ingredients=${encodeURIComponent(text)}`));
  };

  const toggleFavorite = async (recipe) => {
    const isFav = favorites.some((f) => f.id === recipe.id);
    await api(`/favorites/${recipe.id}`, { method: isFav ? "DELETE" : "POST", token });
    setFavorites(await api("/favorites", { token }));
  };

  const RecipeCard = ({ r }) => (
    <div style={{ borderBottom: "1px solid #ccc", padding: "0.5rem 0" }}>
      <h3>{r.name}</h3>
      <p>{r.cookingTime} min · {r.calories} kcal · {r.protein}g protein</p>
      <p>Ingredients: {r.ingredients.join(", ")}</p>
      {r.used && <p>You have: {r.used.join(", ")}</p>}
      {token && (
        <button onClick={() => toggleFavorite(r)}>
          {favorites.some((f) => f.id === r.id) ? "Remove favorite" : "Save favorite"}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Pantry Recipe Finder</h1>
      {token ? <button onClick={() => saveToken(null)}>Log out</button> : <Login onToken={saveToken} />}

      <h2>Find recipes</h2>
      <form onSubmit={search}>
        <input style={{ width: "70%" }} placeholder="Ingredients you have, e.g. egg, rice, onion"
          value={text} onChange={(e) => setText(e.target.value)} />{" "}
        <button>Find recipes</button>
      </form>
      {recipes?.length === 0 && <p>No matching recipes found.</p>}
      {recipes?.map((r) => <RecipeCard key={r.id} r={r} />)}

      {token && (
        <>
          <h2>My favorites</h2>
          {favorites.length === 0 && <p>No favorites yet.</p>}
          {favorites.map((r) => <RecipeCard key={r.id} r={r} />)}
        </>
      )}
    </div>
  );
}
