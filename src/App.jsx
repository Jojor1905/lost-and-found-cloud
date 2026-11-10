
import { useState } from "react";
import "./App.css";

const sampleItems = [
  {
    id: "ITEM001",
    name: "Black Wallet",
    type: "LOST",
    location: "University Library",
    description: "Black leather wallet lost near the library",
  },
  {
    id: "ITEM002",
    name: "Blue Backpack",
    type: "FOUND",
    location: "University Cafeteria",
    description: "A blue backpack found near the cafeteria",
  },
];

function App() {
  const [items, setItems] = useState(sampleItems);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "LOST",
    location: "",
    description: "",
  });

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      ...form,
    };

    setItems([newItem, ...items]);

    setForm({
      name: "",
      type: "LOST",
      location: "",
      description: "",
    });
  }

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
              setForm({ ...form, description: e.target.value })
            }
          />

          <button type="submit">Add Item</button>
        </form>
      </section>

      <section className="card">
        <h2>Lost & Found Items</h2>

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
                <span className={`tag ${item.type.toLowerCase()}`}>
                  {item.type}
                </span>
              </div>

              <p><strong>Location:</strong> {item.location}</p>
              <p>{item.description}</p>
            </article>
          ))}

          {filteredItems.length === 0 && (
            <p>No items found.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
