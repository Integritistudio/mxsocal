const slugify = require("../helpers/product-slug");
const uuid = value => typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const text = (value, max) => typeof value === "string" && value.trim().length <= max;
const website = value => { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } };
const image = value => typeof value === "string" && value.length <= 2000 && (/^\/(?!\/)[^\\\s]*$/.test(value) || website(value));
function trackInput(body) {
  if (!body || !text(body.name, 200) || !body.name.trim() || !text(body.city, 255) || !body.city.trim() || !text(body.address, 255) || !body.address.trim()) return { error: "Enter the track name, city, and full address." };
  if (body.slug != null && (!text(body.slug, 180) || (body.slug && !/^[a-z0-9-]+$/.test(body.slug)))) return { error: "Use lowercase letters, numbers, and hyphens for the URL name." };
  const slug = slugify(body.slug || body.name).slice(0, 180);
  if (!slug) return { error: "Enter a valid URL name." };
  if (!text(body.tagline, 500) || !text(body.description, 15000) || !body.description.trim()) return { error: "Add a description and keep the tagline under 500 characters." };
  if (body.website && (!text(body.website, 2000) || !website(body.website))) return { error: "Use a valid HTTPS website URL." };
  if (!Array.isArray(body.images) || !body.images.length || body.images.length > 20 || !body.images.every(image)) return { error: "Add between 1 and 20 valid track photos." };
  for (const [key, max] of [["layouts", 12], ["features", 3]]) if (!Array.isArray(body[key]) || body[key].length > max || body[key].some(value => !text(value, 100) || !value.trim())) return { error: `Use up to ${max} short ${key}, one per line.` };
  if (body.imageSource != null && !text(body.imageSource, 255)) return { error: "Keep photo credits under 255 characters." };
  if (!Number.isInteger(body.displayOrder) || body.displayOrder < 0 || body.displayOrder > 10000) return { error: "Display order must be a whole number from 0 to 10,000." };
  return { data: { name: body.name.trim(), slug, city: body.city.trim(), address: body.address.trim(), tagline: body.tagline.trim(), description: body.description.trim(), website: body.website?.trim() || "", images: body.images, layouts: body.layouts.map(value => value.trim()), features: body.features.map(value => value.trim()), imageSource: body.imageSource?.trim() || "", displayOrder: body.displayOrder } };
}
module.exports = { uuid, trackInput };
