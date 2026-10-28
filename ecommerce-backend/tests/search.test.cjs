const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const sequelize = require('sequelize');
function setup(fail = false) {
  const calls = [];
  const models = ['bike', 'coach', 'track', 'blog'].map(kind => ({ findAndCountAll: async options => {
    calls.push({ kind, options });
    if (fail) throw new Error('offline');
    return { count: 10, rows: [{ id: kind, slug: kind, name: 'Yamaha', title: 'Yamaha guide', firstName: 'Jane', lastName: 'Rider', images: ['/bike.jpg'], profileImage: '/coach.jpg', coverImage: '/blog.jpg' }] };
  } }));
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/search.controller.js'), 'utf8'), { exports, require: name => {
    if (name === 'sequelize') return sequelize;
    if (name.includes('product.model')) return { Product: models[0] };
    if (name.includes('coach.model')) return models[1];
    if (name.includes('track.model')) return models[2];
    if (name.includes('story.model')) return models[3];
    throw new Error(name);
  } });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  return { search: exports.search, res, calls };
}
test('searches only public titles and full coach names with literal wildcard characters', async () => {
  const { search, res, calls } = setup();
  await search({ query: { q: '  yam%_  ' } }, res);
  assert.equal(res.code, 200);
  assert.equal(calls.length, 4);
  const bike = calls[0].options.where;
  assert.equal(bike.category, 'bike'); assert.equal(bike.available, true); assert.equal(bike.status, 'available');
  assert.equal(bike.name[sequelize.Op.iLike], '%yam\\%\\_%');
  assert.equal(bike.description, undefined);
  assert.equal(calls[1].options.where.attribute.fn, 'concat');
  assert.equal(calls[1].options.attributes.includes('email'), false);
  assert.equal(calls[2].options.where.name[sequelize.Op.iLike], '%yam\\%\\_%');
  assert.equal(calls[3].options.where.status, 'published');
  assert.ok(calls[3].options.where.publishedAt[sequelize.Op.lte]);
  assert.equal(calls[3].options.where.excerpt, undefined);
  assert.equal(res.body.groups[1].results[0].title, 'Jane Rider');
  assert.equal(res.body.groups[3].results[0].href, '/stories/blog');
  assert.equal(res.body.groups[0].results[0].image, '/bike.jpg');
  assert.equal(res.body.groups[1].results[0].image, '/coach.jpg');
  assert.equal(res.body.groups[2].results[0].image, null);
  assert.equal(res.body.groups[3].results[0].image, '/blog.jpg');
  assert.equal(res.body.hasMore, true);
});
test('paginates all categories', async () => {
  const { search, res, calls } = setup(); await search({ query: { q: 'ride', page: '2' } }, res);
  assert.ok(calls.every(call => call.options.offset === 8 && call.options.limit === 8));
});
test('empty and invalid searches do not query the database', async () => {
  for (const [query, status] of [[{ q: '  ' }, 200], [{ q: ['ride'] }, 400], [{ q: 'x'.repeat(101) }, 400], [{ q: 'ride', page: '0' }, 400]]) {
    const { search, res, calls } = setup(); await search({ query }, res); assert.equal(res.code, status); assert.equal(calls.length, 0);
  }
});
test('database failure returns a retryable error', async () => {
  const { search, res } = setup(true); await search({ query: { q: 'ride' } }, res); assert.equal(res.code, 503);
});
