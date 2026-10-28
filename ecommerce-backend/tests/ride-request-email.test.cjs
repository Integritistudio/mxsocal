const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { rideRequestEmail } = require('../lib/ride-request-email-template');
const request = {
 id:'request-id',status:'requested',startDate:'2026-10-29',endDate:'2026-10-30',
 draft:{coachMode:'individual',riders:[{name:'Alex Organizer',email:'owner@example.com',phone:'111',coachId:'coach-a'},{name:'Buddy One',email:'buddy@example.com',phone:'222',coachId:'coach-b'},{name:'Private Buddy Two',email:'private@example.com',phone:'333',coachId:'coach-c'}]},
 estimate:{track:{name:'Fox Raceway'},totalAmount:999900,items:[
 {riderIndex:0,name:'Owner Bike',dailyAmount:10000,days:2,amount:20000},
 {riderIndex:1,name:'Buddy Bike',dailyAmount:12000,days:2,amount:24000},
 {riderIndex:1,name:'Buddy Helmet',size:'M',included:true},
 {riderIndex:2,name:'Private Bike',dailyAmount:10000,days:2,amount:20000},
 {coachId:'coach-a',name:'Owner Coach',dailyAmount:5000,days:2,amount:10000},
 {coachId:'coach-b',name:'Buddy Coach',assignmentLabel:'Buddy One',dailyAmount:6000,days:2,amount:12000},
 {coachId:'coach-c',name:'Private Coach',dailyAmount:7000,days:2,amount:14000},
 ]}
};
test('buddy receives only their own equipment and assigned coach',()=>{
 const mail=rideRequestEmail({request,kind:'buddy',riderIndex:1});
 for(const text of [mail.html,mail.text]) {
  for(const included of ['Alex Organizer added you as a buddy','Buddy Bike','Buddy Helmet','Buddy Coach','Fox Raceway','awaiting admin approval']) assert.ok(text.includes(included),included);
  for(const excluded of ['Owner Bike','Owner Coach','Private Bike','Private Coach','Private Buddy Two','private@example.com','owner@example.com','Estimated group total']) assert.ok(!text.includes(excluded),excluded);
 }
});
test('admin and owner get all rider selections and group estimate',()=>{
 for(const kind of ['admin','owner']) {
  const mail=rideRequestEmail({request,kind,riderIndex:0});
  for(const text of ['Owner Bike','Buddy Bike','Private Bike','Estimated group total']) assert.ok(mail.html.includes(text),text);
 }
});
test('email escapes visitor names and omits unrelated shared-coach assignments',()=>{
 const changed=JSON.parse(JSON.stringify(request));changed.draft.riders[0].name='<script>bad</script>';
 const mail=rideRequestEmail({request:changed,kind:'buddy',riderIndex:1});
 assert.ok(!mail.html.includes('<script>'));assert.ok(mail.html.includes('&lt;script&gt;'));
});
function worker(fail=false) {
 const jobs=new Map(), deliveries=[], updates=[];
 const transaction={LOCK:{UPDATE:'UPDATE'}};
 const db={transaction:callback=>callback(transaction)};
 const model={
  findOrCreate:async options=>{const key=JSON.stringify(options.where);if(!jobs.has(key))jobs.set(key,{...options.where,...options.defaults,attempts:0,update:async values=>updates.push(values)});},
  findAll:async()=>[...jobs.values()],
 };
 const exports={}, module={exports};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/ride-request-email.js'),'utf8'),{module,exports,process:{env:{ADMIN_EMAIL:'admin@example.com'}},console:{error(){}},require:name=>{
  if(name==='sequelize')return require('sequelize');
  if(name.includes('config/database'))return db;
  if(name.includes('ride-request-email.model'))return model;
  if(name.includes('ride-request.model'))return {findByPk:async()=>request};
  if(name.includes('ride-receipt-data'))return require('../lib/ride-receipt-data');
  if(name.includes('receipt-images'))return {receiptImages:async()=>new Map()};
  if(name.includes('ride-receipt-pdf'))return {receiptPdf:async()=>Buffer.from('%PDF-test')};
  if(name.includes('email-template'))return {rideRequestEmail};
  if(name.includes('account-mail'))return {sendAccountMail:async mail=>{if(fail)throw new Error('offline');deliveries.push(mail);}};
  throw new Error(name);
 }});
 return {...module.exports,jobs,deliveries,updates,transaction};
}
test('queues one notification per role and buddy without duplicate jobs on retry',async()=>{
 const ctx=worker();await ctx.queue(request,ctx.transaction);await ctx.queue(request,ctx.transaction);
 assert.equal(ctx.jobs.size,4);
 await ctx.deliver();assert.deepEqual(ctx.deliveries.map(mail=>mail.email),['admin@example.com','owner@example.com','buddy@example.com','private@example.com']);
 assert.equal(ctx.updates.filter(values=>values.sentAt).length,4);
 for(const mail of ctx.deliveries)assert.ok(mail.attachments.some(file=>file.contentType==='application/pdf')); 
});
test('delivery failures leave jobs unsent and schedule retries',async()=>{
 const ctx=worker(true);await ctx.queue(request,ctx.transaction);await ctx.deliver();
 assert.equal(ctx.deliveries.length,0);assert.equal(ctx.updates.filter(values=>values.sentAt).length,0);
 assert.equal(ctx.updates.filter(values=>values.nextAttemptAt>new Date() && values.lockedUntil===null).length,4);
});
