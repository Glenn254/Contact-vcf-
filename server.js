const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/vcfadmin', express.static(path.join(__dirname, 'vcfadmin')));

// Path to contacts file
const contactsFile = path.join(__dirname, 'contacts.json');

// Helper to read contacts
function readContacts() {
  if (!fs.existsSync(contactsFile)) return [];
  const data = fs.readFileSync(contactsFile);
  return JSON.parse(data);
}

// Helper to save contacts
function saveContacts(contacts) {
  fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));
}

// Route to receive contact submissions
app.post('/submit', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).send('Missing name or phone number');
  }

  const contacts = readContacts();
  contacts.push({ name, phone, approved: false });
  saveContacts(contacts);

  res.send('Your contact has been submitted. Text the admin to be approved in the VCF file.');
});

// Admin API — get all contacts
app.get('/api/contacts', (req, res) => {
  const contacts = readContacts();
  res.json(contacts);
});

// Admin API — approve or reject contact
app.post('/api/update', (req, res) => {
  const { index, action } = req.body;
  const contacts = readContacts();

  if (contacts[index]) {
    if (action === 'approve') contacts[index].approved = true;
    if (action === 'reject') contacts.splice(index, 1);
    saveContacts(contacts);
  }

  res.json({ success: true, contacts });
});

// Generate VCF file (when admin decides)
app.get('/generate-vcf', (req, res) => {
  const contacts = readContacts().filter(c => c.approved);
  let vcfData = '';

  contacts.forEach(c => {
    vcfData += `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL:${c.phone}\nEND:VCARD\n`;
  });

  res.header('Content-Type', 'text/vcard');
  res.attachment('contacts.vcf');
  res.send(vcfData);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
