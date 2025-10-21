// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// Path to contacts file
const contactsPath = path.join(__dirname, "contacts.json");

// ✅ Serve the main upload page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Serve the admin panel
app.get("/vcfadmin", (req, res) => {
  res.sendFile(path.join(__dirname, "vcfadmin", "admin.html"));
});

// ✅ Get all submitted contacts
app.get("/api/contacts", (req, res) => {
  fs.readFile(contactsPath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "Error reading contacts" });
    const contacts = data ? JSON.parse(data) : [];
    res.json(contacts);
  });
});

// ✅ Submit a new contact
app.post("/api/contacts", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ message: "Missing data" });

  fs.readFile(contactsPath, "utf8", (err, data) => {
    let contacts = [];
    if (!err && data) contacts = JSON.parse(data);

    contacts.push({ name, phone, approved: false });
    fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2), err => {
      if (err) return res.status(500).json({ message: "Error saving contact" });
      res.json({ message: "Contact submitted!" });
    });
  });
});

// ✅ Approve or reject contact
app.post("/api/contacts/:index/:action", (req, res) => {
  fs.readFile(contactsPath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "Error reading contacts" });
    const contacts = JSON.parse(data);
    const { index, action } = req.params;

    if (!contacts[index]) return res.status(404).json({ message: "Not found" });
    if (action === "approve") contacts[index].approved = true;
    if (action === "reject") contacts.splice(index, 1);

    fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2), err => {
      if (err) return res.status(500).json({ message: "Error saving changes" });
      res.json({ message: `Contact ${action}d successfully!` });
    });
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
