const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");
const sharp = require("sharp");
const sequelize = require("../config/database");
sequelize.options.logging = false;
const { Product } = require("../models/product.model");
const Review = require("../models/product-review.model");
const Image = require("../models/review-image.model");
const User = require("../models/user.model");
const { generateToken } = require("../helpers/jwt");
const app = express(); app.use(express.json()); app.use("/products", require("../routes/product.route"));
(async () => {
  const product = await Product.create({ name: "Review Upload Verification", slug: `upload-check-${Date.now()}`, category: "accessory", available: true, status: "available" });
  const customer = await User.create({ name: "Upload Test", email: `upload-test-${Date.now()}@example.com`, role: "user", password: "Upload-Test-Password-123!", emailVerifiedAt: new Date() });
  const customerToken = generateToken(customer.id, "user", customer.tokenVersion);
  try {
    const admin = await User.findOne({ where: { role: "admin" } }); assert(admin);
    const token = generateToken(admin.id, "admin", admin.tokenVersion);
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).png().toBuffer();
    const jpg = await sharp(png).jpeg().toBuffer();
    const fields = { authorName: "Upload Tester", email: "upload@example.com", title: "Image upload check", comment: "A temporary review used to check image upload security.", ratings: Object.fromEntries(["performance", "handling", "comfort", "condition", "rental", "value"].map(key => [key, 5])), images: [] };
    function post() { return request(app).post(`/products/${product.id}/reviews`).set("Authorization", `Bearer ${customerToken}`).field("authorName", fields.authorName).field("email", fields.email).field("title", fields.title).field("comment", fields.comment).field("ratings", JSON.stringify(fields.ratings)); }
    await post().attach("images", Buffer.from("<svg onload='alert(1)'/>"), { filename: "fake.jpg", contentType: "image/jpeg" }).expect(400);
    await post().attach("images", png, { filename: "bad.svg", contentType: "image/png" }).expect(400);
    let tooMany = post(); for (let i = 0; i < 6; i++) tooMany = tooMany.attach("images", png, { filename: `${i}.png`, contentType: "image/png" }); await tooMany.expect(400);
    await post().attach("images", Buffer.alloc(3 * 1024 * 1024), { filename: "one.png", contentType: "image/png" }).attach("images", Buffer.alloc(3 * 1024 * 1024), { filename: "two.png", contentType: "image/png" }).expect(413);
    await post().attach("images", Buffer.alloc(5 * 1024 * 1024), { filename: "exact.png", contentType: "image/png" }).expect(413);
    let valid = post(); for (let i = 0; i < 5; i++) valid = valid.attach("images", i % 2 ? jpg : png, { filename: `${i}.${i % 2 ? "jpg" : "png"}`, contentType: i % 2 ? "image/jpeg" : "image/png" }); await valid.expect(201);
    const review = await Review.findOne({ where: { productId: product.id } }); assert.equal(review.status, "pending"); assert.equal(review.images.length, 5);
    const image = await Image.findOne({ where: { reviewId: review.id } });
    const url = `/products/review-images/${image.id}`;
    await request(app).get(url).expect(404);
    await request(app).get(url).set("Authorization", `Bearer ${token}`).expect(200).expect("X-Content-Type-Options", "nosniff");
    await request(app).put(`/products/reviews/admin/${review.id}`).set("Authorization", `Bearer ${token}`).send({ ...fields, productId: product.id, images: review.images, status: "approved" }).expect(200);
    await request(app).get(url).expect(200).expect("Cache-Control", "no-store");
    await request(app).put(`/products/reviews/admin/${review.id}`).set("Authorization", `Bearer ${token}`).send({ ...fields, productId: product.id, images: review.images, status: "rejected" }).expect(200);
    await request(app).get(url).expect(404);
    await request(app).delete(`/products/reviews/admin/${review.id}`).set("Authorization", `Bearer ${token}`).expect(204);
    assert.equal(await Image.count({ where: { reviewId: review.id } }), 0);
    let rateLimited = false; for (let i = 0; i < 21; i++) { const response = await request(app).post(`/products/${product.id}/reviews`).set("Authorization", `Bearer ${customerToken}`).send({}); if (response.status === 429) { rateLimited = true; break; } } assert(rateLimited);
    console.log("Passed: 5 valid JPG/PNG uploads, forged image rejection, extension checks, file count and combined size limits, private pending images, admin inspection, approval/rejection access, cascade cleanup, and rate limiting.");
  } finally { await Review.destroy({ where: { productId: product.id } }); await product.destroy(); await customer.destroy(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
