const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { Op } = require('sequelize');
const { matchesRequestTab } = require('../../ecommerce-frontend/src/services/ride-requests.ts');
function expiry() {
  const calls = [], queued = [], exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/ride-request-expiry.js'),'utf8'), { exports, require: name => {
    if(name==='sequelize')return require('sequelize');
    if(name.includes('track-availability'))return require('../lib/track-availability');
    if(name.includes('config/database'))return {transaction:callback=>callback({id:'transaction'})};
    if(name.includes('ride-request-email'))return {queueRejection:async (request,transaction)=>queued.push({request,transaction})};
    return { update:async (values,options)=>{calls.push({values,options});return [1,[{id:'expired-request',...values}]];} };
  } });return {...exports,calls,queued};
}
test('expires only pending requests with first day strictly before California today',async()=>{
 const ctx=expiry(); await ctx.expireRequests({now:new Date('2026-10-29T06:59:00Z')});
 const call=ctx.calls[0];assert.equal(call.options.where.status,'requested');
 assert.equal(call.options.where.startDate[Op.lt],'2026-10-28');
 assert.equal(call.values.status,'rejected');assert.ok(call.values.expiredAt);assert.equal(call.values.reviewedBy,undefined);
 assert.equal(ctx.queued.length,1);assert.equal(ctx.queued[0].request.id,'expired-request');assert.equal(ctx.queued[0].transaction,call.options.transaction);
});
test('cutoff changes at California midnight and supports a private user scope',async()=>{
 const ctx=expiry();await ctx.expireRequests({userId:'customer',now:new Date('2026-10-29T07:00:00Z')});
 assert.equal(ctx.calls[0].options.where.startDate[Op.lt],'2026-10-29');assert.equal(ctx.calls[0].options.where.userId,'customer');
});
test('manual rejection and expiry have separate tabs while expiry remains rejected',()=>{
 const expired={status:'rejected',expiredAt:'2026-10-29'};
 const rejected={status:'rejected',expiredAt:null};
 assert.equal(matchesRequestTab(expired,'expired'),true);assert.equal(matchesRequestTab(expired,'rejected'),false);
 assert.equal(matchesRequestTab(rejected,'rejected'),true);assert.equal(matchesRequestTab(rejected,'expired'),false);
 assert.equal(matchesRequestTab(expired,'all'),true);assert.equal(matchesRequestTab({status:'approved'},'expired'),false);
});
