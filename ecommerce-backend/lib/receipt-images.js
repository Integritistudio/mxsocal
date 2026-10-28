const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const publicRoot = path.resolve(process.env.RECEIPT_PUBLIC_DIR || path.join(__dirname, "../../ecommerce-frontend/public"));
function imagePath(source) {
  if (typeof source !== "string") return null;
  let url = source;
  if (/^https?:\/\//.test(source)) {
    try { const parsed = new URL(source); const site = new URL(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"); if (parsed.origin !== site.origin) return null; url = parsed.pathname; } catch { return null; }
  }
  if (url.startsWith("/images/")) {
    let name; try { name = decodeURIComponent(url); } catch { return null; }
    const target = path.resolve(publicRoot, name.slice(1));
    return target.startsWith(publicRoot + path.sep) ? target : null;
  }
  const upload = /^\/api\/(product|coach)-photo\/([a-f0-9-]{36}\.(?:jpg|png))$/.exec(url);
  return upload ? path.resolve(__dirname, `../uploads/${upload[1]}-photos`, upload[2]) : null;
}
exports.receiptImages = async items => {
  const images = new Map();
  for (const source of [...new Set(items.map(item => item.image).filter(Boolean))].slice(0, 32)) {
    const file = imagePath(source);
    if (!file) continue;
    try {
      if ((await fs.stat(file)).size > 8 * 1024 * 1024) continue;
      const content = await sharp(file, { limitInputPixels: 40000000 }).rotate().resize(240, 180, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
      images.set(source, { content, cid: `ride-photo-${images.size}@mxsocal`, filename: `ride-photo-${images.size}.png`, contentType: "image/png", contentDisposition: "inline" });
    } catch { /* A missing photo must not prevent receipt delivery. */ }
  }
  return images;
};
