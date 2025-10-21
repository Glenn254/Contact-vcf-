import express from "express";
import fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const approvedFile = "./approvedContacts.json";
const rejectedFile = "./rejectedContacts.json";

// 🟢 Approve a contact
app.post("/approve", (req, res) => {
  const contact = req.body;
  let approved = [];
  if (fs.existsSync(approvedFile)) {
    approved = JSON.parse(fs.readFileSync(approvedFile));
  }

  // remove if exists in rejected
  let rejected = [];
  if (fs.existsSync(rejectedFile)) {
    rejected = JSON.parse(fs.readFileSync(rejectedFile)).filter(
      (c) => c.number !== contact.number
    );
    fs.writeFileSync(rejectedFile, JSON.stringify(rejected, null, 2));
  }

  // avoid duplicates
  if (!approved.find((c) => c.number === contact.number)) {
    approved.push(contact);
  }

  fs.writeFileSync(approvedFile, JSON.stringify(approved, null, 2));
  res.json({ success: true, message: "Contact approved" });
});

// 🔴 Reject a contact
app.post("/reject", (req, res) => {
  const contact = req.body;
  let rejected = [];
  if (fs.existsSync(rejectedFile)) {
    rejected = JSON.parse(fs.readFileSync(rejectedFile));
  }

  // remove if exists in approved
  let approved = [];
  if (fs.existsSync(approvedFile)) {
    approved = JSON.parse(fs.readFileSync(approvedFile)).filter(
      (c) => c.number !== contact.number
    );
    fs.writeFileSync(approvedFile, JSON.stringify(approved, null, 2));
  }

  if (!rejected.find((c) => c.number === contact.number)) {
    rejected.push(contact);
  }

  fs.writeFileSync(rejectedFile, JSON.stringify(rejected, null, 2));
  res.json({ success: true, message: "Contact rejected" });
});

// 🧾 Get all approved & rejected
app.get("/contacts", (req, res) => {
  const approved = fs.existsSync(approvedFile)
    ? JSON.parse(fs.readFileSync(approvedFile))
    : [];
  const rejected = fs.existsSync(rejectedFile)
    ? JSON.parse(fs.readFileSync(rejectedFile))
    : [];
  res.json({ approved, rejected });
});

// 📁 Download Approved Contacts as VCF
app.get("/download-vcf", (req, res) => {
  const approved = fs.existsSync(approvedFile)
    ? JSON.parse(fs.readFileSync(approvedFile))
    : [];

  let vcfContent = approved
    .map(
      (c) => `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL:${c.number}
END:VCARD`
    )
    .join("\n");

  res.setHeader("Content-Disposition", "attachment; filename=approved_contacts.vcf");
  res.setHeader("Content-Type", "text/vcard");
  res.send(vcfContent);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
