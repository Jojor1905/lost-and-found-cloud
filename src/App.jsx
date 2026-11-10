
import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  "https://ltayb90q72.execute-api.us-east-1.amazonaws.com/items";

function App() {
  const [cloudItems, setCloudItems] = useState([]);
  const [demoItems, setDemoItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "LOST",
    location: "",
    description: "",
  });

  // Load real items from AWS
  useEffect(() => {
    const controller = new AbortController();

    async function loadItems() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.items)) {
          throw new Error("Invalid API response");
        }

        const normalizedItems = data.items.map((item) => ({
          id: item.itemId,
          name: item.itemName || "",
          type: item.type || "LOST",
          location: item.location || "",
          description: item.description || "",
          isDemo: false,
        }));

        setCloudItems(normalizedItems);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to load items:", err);
          setError("Unable to load items from AWS.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadItems();

    return () => controller.abort();
  }, []);

  // Temporary frontend-only demo
  function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      ...form,
      isDemo: true,
    };

    setDemoItems((prev) => [newItem, ...prev]);

    setForm({
      name: "",
      type: "LOST",
      location: "",
      description: "",
    });
  }

  const items = [...demoItems, ...cloudItems];

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="container">
      <header>
        <h1>Lost and Found</h1>
        <p>Cloud-Based Lost and Found Management System</p>
      </header>

      <section className="card">
        <h2>Report an Item</h2>

        <p>
          Demo mode: New items are stored temporarily in
          your browser until cloud submission is enabled.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Item Name</label>
          <input
            required
            placeholder="e.g. Black Wallet"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <label>Type</label>
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
          >
            <option value="LOST">Lost</option>
            <option value="FOUND">Found</option>
          </select>

          <label>Location</label>
          <input
            placeholder="e.g. University Library"
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
          />

          <label>Description</label>
          <textarea
            rows="3"
            placeholder="Item details..."
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
          />

          <button type="submit">Add Demo Item</button>
        </form>
      </section>

      <section className="card">
        <h2>Lost & Found Items</h2>

        {loading && <p>Loading items from AWS...</p>}

        {error && <p role="alert">{error}</p>}

        <input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="item-list">
          {filteredItems.map((item) => (
            <article key={item.id} className="item">
              <div className="item-header">
                <h3>{item.name}</h3>

                <span
                  className={`tag ${item.type.toLowerCase()}`}
                >
                  {item.type}
                </span>
              </div>

              <p>
                <strong>Location:</strong> {item.location}
              </p>

              <p>{item.description}</p>

              {item.isDemo && (
                <p>Demo only - not saved to AWS</p>
              )}
            </article>
          ))}

          {!loading &&
            !error &&
            filteredItems.length === 0 && (
              <p>No items found.</p>
            )}
        </div>
      </section>
    </main>
  );
}

export default App;
