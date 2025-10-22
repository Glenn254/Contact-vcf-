// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const VCF_FILE = path.join(__dirname, 'verified_contacts.vcf');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers to load/save contacts
function loadContacts() {
  try {
    const raw = fs.readFileSync(CONTACTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveContacts(list) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// Create empty file if not exists
if (!fs.existsSync(CONTACTS_FILE)) saveContacts([]);

// Phone validation: Must start with country code (+254, +233, etc.)
function validPhone(phone) {
  if (!phone) return false;
  return /^\+\d{6,15}$/.test(phone.trim());
}

function ensureName(name) {
  if (!name) return '';
  const t = name.trim();
  return t.startsWith('💎') ? t : '💎' + t;
}

// API: Submit new contact (client)
app.post('/api/submit', (req, res) => {
  try {
    const { phone, name } = req.body || {};
    if (!phone || !name)
      return res.status(400).json({ error: 'Missing phone or name' });

    const normalized = phone.trim();
    if (!validPhone(normalized))
      return res
        .status(400)
        .json({ error: 'Phone must start with country code like +254...' });

    const fixedName = ensureName(name);
    const contacts = loadContacts();

    if (contacts.find((c) => c.phone === normalized)) {
      return res.status(409).json({ error: 'Phone already submitted' });
    }

    const entry = {
      id: uuidv4(),
      phone: normalized,
      name: fixedName,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    contacts.push(entry);
    saveContacts(contacts);

    return res.json({ ok: true, entry });
  } catch (err) {
    console.error('Submit error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Get all contacts (admin)
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = loadContacts();
    res.json({ ok: true, contacts });
  } catch (err) {
    console.error('Get contacts error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Approve or reject a contact (admin)
app.post('/api/update-status', (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const contacts = loadContacts();
    const index = contacts.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Contact not found' });

    contacts[index].status = status;
    contacts[index].updatedAt = new Date().toISOString();
    saveContacts(contacts);

    // Regenerate verified VCF whenever we approve
    if (status === 'approved') generateVCF(contacts);

    res.json({ ok: true, contact: contacts[index] });
  } catch (err) {
    console.error('Update status error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Get contact status by phone (client check)
app.get('/api/status/:phone', (req, res) => {
  try {
    const contacts = loadContacts();
    const found = contacts.find((c) => c.phone === req.params.phone.trim());
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, contact: found });
  } catch (err) {
    console.error('Status check error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Get statistics (admin)
app.get('/api/stats', (req, res) => {
  try {
    const contacts = loadContacts();
    const total = contacts.length;
    const approved = contacts.filter((c) => c.status === 'approved').length;
    const pending = contacts.filter((c) => c.status === 'pending').length;
    const rejected = contacts.filter((c) => c.status === 'rejected').length;

    res.json({ ok: true, total, approved, pending, rejected });
  } catch (err) {
    console.error('Stats error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate verified_contacts.vcf file
function generateVCF(contacts) {
  const verified = contacts.filter((c) => c.status === 'approved');
  let vcfContent = verified
    .map(
      (c) =>
        `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL:${c.phone}\nEND:VCARD`
    )
    .join('\n');
  fs.writeFileSync(VCF_FILE, vcfContent, 'utf8');
}

// API: Download verified VCF (admin)
app.get('/api/download-vcf', (req, res) => {
  try {
    if (!fs.existsSync(VCF_FILE)) {
      const contacts = loadContacts();
      generateVCF(contacts);
    }
    res.download(VCF_FILE, 'verified_contacts.vcf');
  } catch (err) {
    console.error('VCF download error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Catch-all for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
