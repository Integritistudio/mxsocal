const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const {receiptImages}=require('../lib/receipt-images');
const {receiptPdf}=require('../lib/ride-receipt-pdf');
const {receiptData}=require('../lib/ride-receipt-data');
const {rideRequestEmail}=require('../lib/ride-request-email-template');
const request={id:'test-reference',status:'requested',startDate:'2026-10-29',endDate:'2026-10-30',draft:{coachMode:'group',coachId:null,riders:[{name:'Organizer',email:'owner@example.com'},{name:'Buddy',email:'buddy@example.com'}]},estimate:{dates:['2026-10-29','2026-10-30'],items:[{riderIndex:0,name:'Private Yamaha',image:'/images/bikes/cd178.png',dailyAmount:15000,days:2,amount:30000},{riderIndex:1,name:'Buddy Honda',image:'/images/bikes/1cc67.png',dailyAmount:12000,days:2,amount:24000}],totalAmount:54000}};
test('receipt images are embedded from allowed local photos and traversal is ignored',async()=>{
 const images=await receiptImages([{image:'/images/bikes/cd178.png'},{image:'/images/../../ecommerce-backend/.env'},{image:'https://127.0.0.1/private'}]);
 assert.equal(images.size,1); const photo=images.values().next().value;assert.ok(photo.content.length>100);assert.equal(photo.contentType,'image/png');assert.ok(photo.cid);
});
test('buddy PDF and inline image list use only buddy selections',async()=>{
 const context={request,kind:'buddy',riderIndex:1};const data=receiptData(context);assert.equal(data.items.length,1);assert.equal(data.items[0].name,'Buddy Honda');
 const images=await receiptImages(data.items);assert.equal(images.has('/images/bikes/cd178.png'),false);
 const pdf=await receiptPdf({...context,images});assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>10000);
 const mail=rideRequestEmail({...context,images});assert.ok(mail.html.includes('cid:ride-photo-0@mxsocal'));assert.ok(!mail.html.includes('Private Yamaha'));
});
test('SMTP and SES transports both include PDF and inline attachments',async()=>{
 for(const smtp of [true,false]){
  const sent=[];const exports={};
  class SESClient{async send(command){sent.push(command.input);}}
  class Command{constructor(input){this.input=input;}}
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/account-mail.js'),'utf8'),{exports,process:{env:{MAIL_FROM:'sender@example.com',...(smtp?{SMTP_HOST:'smtp.example.com'}:{})}},require:name=>{
   if(name==='nodemailer')return {createTransport:()=>({sendMail:async data=>sent.push(data)})};
   if(name==='@aws-sdk/client-ses')return {SESClient,SendEmailCommand:Command,SendRawEmailCommand:Command};
   return require(name);
  }});
  await exports.sendAccountMail({email:'recipient@example.com',subject:'Receipt',text:'Request receipt',html:'<img src="cid:photo">',attachments:[{filename:'receipt.pdf',content:Buffer.from('%PDF-test'),contentType:'application/pdf'},{filename:'photo.png',cid:'photo',content:Buffer.from('image'),contentType:'image/png'}]});
  if(smtp){assert.equal(sent[0].attachments.length,2);assert.equal(sent[0].disableFileAccess,true);}
  else {const mime=sent[0].RawMessage.Data.toString();assert.ok(mime.includes('application/pdf'));assert.ok(mime.includes('Content-ID: <photo>'));assert.ok(mime.includes('multipart/'))}
 }
});
