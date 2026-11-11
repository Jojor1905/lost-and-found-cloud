
import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  "https://ltayb90q72.execute-api.us-east-1.amazonaws.com/items";

const initialForm = {
  name: "",
  type: "LOST",
  location: "",
  description: "",
};

function normalizeItem(item) {
  return {
    id: item.itemId,
    name: item.itemName || "",
    type: item.type || "LOST",
    location: item.location || "",
    description: item.description || "",
  };
}

function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  // GET: Load items from AWS DynamoDB
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
          throw new Error(
            `Failed to load items: ${response.status}`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.items)) {
          throw new Error("Invalid API response");
        }

        setItems(data.items.map(normalizeItem));
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("GET API Error:", err);
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

  // POST: Save new item to AWS DynamoDB
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim() || submitting) return;

    setSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: form.name.trim(),
          type: form.type,
          location: form.location.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create item"
        );
      }

      if (!data.item?.itemId) {
        throw new Error("Invalid API response");
      }

      // Display the item immediately
      setItems((prev) => [
        normalizeItem(data.item),
        ...prev.filter(
          (item) => item.id !== data.item.itemId
        ),
      ]);

      // Reset form
      setForm({ ...initialForm });

      setSubmitMessage(
        "Item saved to AWS successfully!"
      );
    } catch (err) {
      console.error("POST API Error:", err);
      setSubmitMessage(
        "Unable to confirm that the item was saved. Refresh the list before trying again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Search items
  const filteredItems = items.filter((item) =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="container">
      <header>
        <h1>Lost and Found</h1>
        <p>
          Cloud-Based Lost and Found Management System
        </p>
      </header>

      {/* Report Item Form */}
      <section className="card">
        <h2>Report an Item</h2>

        <p>
          New items will be saved to AWS DynamoDB.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="itemName">
            Item Name
          </label>
          <input
            id="itemName"
            required
            maxLength={100}
            placeholder="e.g. Black Wallet"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <label htmlFor="itemType">
            Type
          </label>
          <select
            id="itemType"
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
              })
            }
          >
            <option value="LOST">Lost</option>
            <option value="FOUND">Found</option>
          </select>

          <label htmlFor="itemLocation">
            Location
          </label>
          <input
            id="itemLocation"
            maxLength={200}
            placeholder="e.g. University Library"
            value={form.location}
            onChange={(e) =>
              setForm({
                ...form,
                location: e.target.value,
              })
            }
          />

          <label htmlFor="itemDescription">
            Description
          </label>
          <textarea
            id="itemDescription"
            rows="3"
            maxLength={1000}
            placeholder="Item details..."
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
          />

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Add Item"}
          </button>

          {submitMessage && (
            <p role="status">
              {submitMessage}
            </p>
          )}
        </form>
      </section>

      {/* Items List */}
      <section className="card">
        <h2>Lost & Found Items</h2>

        <input
          aria-label="Search items"
          placeholder="Search items..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        {loading && (
          <p>Loading items from AWS...</p>
        )}

        {error && (
          <p role="alert">{error}</p>
        )}

        <div className="item-list">
          {!loading &&
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="item"
              >
                <div className="item-header">
                  <h3>{item.name}</h3>

                  <span
                    className={`tag ${item.type.toLowerCase()}`}
                  >
                    {item.type}
                  </span>
                </div>

                <p>
                  <strong>Location:</strong>{" "}
                  {item.location}
                </p>

                <p>{item.description}</p>
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
