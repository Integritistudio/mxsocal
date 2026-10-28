const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { Op } = require('sequelize');
function setup(fail = false) {
  const calls = []; const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/contact-admin.controller.js'), 'utf8'), { exports, require: name => name === 'sequelize' ? require('sequelize') : { findAndCountAll: async options => { calls.push(options); if (fail) throw new Error(); return { rows: [{ id: 'message', message: '<script>plain text</script>' }], count: 26 }; } } });
  const res = { code: 200, status(code) { this.code = code; return this; }, set(key, value) { this[key] = value; }, json(body) { this.body = body; return this; } };
  return { ...exports, calls, res };
}
test('admin listing returns full messages, paginates, escapes search and disables caching', async () => {
  const ctx = setup(); await ctx.list({ query: { q: 'a%_', page: '2' } }, ctx.res);
  assert.equal(ctx.res.code, 200); assert.equal(ctx.calls[0].offset, 25); assert.equal(ctx.calls[0].limit, 25);
  assert.equal(ctx.calls[0].where[Op.or][0].name[Op.iLike], '%a\\%\\_%');
  assert.equal(ctx.res['Cache-Control'], 'no-store'); assert.equal(ctx.res.body.contacts[0].message, '<script>plain text</script>');
  assert.equal(ctx.res.body.hasMore, false);
});
test('invalid listing filters do not reach storage', async () => {
  for (const query of [{ page: '0' }, { q: ['email'] }, { q: 'a'.repeat(255) }]) {
    const ctx = setup(); await ctx.list({ query }, ctx.res); assert.equal(ctx.res.code, 400); assert.equal(ctx.calls.length, 0);
  }
});
test('listing failure is visible to admin', async () => {
  const ctx = setup(true); await ctx.list({ query: {} }, ctx.res); assert.equal(ctx.res.code, 503);
});
test('contact message listing requires authentication and admin role', () => {
  const routes = []; const auth = () => {}; const admin = () => {};
  const router = { post: (...args) => routes.push(['POST', ...args]), get: (...args) => routes.push(['GET', ...args]) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/contact.route.js'), 'utf8'), { module: { exports: {} }, require: name => {
    if (name === 'express') return { Router: () => router };
    if (name.includes('auth.middleware')) return auth;
    if (name.includes('account-access')) return { admin };
    return {};
  } });
  const route = routes.find(route => route[0] === 'GET');
  assert.equal(route[1], '/admin'); assert.equal(route[2], auth); assert.equal(route[3], admin);
});
