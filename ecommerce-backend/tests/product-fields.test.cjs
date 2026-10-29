const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Sequelize } = require("sequelize");
// Define the real models against an isolated instance; no database connection is opened.
const db = new Sequelize("postgres://test:test@localhost:5432/test", { logging: false });
const moduleStub = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../models/product.model.js"), "utf8"), {
  module: moduleStub, exports: moduleStub.exports,
  require: name => name === "../config/database" ? db : name === "../helpers/product-slug" ? require("../helpers/product-slug") : require(name),
});
const { Product } = moduleStub.exports;

test("product schema and responses omit retired pricing and location fields", () => {
  const product = Product.build({ name: "Daily rental", category: "bike", pricePerDay: "150.00", pricePerHour: "10", pricePerWeek: "500", deposit: "100", location: "Old location", attributes: { details: { subtitle: "Ride ready", address: "Old address", mapEmbedUrl: "https://maps.google.com/maps" } } });
  const data = product.toJSON();
  for (const key of ["pricePerHour", "pricePerWeek", "deposit", "location"]) {
    assert.ok(!Object.hasOwn(Product.rawAttributes, key));
    assert.ok(!Object.hasOwn(data, key));
  }
  assert.equal(data.pricePerDay, "150.00");
  assert.equal(data.attributes.details.subtitle, "Ride ready");
  assert.ok(!Object.hasOwn(data.attributes.details, "address"));
  assert.ok(!Object.hasOwn(data.attributes.details, "mapEmbedUrl"));
});
test("product validation strips legacy map metadata before persistence", async () => {
  const product = Product.build({ name: "Daily rental", category: "bike", pricePerDay: "150.00", attributes: { details: { videoUrl: "https://example.com/video", address: "Old address", mapEmbedUrl: "https://maps.google.com/maps" } } });
  await product.validate();
  assert.equal(product.slug, "daily-rental");
  assert.equal(product.attributes.details.videoUrl, "https://example.com/video");
  assert.ok(!Object.hasOwn(product.attributes.details, "address"));
  assert.ok(!Object.hasOwn(product.attributes.details, "mapEmbedUrl"));
});
