const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const express = require("express"), request = require("supertest");
const { trackInput } = require("../lib/track-input");
const id = "10000000-0000-4000-8000-000000000001";
const input = () => ({ name: "New Raceway", slug: "", city: "Perris", address: "123 Track Road", tagline: "Find your next ride", description: "A new riding destination.", website: "https://example.com", images: ["/api/product-photo/cover.jpg"], layouts: ["Main track", "Vet track"], features: ["All skill levels"], imageSource: "Venue photography", displayOrder: 2 });
function fixture() {
  const rows = new Map(), calendars = [{ trackId: id, month: "2026-10", days: {} }];
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const track = {
    findAll: async () => [...rows.values()], findByPk: async key => rows.get(key),
    findOne: async options => [...rows.values()].find(row => row.slug === options.where.slug),
    create: async data => {
      const row = { ...data, id, update: async function (values) { Object.assign(this, values); return this; }, destroy: async () => rows.delete(id) };
      rows.set(id, row); return row;
    },
  };
  const availability = { findAll: async options => calendars.filter(row => row.trackId === options.where.trackId), destroy: async options => { for (let index = calendars.length - 1; index >= 0; index--) if (calendars[index].trackId === options.where.trackId) calendars.splice(index, 1); } };
  const dependencies = name => {
    if (name.includes("models/track.model")) return track;
    if (name.includes("track-availability.model")) return availability;
    if (name.includes("config/database")) return { transaction: async callback => callback(transaction) };
    if (name.includes("lib/track-input")) return require("../lib/track-input");
    if (name.includes("lib/track-availability")) return require("../lib/track-availability");
    throw Error(name);
  };
  function controller(file) { const module = { exports: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, `../controllers/${file}`), "utf8"), { module, exports: module.exports, Date, require: dependencies }); return module.exports; }
  const admin = controller("track-admin.controller.js"), publicController = controller("track.controller.js");
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../routes/track.route.js"), "utf8"), { module, exports: module.exports, require: name => {
    if (name === "express") return express;
    if (name.includes("track-admin.controller")) return admin;
    if (name.includes("track.controller")) return publicController;
    if (name.includes("auth.middleware")) return (req, res, next) => { if (!req.headers["x-role"]) return res.sendStatus(401); req.user = { role: req.headers["x-role"], permissions: req.headers["x-permission"] ? [req.headers["x-permission"]] : [] }; next(); };
    if (name.includes("account-access.middleware")) return require("../middleware/account-access.middleware");
    if (name.includes("review-upload.middleware")) return { parseReview: (_req, _res, next) => next() };
    if (name.includes("product-photo.controller")) return { upload: (_req, res) => res.status(201).json({ images: ["/api/product-photo/image.jpg"] }) };
    throw Error(name);
  } });
  const app = express(); app.use(express.json()); app.use("/tracks", module.exports);
  return { app, rows, calendars };
}
test("track input rejects unsafe URLs, missing photos, invalid arrays, and invalid display order", () => {
  for (const overrides of [{ images: [] }, { images: ["javascript:alert(1)"] }, { images: ["//evil.example/image.jpg"] }, { website: "javascript:alert(1)" }, { features: ["1", "2", "3", "4"] }, { layouts: [3] }, { displayOrder: -1 }, { name: "" }, { address: "" }]) assert.ok(trackInput({ ...input(), ...overrides }).error);
  const result = trackInput({ ...input(), id: "injected", name: " New Raceway " });
  assert.equal(result.data.slug, "new-raceway"); assert.equal(result.data.name, "New Raceway"); assert.ok(!Object.hasOwn(result.data, "id"));
});
test("management and photo uploads require authentication and track-management permission", async () => {
  const { app } = fixture();
  await request(app).get("/tracks/admin").expect(401);
  for (const role of ["user", "manager"]) {
    await request(app).post("/tracks/admin").set("x-role", role).send(input()).expect(403);
    await request(app).post("/tracks/admin/photo").set("x-role", role).expect(403);
  }
  await request(app).get("/tracks/admin").set("x-role", "manager").set("x-permission", "availability:manage").expect(200);
  await request(app).post("/tracks/admin/photo").set("x-role", "admin").expect(201);
});
test("new tracks are public immediately and edits update the public content and URL", async () => {
  const { app } = fixture();
  const created = await request(app).post("/tracks/admin").set("x-role", "admin").send(input()).expect(201);
  assert.equal(created.body.track.slug, "new-raceway");
  const listed = await request(app).get("/tracks").expect(200); assert.equal(listed.body.tracks[0].id, id);
  const detail = await request(app).get("/tracks/new-raceway").expect(200); assert.equal(detail.body.track.images[0], input().images[0]);
  const admin = await request(app).get(`/tracks/admin/${id}`).set("x-role", "admin").expect(200); assert.equal(admin.body.availabilityMonths.length, 2);
  await request(app).put(`/tracks/admin/${id}`).set("x-role", "admin").send({ ...input(), slug: "updated-raceway", description: "Updated experience" }).expect(200);
  assert.equal((await request(app).get("/tracks/updated-raceway").expect(200)).body.track.description, "Updated experience");
  await request(app).get("/tracks/new-raceway").expect(404);
});
test("removing a track removes its calendars and public listing", async () => {
  const { app, calendars } = fixture();
  await request(app).post("/tracks/admin").set("x-role", "admin").send(input()).expect(201);
  await request(app).delete(`/tracks/admin/${id}`).set("x-role", "admin").expect(204);
  assert.equal(calendars.length, 0); assert.equal((await request(app).get("/tracks").expect(200)).body.tracks.length, 0);
  await request(app).get("/tracks/new-raceway").expect(404);
  await request(app).delete(`/tracks/admin/${id}`).set("x-role", "admin").expect(404);
});
test("invalid track saves fail without creating a record", async () => {
  const { app, rows } = fixture();
  await request(app).post("/tracks/admin").set("x-role", "admin").send({ ...input(), images: [] }).expect(400);
  await request(app).put("/tracks/admin/bad-id").set("x-role", "admin").send(input()).expect(404);
  assert.equal(rows.size, 0);
});
