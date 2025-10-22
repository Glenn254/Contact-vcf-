// vcfadmin/admin.js

// The base URL of your Render backend
const API_URL = "https://contact-vcf-zvy1.onrender.com";

// Example: Load verified contacts
async function loadContacts() {
  try {
    const response = await fetch(`${API_URL}/api/contacts`);
    if (!response.ok) throw new Error("Failed to load contacts");

    const contacts = await response.json();
    const list = document.getElementById("contactList");
    list.innerHTML = "";

    contacts.forEach(c => {
      const item = document.createElement("li");
      item.textContent = `${c.name} - ${c.phone}`;
      list.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    alert("Network error: Could not connect to server");
  }
}

// Example: Admin login check (optional if you’ll add password later)
async function verifyPassword(password) {
  const response = await fetch(`${API_URL}/api/verify-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return response.ok;
}

// Load contacts when the page opens
window.addEventListener("DOMContentLoaded", loadContacts);
