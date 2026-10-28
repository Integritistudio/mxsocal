const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const sequelize = require("sequelize");
function setup(fail = false) {
  const records = new Map(); const calls = []; const logs = [];
  const exports = {};
  const model = {
    async findOrCreate(options) { calls.push(options); if (fail) throw Object.assign(new Error(), { name: "DatabaseError" }); const created = !records.has(options.where.email); records.set(options.where.email, options.defaults); return [{ id: "test-id" }, created]; },
    async findAndCountAll(options) { calls.push(options); if (fail) throw new Error(); return { rows: [], count: 0 }; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../controllers/footer-contact.controller.js"), "utf8"), { exports, console: { error: (...args) => logs.push(args) }, require: name => name === "sequelize" ? sequelize : name.includes("config/database") ? { transaction: callback => callback({}) } : name.includes("contact-email") ? { queue: async () => {} } : model });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, set() {} };
  return { ...exports, res, records, calls, logs };
}
test("normalizes addresses and deduplicates with the same acknowledgement", async () => {
  const ctx = setup();
  await ctx.submit({ body: { email: " RIDER@Example.com " } }, ctx.res);
  const first = ctx.res.body.message;
  await ctx.submit({ body: { email: "rider@example.com" } }, ctx.res);
  assert.equal(ctx.res.code, 202); assert.equal(ctx.res.body.message, first);
  assert.equal(ctx.records.size, 1); assert.ok(ctx.records.has("rider@example.com"));
});
test("storage errors return the same positive response and log no email", async () => {
  const ctx = setup(true); await ctx.submit({ body: { email: "rider@example.com" } }, ctx.res);
  assert.equal(ctx.res.code, 202); assert.equal(ctx.res.body.message, "Thanks for your interest in MXSoCal!");
  assert.equal(ctx.logs.length, 1); assert.ok(!JSON.stringify(ctx.logs).includes("rider@example.com"));
});
test("invalid and honeypot submissions are acknowledged without storage", async () => {
  for (const body of [undefined, { email: [] }, { email: "bad" }, { email: "a".repeat(255) + "@example.com" }, { email: "rider@example.com", website: "bot" }]) {
    const ctx = setup(); await ctx.submit({ body }, ctx.res); assert.equal(ctx.res.code, 202); assert.equal(ctx.calls.length, 0);
  }
});
test("dashboard listing validates filters and paginates", async () => {
  const ctx = setup(); await ctx.list({ query: { q: "a%_", page: "2" } }, ctx.res);
  assert.equal(ctx.calls[0].offset, 25); assert.equal(ctx.calls[0].limit, 25);
  assert.equal(ctx.calls[0].where.email[sequelize.Op.iLike], "%a\\%\\_%");
  assert.equal(ctx.res.body.total, 0);
  await ctx.list({ query: { page: "0" } }, ctx.res); assert.equal(ctx.res.code, 400);
});
test("dashboard storage failures remain visible to admins", async () => {
  const ctx = setup(true); await ctx.list({ query: {} }, ctx.res); assert.equal(ctx.res.code, 503);
});
test("dashboard route requires authentication and admin authorization", () => {
  const routes = []; const auth = () => {}; const admin = () => {};
  const router = { post: (...args) => routes.push(['POST', ...args]), get: (...args) => routes.push(['GET', ...args]) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/footer-contact.route.js'), 'utf8'), { module: { exports: {} }, Map, Date, require: name => {
    if (name === 'express') return { Router: () => router };
    if (name.includes('controller')) return { submit() {}, list() {} };
    if (name.includes('auth.middleware')) return auth;
    if (name.includes('account-access')) return { admin };
    return require(name);
  } });
  const route = routes.find(route => route[0] === 'GET');
  assert.equal(route[1], '/admin'); assert.equal(route[2], auth); assert.equal(route[3], admin);
});
