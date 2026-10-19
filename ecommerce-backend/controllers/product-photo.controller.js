const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const directory = path.resolve(__dirname, "../uploads/product-photos");
exports.upload = async (req, res) => {
  if (req.reviewImages?.length !== 1) return res.status(400).json({ message: "Choose one JPG or PNG product photo under 5 MB." });
  try {
    const image = req.reviewImages[0];
    const filename = `${randomUUID()}.${image.contentType === "image/png" ? "png" : "jpg"}`;
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), image.data, { flag: "wx" });
    res.status(201).json({ images: [`/api/product-photo/${filename}`] });
  } catch { res.status(503).json({ message: "Unable to save this photo. Please try again." }); }
};
exports.image = (req, res) => {
  if (!/^[a-f0-9-]{36}\.(jpg|png)$/.test(req.params.filename)) return res.sendStatus(404);
  res.set({ "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
  res.sendFile(req.params.filename, { root: directory }, error => { if (error && !res.headersSent) res.sendStatus(404); });
};
