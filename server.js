import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd())));

let contacts = [];

app.post("/api/upload", (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !phone) return res.json({ success: false });
  contacts.push({ name, phone });
  res.json({ success: true });
});

app.get("/api/generate-vcf", (req, res) => {
  const data = contacts.map(c =>
    `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL:${c.phone}\nEND:VCARD`
  ).join("\n");
  res.setHeader("Content-Type","text/vcard");
  res.setHeader("Content-Disposition","attachment; filename=contacts.vcf");
  res.send(data);
});

app.listen(process.env.PORT || 3000);