import { useEffect, useState } from "react";

// GraphQL helper: adds the JWT, throws the first error (with its code) if the request failed
async function gql(query, variables = {}, token) {
  const res = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors) throw Object.assign(new Error(errors[0].message), { code: errors[0].extensions?.code });
  return data;
}

const HARVEST_FIELDS = `
  id crop quantityKg availableUntil status donatedAt mine
  category { id name }
  foodBank { id name }`;

const PAGE_QUERY = `
  query Page($category: ID, $status: HarvestStatus!, $auth: Boolean!, $myCategory: ID, $myStatus: HarvestStatus) {
    summary { availableKg donatedKg }
    harvests(categoryId: $category, status: $status) { ${HARVEST_FIELDS} }
    myHarvests(categoryId: $myCategory, status: $myStatus) @include(if: $auth) { ${HARVEST_FIELDS} }
  }`;

const REPORT_QUERY = `
  query Report($weekStart: String) {
    weeklyDonationReport(weekStart: $weekStart) {
      weekStart weekEnd totalKg harvestCount
      foodBanks {
        foodBank { id name address }
        totalKg harvestCount
        byCategory { category kg }
        donations { crop category quantityKg donatedAt }
      }
    }
  }`;

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const fmt = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", opts);

function Login({ onToken }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = (mutation) => async (e) => {
    e.preventDefault();
    try {
      const data = await gql(
        `mutation($email: String!, $password: String!) { ${mutation}(email: $email, password: $password) { token } }`,
        form
      );
      onToken(data[mutation].token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit("login")}>
      <input required type="email" placeholder="Email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input required type="password" placeholder="Password (8+ chars)" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button>Log in</button>
      <button type="button" className="secondary" onClick={submit("register")}>Sign up</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

// Category + donation-status filter; `statuses` are the allowed [value, label] pairs
function Filters({ categories, value, onChange, statuses }) {
  return (
    <div className="filters">
      <select aria-label="Category" value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select aria-label="Status" value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}>
        {statuses.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
    </div>
  );
}

function AddHarvest({ token, categories, onAdded }) {
  const empty = { crop: "", categoryId: "", quantityKg: "", availableUntil: today() };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await gql(
        `mutation($input: HarvestInput!) { addHarvest(input: $input) { id } }`,
        { input: { ...form, categoryId: form.categoryId || categories[0].id, quantityKg: Number(form.quantityKg) } },
        token
      );
      setForm(empty);
      setError("");
      onAdded();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="add-form" onSubmit={submit}>
      <label>Crop
        <input required placeholder="e.g. tomatoes" value={form.crop}
          onChange={(e) => setForm({ ...form, crop: e.target.value })} />
      </label>
      <label>Category
        <select value={form.categoryId || categories[0]?.id || ""}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label>Weight (kg)
        <input required className="qty-input" type="number" min="0.1" step="0.1" value={form.quantityKg}
          onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} />
      </label>
      <label>Good until
        <input required type="date" min={today()} value={form.availableUntil}
          onChange={(e) => setForm({ ...form, availableUntil: e.target.value })} />
      </label>
      <button>Add surplus</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

// Weekly donation summary per partner food bank, with previous/next week navigation
function WeeklyReport() {
  const [offset, setOffset] = useState(0); // weeks back from the current week
  const [report, setReport] = useState(null);

  useEffect(() => {
    gql(REPORT_QUERY, { weekStart: addDays(offset * 7) }).then((d) => setReport(d.weeklyDonationReport));
  }, [offset]);

  return (
    <section>
      <h2>Weekly donation report</h2>
      <div className="week-nav">
        <button className="secondary" onClick={() => setOffset(offset - 1)}>← Previous</button>
        <span className="week-label">
          {report ? `${fmt(report.weekStart, { day: "numeric", month: "short" })} – ${fmt(report.weekEnd, { day: "numeric", month: "short", year: "numeric" })}` : "…"}
          {offset === 0 && <span className="badge">this week</span>}
        </span>
        <button className="secondary" disabled={offset === 0} onClick={() => setOffset(offset + 1)}>Next →</button>
      </div>

      {report && (
        <>
          <p className="meta">
            {report.harvestCount === 0
              ? "No donations recorded this week."
              : `${report.totalKg} kg across ${report.harvestCount} harvest${report.harvestCount === 1 ? "" : "s"} delivered to ${report.foodBanks.length} food bank${report.foodBanks.length === 1 ? "" : "s"}.`}
          </p>
          {report.foodBanks.map((b) => (
            <div key={b.foodBank.id} className="card">
              <div className="card-head">
                <span className="crop">{b.foodBank.name}</span>
                <span className="qty">{b.totalKg} kg</span>
              </div>
              <div className="meta">{b.foodBank.address} · {b.harvestCount} harvest{b.harvestCount === 1 ? "" : "s"}</div>
              <div className="chips">
                {b.byCategory.map((c) => <span key={c.category} className="badge">{c.category} {c.kg} kg</span>)}
              </div>
              <ul className="lines">
                {b.donations.map((d, i) => (
                  <li key={i}><span>{fmt(d.donatedAt, { weekday: "short", day: "numeric", month: "short" })}</span> {d.crop} <em>{d.quantityKg} kg</em></li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [categories, setCategories] = useState([]);
  const [foodBanks, setFoodBanks] = useState([]);
  const [summary, setSummary] = useState({ availableKg: 0, donatedKg: 0 });
  const [harvests, setHarvests] = useState([]);
  const [mine, setMine] = useState([]);
  const [filter, setFilter] = useState({ category: "", status: "AVAILABLE" });
  const [myFilter, setMyFilter] = useState({ category: "", status: "" });
  const [target, setTarget] = useState({}); // harvest id -> chosen food bank id

  const saveToken = (t) => {
    t ? localStorage.setItem("token", t) : localStorage.removeItem("token");
    setToken(t);
  };

  // One request loads the totals, the public list and (when logged in) the user's own list
  const refresh = async () => {
    try {
      const d = await gql(PAGE_QUERY, {
        category: filter.category || null,
        status: filter.status,
        auth: !!token,
        myCategory: myFilter.category || null,
        myStatus: myFilter.status || null,
      }, token);
      setSummary(d.summary);
      setHarvests(d.harvests);
      setMine(d.myHarvests ?? []);
    } catch (err) {
      if (err.code === "UNAUTHENTICATED") saveToken(null); // expired/invalid token logs the user out
    }
  };

  useEffect(() => {
    gql(`{ categories { id name } foodBanks { id name address } }`).then((d) => {
      setCategories(d.categories);
      setFoodBanks(d.foodBanks);
    });
  }, []);
  useEffect(() => { refresh(); }, [token, filter, myFilter]);

  const donate = async (h) => {
    const foodBankId = target[h.id] || foodBanks[0]?.id;
    await gql(`mutation($id: ID!, $foodBankId: ID!) { donateHarvest(id: $id, foodBankId: $foodBankId) { id } }`,
      { id: h.id, foodBankId }, token);
    refresh();
  };

  const remove = async (h) => {
    await gql(`mutation($id: ID!) { removeHarvest(id: $id) }`, { id: h.id }, token);
    refresh();
  };

  const soon = (h) => h.status === "AVAILABLE" && (new Date(h.availableUntil) - new Date(today())) / 864e5 <= 3;

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <h1>Garden Surplus Share</h1>
          <p>Local gardeners list extra produce so it reaches food banks instead of the compost heap.</p>
        </div>
      </header>

      <main className="page">
        <div className="auth">
          {token ? <button className="secondary" onClick={() => saveToken(null)}>Log out</button> : <Login onToken={saveToken} />}
        </div>

        <div className="stats">
          <div className="stat"><strong>{summary.availableKg} kg</strong><span>ready for pickup</span></div>
          <div className="stat"><strong>{summary.donatedKg} kg</strong><span>donated so far</span></div>
        </div>

        <div className="section-head">
          <h2>{filter.status === "AVAILABLE" ? "Available harvests" : "Donated harvests"}</h2>
          <Filters categories={categories} value={filter} onChange={setFilter}
            statuses={[["AVAILABLE", "Available"], ["DONATED", "Donated"]]} />
        </div>
        {harvests.length === 0 && <p className="empty">Nothing matches right now.</p>}
        {harvests.map((h) => (
          <div key={h.id} className="card">
            <div className="card-head">
              <span className="crop">{h.crop}{h.mine && <span className="badge">yours</span>}</span>
              <span className="qty">{h.quantityKg} kg</span>
            </div>
            <div className="meta">
              {h.category.name} · {h.status === "DONATED"
                ? `Donated to ${h.foodBank.name} on ${fmt(h.donatedAt, { day: "numeric", month: "short" })}`
                : `Good until ${h.availableUntil}`}
              {soon(h) && <span className="badge soon">use soon</span>}
            </div>
          </div>
        ))}

        {token && (
          <>
            <h2>List surplus produce</h2>
            <AddHarvest token={token} categories={categories} onAdded={refresh} />

            <div className="section-head">
              <h2>My harvests</h2>
              <Filters categories={categories} value={myFilter} onChange={setMyFilter}
                statuses={[["", "Any status"], ["AVAILABLE", "Available"], ["DONATED", "Donated"]]} />
            </div>
            {mine.length === 0 && <p className="empty">No harvests match.</p>}
            {mine.map((h) => (
              <div key={h.id} className="card">
                <div className="card-head">
                  <span className="crop">{h.crop}</span>
                  <span className="qty">{h.quantityKg} kg</span>
                </div>
                <div className="meta">{h.category.name} · Good until {h.availableUntil}</div>
                {h.status === "DONATED" ? (
                  <div className="meta">Donated to {h.foodBank.name}<span className="badge">donated</span></div>
                ) : (
                  <div className="actions">
                    <select aria-label="Food bank" value={target[h.id] || foodBanks[0]?.id || ""}
                      onChange={(e) => setTarget({ ...target, [h.id]: e.target.value })}>
                      {foodBanks.map((fb) => <option key={fb.id} value={fb.id}>{fb.name} ({fb.address})</option>)}
                    </select>
                    <button onClick={() => donate(h)}>Mark donated</button>
                    <button className="danger" onClick={() => remove(h)}>Remove</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        <WeeklyReport key={summary.donatedKg} />

        <h2>Partner food banks</h2>
        <ul className="banks">
          {foodBanks.map((fb) => <li key={fb.id}>{fb.name} <span>— {fb.address}</span></li>)}
        </ul>
      </main>
    </>
  );
}
