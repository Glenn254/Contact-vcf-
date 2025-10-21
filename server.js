const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 💎 Settings
const EMOJI_PREFIX = "💎";

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

let contacts = [];

// Serve upload form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Country code auto-detection
function detectCountryCode(number) {
  const clean = number.replace(/\D/g, ""); // remove non-digits

  // If user already used a country code with +, skip
  if (number.startsWith("+")) return number;

  // Auto-detect based on known prefixes
  if (clean.startsWith("255")) return `+${clean}`; // Tanzania
  if (clean.startsWith("254")) return `+${clean}`; // Kenya
  if (clean.startsWith("256")) return `+${clean}`; // Uganda
  if (clean.startsWith("234")) return `+${clean}`; // Nigeria

  // Local formats (Kenya default)
  if (clean.startsWith("0")) {
    const local = clean.slice(1);
    return `+254${local}`;
  }

  if (clean.length === 9 && clean.startsWith("7")) {
    return `+254${clean}`; // assume Kenya if just 7xxxxxxx
  }

  // fallback: add +254 by default
  return `+254${clean}`;
}

// Handle uploads
app.post("/upload", (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) return res.status(400).send("Name and phone required");

  const formattedNumber = detectCountryCode(phone.trim());
  const formattedName = `${EMOJI_PREFIX} ${name.trim()}`;

  contacts.push({ name: formattedName, phone: formattedNumber });

  res.send("✅ Contact uploaded successfully!");
});

// Generate downloadable VCF
app.get("/download", (req, res) => {
  if (contacts.length === 0) {
    return res.status(400).send("No contacts available for download.");
  }

  let vcfContent = "";

  contacts.forEach((contact) => {
    vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nTEL;TYPE=CELL:${contact.phone}\nEND:VCARD\n`;
  });

  const filePath = path.join(__dirname, "contacts.vcf");
  fs.writeFileSync(filePath, vcfContent);

  res.download(filePath, "contacts.vcf", (err) => {
    if (err) console.error(err);
  });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
