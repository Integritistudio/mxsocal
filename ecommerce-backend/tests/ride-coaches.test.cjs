const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ids = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const coachIds = ['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
function service() {
  const reserved = [], locks = [];
  const product = { findAll: async () => ids.map(id => ({ id, name:'Bike', category:'bike', stockQuantity:2, currency:'USD', pricePerDay:'100', images:[] })) };
  const coaches = coachIds.map((id, index) => ({ id, firstName:'Coach', lastName:String(index), dailyRate:'50' }));
  const coach = { findAll: async options => { if (options.lock) locks.push(options.where.id); return coaches; } };
  const empty = { findAll: async () => [] };
  const exports = {}; const module = { exports };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/ride-requests.js'),'utf8'), { module, exports, require: name => {
    if (name === 'sequelize') return require('sequelize');
    if (name.includes('product.model')) return { Product:product, ProductAvailability:empty };
    if (name.includes('coach.model')) return coach;
    if (name.includes('ride-pricing.model')) return { findByPk:async () => null };
    if (name.includes('booking.model')) return { Booking:{ findAll:async () => [], create:async row => {reserved.push(row);return {id:'booking'};} }, BookingAccessory:{create:async () => {}} };
    if (name.includes('models/')) return empty;
    if (name.includes('config/database')) return {};
    return require(path.resolve(__dirname, '../lib', name));
  } });
  return {...module.exports,reserved,locks};
}
function body(shared = false) {
 const today = require('../lib/track-availability').currentDate();
 const date = n => new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 return { coachMode:'individual',startDate:date(1),endDate:date(2),riders:ids.map((id,i)=>({bikeId:id,name:'Buddy',email:'buddy@example.com',phone:'+15551234567',age:25,heightCm:175,weightKg:75,gear:[],coachId:coachIds[shared?0:i]})) };
}
const account = {name:'Customer',email:'customer@example.com',needsCoach:false};
test('individual coaches are charged and reserved independently', async () => {
 const ctx=service(), result=await ctx.quote(body(),account);
 assert.equal(result.estimate.coaches.length,2); assert.equal(result.estimate.totalAmount,60000);
 await ctx.lockSelections(result.draft,{LOCK:{UPDATE:'UPDATE'}}); assert.equal(ctx.locks[0].length,2);
 await ctx.reserve({id:'request',userId:'user',...result},{ });
 assert.equal(ctx.reserved.length,4);
 assert.equal(ctx.reserved[0].meta.coachId,coachIds[0]); assert.equal(ctx.reserved[1].meta.coachId,coachIds[1]);
});
test('per-rider coaching rejects the same coach for two riders', async () => {
 const ctx=service(); await assert.rejects(() => ctx.quote(body(true),account), /different coach for each rider/);
});
test('one coach for the whole group remains allowed', async () => {
 const ctx=service(), draft=body(); draft.coachMode='group'; draft.coachId=coachIds[0];
 const result=await ctx.quote(draft,account);
 assert.equal(result.estimate.coaches.length,1); assert.equal(result.estimate.totalAmount,50000);
});
