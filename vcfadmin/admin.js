// ✅ Base URL for your live Render backend
const API_URL = "https://contact-vcf-zvy1.onrender.com";

// ✅ Load all submitted contacts
async function loadContacts() {
  try {
    const res = await fetch(`${API_URL}/api/contacts`);
    if (!res.ok) throw new Error("Failed to load contacts");

    const data = await res.json();
    const list = document.getElementById("contactList");
    list.innerHTML = "";

    (data.contacts || []).forEach(c => {
      const item = document.createElement("li");
      item.textContent = `${c.name} - ${c.phone} (${c.status})`;
      list.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading contacts:", err);
    alert("⚠️ Network error: Could not connect to server");
  }
}

// ✅ Admin login
async function adminLogin() {
  const password = prompt("Enter admin password:");
  if (!password) return;

  try {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      alert("✅ Logged in successfully!");
      loadContacts();
    } else {
      alert("❌ Wrong password.");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("⚠️ Network error: Could not connect to server");
  }
}

// ✅ Load contacts automatically when logged in
window.addEventListener("DOMContentLoaded", adminLogin);
