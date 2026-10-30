import { useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [recipes, setRecipes] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/recipes?ingredients=${encodeURIComponent(text)}`);
    setRecipes(await res.json());
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Pantry Recipe Finder</h1>
      <form onSubmit={search}>
        <input
          style={{ width: "70%" }}
          placeholder="Ingredients you have, e.g. egg, rice, onion"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />{" "}
        <button>Find recipes</button>
      </form>

      {recipes && recipes.length === 0 && <p>No matching recipes found.</p>}
      {recipes?.map((r) => (
        <div key={r.name} style={{ borderBottom: "1px solid #ccc", padding: "0.5rem 0" }}>
          <h3>{r.name}</h3>
          <p>
            {r.cookingTime} min · {r.calories} kcal · {r.protein}g protein
          </p>
          <p>Uses: {r.used.join(", ")}</p>
          {r.missing.length > 0 && <p>Missing: {r.missing.join(", ")}</p>}
        </div>
      ))}
    </div>
  );
}
