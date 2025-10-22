const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// File path for data storage
const DATA_FILE = path.join(__dirname, 'contacts.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('vcfadmin'));

// --- Helper functions ---
function readContacts() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeContacts(contacts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(contacts, null, 2));
}

// Normalize phone numbers (e.g., remove spaces or +)
function normPhone(phone) {
  return phone.replace(/\s+/g, '').replace(/^0/, '+254');
}

// --- CLIENT submits contact ---
app.post('/api/submit', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, message: 'Missing name or phone' });

  const normalized = normPhone(phone);
  const contacts = readContacts();

  // Prevent duplicates
  const exists = contacts.find(c => c.phone === normalized);
  if (exists) {
    return res.json({ success: false, message: 'This phone number has already been submitted' });
  }

  const newContact = {
    id: uuidv4(),
    name,
    phone: normalized,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  contacts.push(newContact);
  writeContacts(contacts);

  return res.json({ success: true, message: 'Submitted successfully', contact: newContact });
});

// --- CLIENT checks their status (by phone) ---
app.get('/api/status', (req, res) => {
  const phone = req.query.phone || '';
  if (!phone) return res.json({ found: false });
  const normalized = normPhone(phone);
  const contacts = readContacts();
  const found = contacts.find(c => c.phone === normalized);
  if (!found) return res.json({ found: false });
  return res.json({ found: true, contact: found });
});

// --- ADMIN: get all contacts ---
app.get('/api/contacts', (req, res) => {
  const contacts = readContacts();
  // Sort newest first
  contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, contacts });
});

// --- ADMIN: approve contact ---
app.post('/api/contacts/:id/approve', (req, res) => {
  const id = req.params.id;
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  contacts[idx].status = 'Approved';
  writeContacts(contacts);
  res.json({ success: true, contact: contacts[idx] });
});

// --- ADMIN: reject contact ---
app.post('/api/contacts/:id/reject', (req, res) => {
  const id = req.params.id;
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  contacts[idx].status = 'Rejected';
  writeContacts(contacts);
  res.json({ success: true, contact: contacts[idx] });
});

// --- ADMIN: download approved contacts as VCF ---
app.get('/api/download/vcf', (req, res) => {
  const contacts = readContacts();
  const approved = contacts.filter(c => c.status === 'Approved');

  if (approved.length === 0) {
    return res.status(400).send('No approved contacts to export.');
  }

  // Build vCard
  const lines = [];
  approved.forEach(c => {
    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');
    lines.push(`FN:${c.name}`);
    lines.push(`TEL;TYPE=CELL:${c.phone}`);
    lines.push('END:VCARD');
  });

  const vcfContent = lines.join('\r\n');
  res.setHeader('Content-Disposition', 'attachment; filename="approved_contacts.vcf"');
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.send(vcfContent);
});

// --- Health check ---
app.get('/health', (req, res) => res.send('ok'));

// --- Start server ---
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
