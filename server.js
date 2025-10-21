// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

app.use(cors());
app.use(bodyParser.json());

// Serve root static (index.html) and admin folder
app.use(express.static(path.join(__dirname)));
app.use('/vcfadmin', express.static(path.join(__dirname, 'vcfadmin')));

// Ensure contacts.json exists
function ensureContactsFile() {
  if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]', 'utf8');
}
ensureContactsFile();

function readContacts() {
  ensureContactsFile();
  try {
    const raw = fs.readFileSync(CONTACTS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}
function writeContacts(list) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// normalize phone: remove spaces/dashes, ensure +country
function normPhone(phoneRaw) {
  const p = String(phoneRaw || '').replace(/[\s\-\(\)]/g,'');
  if (p.startsWith('+')) return p;
  // if user entered starting with 0 -> assume Kenya +254
  if (p.startsWith('0')) return '+254' + p.replace(/^0+/, '');
  // if starts with digits and looks like country (e.g., 2547...) -> add +
  if (/^(254|255|256|250|257|260)\d+$/.test(p)) return '+' + p;
  // fallback: add +254
  if (p.length >= 7) return '+254' + p;
  return p;
}

// Create unique id
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

/*
Contact structure:
{
  id: string,
  name: "💎 Name",
  phone: "+2547....",
  status: "Pending" | "Approved" | "Rejected",
  createdAt: ISOString
}
*/

// --- CLIENT submits contact
app.post('/api/submit', (req, res) => {
  const { name = '', phone = '' } = req.body;
  if (!phone || String(phone).trim() === '') {
    return res.status(400).json({ success:false, message: 'Phone is required' });
  }

  const normalizedPhone = normPhone(phone);
  const contacts = readContacts();

  // Prevent duplicates by phone
  if (contacts.find(c => c.phone === normalizedPhone)) {
    const existing = contacts.find(c => c.phone === normalizedPhone);
    return res.status(409).json({ success:false, message:'Already submitted', contact: existing });
  }

  const emoji = '💎';
  const trimmed = String(name || '').trim() || 'Anonymous';
  const displayName = trimmed.startsWith(emoji) ? trimmed : `${emoji} ${trimmed}`;

  const newContact = {
    id: makeId(),
    name: displayName,
    phone: normalizedPhone,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  contacts.push(newContact);
  writeContacts(contacts);

  return res.json({ success:true, message:'Submitted successfully', contact: newContact });
});

// --- CLIENT checks their status (by phone)
app.get('/api/status', (req, res) => {
  const phone = req.query.phone || '';
  if (!phone) return res.json({ found:false });
  const normalized = normPhone(phone);
  const contacts = readContacts();
  const found = contacts.find(c => c.phone === normalized);
  if (!found) return res.json({ found:false });
  return res.json({ found:true, contact: found });
});

// --- ADMIN: get all contacts
app.get('/api/contacts', (req, res) => {
  const contacts = readContacts();
  // sort oldest -> newest or vice versa; show newest first
  contacts.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success:true, contacts });
});

// --- ADMIN: approve by id
app.post('/api/contacts/:id/approve', (req, res) => {
  const id = req.params.id;
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success:false, message:'Not found' });
  contacts[idx].status = 'Approved';
  writeContacts(contacts);
  res.json({ success:true, contact: contacts[idx] });
});

// --- ADMIN: reject by id
app.post('/api/contacts/:id/reject', (req, res) => {
  const id = req.params.id;
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success:false, message:'Not found' });
  contacts[idx].status = 'Rejected';
  writeContacts(contacts);
  res.json({ success:true, contact: contacts[idx] });
});

// --- ADMIN: get approved contacts as VCF file for download
app.get('/api/download/vcf', (req, res) => {
  const contacts = readContacts();
  const approved = contacts.filter(c => c.status === 'Approved');
  // build vcard
  const lines = [];
  approved.forEach(c => {
    // Name: remove emoji before FN? But per your request include emoji before name.
    const fn = c.name;
    // Format TEL: use international tel
    const tel = c.phone;
    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');
    lines.push(`FN:${fn}`);
    lines.push(`TEL;TYPE=CELL:${tel}`);
    lines.push('END:VCARD');
  });
  const vcfContent = lines.join('\r\n');
  res.setHeader('Content-Disposition', 'attachment; filename="approved_contacts.vcf"');
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.send(vcfContent);
});

// health
app.get('/health', (req,res)=> res.send('ok'));

// fallback: serve client index for root (static middleware already handles)
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
