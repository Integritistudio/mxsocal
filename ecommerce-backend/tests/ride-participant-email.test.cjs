const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
function worker() {
  const request = { id: "ride", status: "pending_payment" };
  const participant = { id: "rider", requestId: "ride", riderIndex: 1, email: "buddy@example.com", paidAt: null, async update(values) { Object.assign(this, values); } };
  const jobs = [], deliveries = [], transaction = { LOCK: { UPDATE: "UPDATE" } };
  const model = {
    findOrCreate: async options => {
      let job = jobs.find(j => j.kind === options.where.kind && j.riderIndex === options.where.riderIndex);
      if (!job) { job = { ...options.where, ...options.defaults, sentAt: null, attempts: 0, lockedUntil: null, async update(values) { Object.assign(this, values); }, async reload() {} }; jobs.push(job); }
      return [job];
    },
    findAll: async () => jobs.filter(j => !j.sentAt),
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/ride-request-email.js"), "utf8"), { module, exports: module.exports, console, process: { env: {} }, require: name => {
    if (name === "sequelize") return require("sequelize");
    if (name.includes("config/database")) return { transaction: callback => callback(transaction) };
    if (name.includes("ride-request-email.model")) return model;
    if (name.includes("ride-request.model")) return { findByPk: async () => request };
    if (name.includes("ride-participant.model")) return { findOne: async () => participant };
    if (name.includes("ride-participant-email-template")) return { participantEmail: (r, p) => ({ subject: "Sign and pay", text: `${r.id}:${p.id}`, html: "Personal link" }) };
    if (name.includes("account-mail")) return { sendAccountMail: async email => deliveries.push(email) };
    throw Error(name);
  } });
  return { ...module.exports, request, participant, jobs, deliveries, transaction };
}
test("review email queue is idempotent and resend requeues the rider's personal email", async () => {
  const w = worker(); await w.queueParticipant(w.participant, w.transaction); await w.queueParticipant(w.participant, w.transaction);
  assert.equal(w.jobs.length, 1); assert.ok(w.participant.lastLinkSentAt);
  await w.deliver(); assert.equal(w.deliveries.length, 1); assert.equal(w.deliveries[0].email, "buddy@example.com");
  await w.queueParticipant(w.participant, w.transaction, true); await w.deliver(); assert.equal(w.deliveries.length, 2); assert.equal(w.jobs.length, 1);
});
test("queued personal links are not sent for paid riders or closed requests", async () => {
  for (const close of [false, true]) {
    const w = worker(); await w.queueParticipant(w.participant, w.transaction);
    if (close) w.request.status = "cancelled"; else w.participant.paidAt = new Date();
    await w.deliver(); assert.equal(w.deliveries.length, 0); assert.ok(w.jobs[0].sentAt);
  }
});
test("an in-flight delivery cannot be overwritten by a resend", async () => {
  const w = worker(); await w.queueParticipant(w.participant, w.transaction);
  w.jobs[0].lockedUntil = new Date(Date.now() + 60000);
  await assert.rejects(() => w.queueParticipant(w.participant, w.transaction, true), /already being sent/);
});
