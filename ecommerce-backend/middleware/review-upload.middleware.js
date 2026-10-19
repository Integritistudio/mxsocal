const multer = require("multer");
const sharp = require("sharp");
const maxBytes = 5 * 1024 * 1024;
const storage = {
  _handleFile(req, file, done) {
    const chunks = []; let finished = false;
    const complete = (error, value) => { if (!finished) { finished = true; done(error, value); } };
    file.stream.on("data", chunk => {
      req.reviewUploadBytes = (req.reviewUploadBytes || 0) + chunk.length;
      if (req.reviewUploadBytes >= maxBytes) { chunks.length = 0; complete(new multer.MulterError("LIMIT_FILE_SIZE")); }
      else if (!finished) chunks.push(chunk);
    });
    file.stream.on("error", error => complete(error));
    file.stream.on("end", () => { if (!finished) { const buffer = Buffer.concat(chunks); complete(null, { buffer, size: buffer.length }); } });
  },
  _removeFile(_req, file, done) { delete file.buffer; done(null); },
};
const upload = multer({ storage, limits: { files: 5, fileSize: maxBytes - 1, fields: 6, fieldSize: 10000, parts: 11 }, fileFilter: (_req, file, done) => {
  const expected = /\.jpe?g$/i.test(file.originalname) ? "image/jpeg" : /\.png$/i.test(file.originalname) ? "image/png" : null;
  if (!expected || file.mimetype !== expected) return done(new Error("Only JPG and PNG images are allowed."));
  done(null, true);
} }).array("images", 5);
exports.parseReview = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  upload(req, res, async error => {
    if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Images must total less than 5 MB." : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE" ? "Upload at most 5 JPG or PNG images." : "Invalid upload. Use at most 5 JPG or PNG images totaling less than 5 MB." });
    const files = req.files || [];
    if (files.reduce((sum, file) => sum + file.size, 0) >= maxBytes) return res.status(413).json({ message: "Images must total less than 5 MB." });
    try {
      req.reviewImages = [];
      // Decode and re-encode sequentially, strip metadata, reject disguised/animated files and decompression bombs.
      for (const file of files) {
        const image = sharp(file.buffer, { limitInputPixels: 20000000, failOn: "warning" });
        const meta = await image.metadata();
        const format = file.mimetype === "image/jpeg" ? "jpeg" : "png";
        if (meta.format !== format || (meta.pages || 1) !== 1) throw new Error("Invalid image");
        const resized = image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });
        const data = await (format === "jpeg" ? resized.jpeg({ quality: 85 }) : resized.png()).toBuffer();
        req.reviewImages.push({ data, contentType: file.mimetype });
      }
      if (req.reviewImages.reduce((sum, image) => sum + image.data.length, 0) >= maxBytes) return res.status(413).json({ message: "Processed images must total less than 5 MB. Please use smaller images." });
      req.body.ratings = JSON.parse(req.body.ratings || "{}");
      next();
    } catch { res.status(400).json({ message: "One or more images could not be read. Choose valid, non-animated JPG or PNG images under 20 megapixels." }); }
  });
};
// Limit public submissions before buffering or decoding files. Do not trust caller-supplied forwarding headers.
const attempts = new Map();
exports.reviewLimit = (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, until: now + 3600000 };
  if (entry.count >= 20 || (!attempts.has(key) && attempts.size >= 10000)) { res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ message: "Too many review attempts. Please try again later." }); }
  entry.count++; attempts.set(key, entry); next();
};
