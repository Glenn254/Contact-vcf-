// vcfadmin/admin.js
// ✅ Admin Panel Script — No password, auto-loads contacts

const API_URL = "https://contact-vcf-zvy1.onrender.com"; // replace with your backend URL

// DOM elements
const contactList = document.getElementById("contactList");
const statsBox = document.getElementById("statsBox");

// Load all contacts and statistics on page load
window.addEventListener("DOMContentLoaded", () => {
  loadContacts();
  loadStats();
});

// Fetch all contacts
async function loadContacts() {
  try {
    const response = await fetch(`${API_URL}/api/contacts`);
    const data = await response.json();

    if (!data.ok) throw new Error("Failed to load contacts");

    renderContacts(data.contacts);
  } catch (err) {
    console.error(err);
    contactList.innerHTML = `<p style="color:red;">Error loading contacts.</p>`;
  }
}

// Fetch statistics
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/api/stats`);
    const data = await response.json();
    if (!data.ok) return;

    statsBox.innerHTML = `
      <p><strong>Total:</strong> ${data.total}</p>
      <p><strong>Pending:</strong> ${data.pending}</p>
      <p><strong>Approved:</strong> ${data.approved}</p>
      <p><strong>Rejected:</strong> ${data.rejected}</p>
    `;
  } catch (err) {
    console.error("Stats load error:", err);
  }
}

// Render contacts in admin table
function renderContacts(contacts) {
  if (!contacts.length) {
    contactList.innerHTML = `<p>No contacts submitted yet.</p>`;
    return;
  }

  contactList.innerHTML = `
    <table border="1" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;text-align:left;">
      <thead style="background:#222;color:#fff;">
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${contacts
          .map((c) => {
            let statusColor =
              c.status === "approved"
                ? "green"
                : c.status === "rejected"
                ? "red"
                : "orange";
            return `
              <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td style="color:${statusColor};font-weight:bold;">${c.status}</td>
                <td>
                  <button onclick="updateStatus('${c.id}','approved')" style="background:green;color:white;border:none;padding:5px 10px;border-radius:5px;">Approve</button>
                  <button onclick="updateStatus('${c.id}','rejected')" style="background:red;color:white;border:none;padding:5px 10px;border-radius:5px;">Reject</button>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

// Approve or reject a contact
async function updateStatus(id, status) {
  try {
    const confirmAction = confirm(`Are you sure you want to mark as ${status.toUpperCase()}?`);
    if (!confirmAction) return;

    const response = await fetch(`${API_URL}/api/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error("Update failed");

    alert(`Contact marked as ${status.toUpperCase()} successfully.`);
    loadContacts(); // refresh list
    loadStats(); // refresh stats
  } catch (err) {
    console.error(err);
    alert("Failed to update contact status.");
  }
}
