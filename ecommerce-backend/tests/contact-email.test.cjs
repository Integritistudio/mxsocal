const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { contactEmail } = require('../lib/contact-email-template');
test('contact email includes escaped details, message and plain text', () => {
  const data = contactEmail({ source: 'contact', contact: { id: 'ref', name: '<script>alert(1)</script>', email: 'rider@example.com', phone: '123456789', topic: 'Bookings', message: 'First line\n<img src=x onerror=alert(1)>' } });
  assert.ok(data.html.includes('&lt;script&gt;')); assert.ok(!data.html.includes('<script>'));
  assert.ok(data.html.includes('<br>&lt;img')); assert.ok(data.text.includes('First line\n<img'));
  assert.ok(data.html.includes('mailto:rider%40example.com')); assert.ok(data.html.includes('123456789'));
});
test('footer email identifies source and dashboard location', () => {
  const data = contactEmail({ source: 'footer', contact: { id: 'ref', email: 'rider@example.com' } });
  assert.ok(data.subject.includes('signup')); assert.ok(data.html.includes('Email captures')); assert.ok(data.text.includes('rider@example.com')); assert.ok(!data.html.includes('undefined'));
});
function worker(fail = false) {
  const updates = [], deliveries = [];
  const job = { id: 'ref', source: 'footer', attempts: 0, update: async function (values) { updates.push(values); Object.assign(this, values); } };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/contact-email.js'), 'utf8'), { exports, process: { env: { ADMIN_EMAIL: 'admin@example.com' } }, console: { error() {} }, require: name => {
    if (name === 'sequelize') return require('sequelize');
    if (name.includes('config/database')) return { transaction: callback => callback({ LOCK: { UPDATE: 'UPDATE' } }) };
    if (name.includes('contact-email.model')) return { findAll: async () => [job] };
    if (name.includes('contact-message.model') || name.includes('footer-contact.model')) return { findByPk: async () => ({ id: 'ref', email: 'rider@example.com' }) };
    if (name.includes('contact-email-template')) return { contactEmail };
    if (name.includes('account-mail')) return { sendAccountMail: async data => { if (fail) throw new Error('offline'); deliveries.push(data); } };
    throw new Error(name);
  } });
  return { ...exports, updates, deliveries };
}
test('worker delivers to ADMIN_EMAIL and marks notification sent', async () => {
  const ctx = worker(); await ctx.deliver();
  assert.equal(ctx.deliveries[0].email, 'admin@example.com'); assert.ok(ctx.updates[0].lockedUntil); assert.ok(ctx.updates[1].sentAt); assert.equal(ctx.updates[1].lockedUntil, null);
});
test('mail failure schedules a durable retry without marking sent', async () => {
  const ctx = worker(true); await ctx.deliver();
  assert.equal(ctx.deliveries.length, 0); assert.ok(ctx.updates[1].nextAttemptAt > new Date()); assert.equal(ctx.updates[1].sentAt, undefined); assert.equal(ctx.updates[1].lockedUntil, null);
});
