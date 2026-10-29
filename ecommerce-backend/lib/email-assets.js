const fs = require("node:fs");
const path = require("node:path");
const assets = [
  { cid: "mxsocal-logo@mxsocal", filename: "logo.png", contentType: "image/png" },
  { cid: "mxsocal-ride@mxsocal", filename: "ride-hero.jpg", contentType: "image/jpeg" },
];
const cache = new Map();
// Embed trusted, backend-owned assets. Remote URLs and frontend deployment paths are never needed.
exports.emailAttachments = (html = "", attachments = []) => {
  const result = [...attachments];
  for (const asset of assets) {
    if (!html.includes(`cid:${asset.cid}`) || result.some(item => item.cid === asset.cid)) continue;
    if (!cache.has(asset.filename)) cache.set(asset.filename, fs.readFileSync(path.join(__dirname, "../assets/email", asset.filename)));
    result.push({ ...asset, content: cache.get(asset.filename), contentDisposition: "inline" });
  }
  return result;
};
