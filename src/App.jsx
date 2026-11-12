
import { useEffect, useRef, useState } from "react";
import "./App.css";

// ==========================================
// 1. AWS API CONFIGURATION
// ==========================================

const API_BASE =
  "https://ltayb90q72.execute-api.us-east-1.amazonaws.com";

const ITEMS_URL = `${API_BASE}/items`;
const UPLOAD_URL = `${API_BASE}/upload-url`;

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const initialForm = {
  name: "",
  type: "LOST",
  location: "",
  description: "",
};

// ==========================================
// 2. HELPERS
// ==========================================

function normalizeItem(item) {
  return {
    id: item.itemId,
    name: item.itemName || "",
    type: item.type || "LOST",
    location: item.location || "",
    description: item.description || "",
    imageKey: item.imageKey || null,
    imageUrl: item.imageUrl || null,
  };
}

async function readApiResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed: ${response.status}`
    );
  }

  return data;
}

// ==========================================
// 3. APP COMPONENT
// ==========================================

function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const fileInputRef = useRef(null);

  // ========================================
  // 4. LOAD ITEMS FROM DYNAMODB
  // ========================================

  async function loadItems(signal) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(ITEMS_URL, {
        method: "GET",
        signal,
      });

      const data = await readApiResponse(response);

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
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    loadItems(controller.signal);

    return () => controller.abort();
  }, []);

  // ========================================
  // 5. SELECT IMAGE & PREVIEW
  // ========================================

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      return;
    }

    setSubmitMessage("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSubmitMessage(
        "Only JPG, PNG and WebP images are allowed."
      );

      event.target.value = "";
      setImageFile(null);
      return;
    }

    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      setSubmitMessage(
        "Image must be smaller than 2 MB."
      );

      event.target.value = "";
      setImageFile(null);
      return;
    }

    setImageFile(file);
  }

  function removeImage() {
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ========================================
  // 6. REQUEST PRESIGNED POST
  // ========================================

  async function requestUploadForm(contentType) {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType,
      }),
    });

    const data = await readApiResponse(response);

    if (
      !data.uploadUrl ||
      !data.fields ||
      !data.imageKey
    ) {
      throw new Error("Invalid upload response");
    }

    return data;
  }

  // ========================================
  // 7. UPLOAD IMAGE TO AMAZON S3
  // ========================================

  async function uploadImageToS3(file) {
    setUploadProgress("Requesting upload permission...");

    const uploadData = await requestUploadForm(file.type);

    const formData = new FormData();

    // Add all AWS-required signed fields
    Object.entries(uploadData.fields).forEach(
      ([key, value]) => {
        formData.append(key, value);
      }
    );

    // File must be added after the signed fields
    formData.append("file", file);

    setUploadProgress("Uploading image to Amazon S3...");

    const response = await fetch(uploadData.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `S3 upload failed: ${response.status}`
      );
    }

    return uploadData.imageKey;
  }

  // ========================================
  // 8. SUBMIT ITEM TO DYNAMODB
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");
    setUploadProgress("");

    let imageKey = null;

    try {
      // Step 1: Upload image if selected
      if (imageFile) {
        imageKey = await uploadImageToS3(imageFile);
      }

      // Step 2: Save item in DynamoDB
      setUploadProgress("Saving item to DynamoDB...");

      const payload = {
        itemName: form.name.trim(),
        type: form.type,
        location: form.location.trim(),
        description: form.description.trim(),
      };

      if (imageKey) {
        payload.imageKey = imageKey;
      }

      const response = await fetch(ITEMS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse(response);

      if (!data.item?.itemId) {
        throw new Error("Invalid item response");
      }

      // Step 3: Update items list
      setItems((previousItems) => [
        normalizeItem(data.item),
        ...previousItems.filter(
          (item) => item.id !== data.item.itemId
        ),
      ]);

      // Step 4: Reset form
      setForm({ ...initialForm });
      removeImage();

      setSubmitMessage(
        "Item and image saved to AWS successfully!"
      );

      setUploadProgress("");
    } catch (err) {
      console.error("Submit Error:", err);

      if (err.message === "Image upload is disabled") {
        setSubmitMessage(
          "Image upload is disabled. Please try again during the demo."
        );
      } else {
        setSubmitMessage(
          `Unable to complete the request: ${err.message}. Check the list before retrying.`
        );
      }

      setUploadProgress("");
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // 9. SEARCH ITEMS
  // ========================================

  const filteredItems = items.filter((item) =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ========================================
  // 10. USER INTERFACE
  // ========================================

  return (
    <main className="container">
      <header>
        <h1>Lost and Found</h1>
        <p>
          Cloud-Based Lost and Found Management System
        </p>
      </header>

      {/* REPORT ITEM FORM */}
      <section className="card">
        <h2>Report an Item</h2>

        <p>
          Report lost or found items. Images are
          stored securely in Amazon S3.
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
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
          />

          <label htmlFor="itemType">
            Type
          </label>

          <select
            id="itemType"
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value,
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
            onChange={(event) =>
              setForm({
                ...form,
                location: event.target.value,
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
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
          />

          {/* IMAGE UPLOAD */}
          <label htmlFor="itemImage">
            Item Image (Optional)
          </label>

          <input
            id="itemImage"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
          />

          <p style={{ fontSize: "0.85rem" }}>
            Supported: JPG, PNG, WebP (max 2 MB)
          </p>

          {/* IMAGE PREVIEW */}
          {imagePreview && (
            <div style={{ marginTop: "12px" }}>
              <img
                src={imagePreview}
                alt="Selected item preview"
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  maxHeight: "240px",
                  objectFit: "contain",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />

              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={submitting}
                >
                  Remove Image
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Add Item"}
          </button>

          {uploadProgress && (
            <p role="status">
              {uploadProgress}
            </p>
          )}

          {submitMessage && (
            <p role="status">
              {submitMessage}
            </p>
          )}
        </form>
      </section>

      {/* LOST AND FOUND ITEMS */}
      <section className="card">
        <h2>Lost &amp; Found Items</h2>

        <input
          aria-label="Search items"
          placeholder="Search items..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
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

                {/* S3 IMAGE */}
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      maxWidth: "320px",
                      maxHeight: "240px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      marginBottom: "12px",
                    }}
                  />
                )}

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
