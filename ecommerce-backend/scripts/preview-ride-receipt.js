const fs = require('node:fs');
const path = require('node:path');
const sample = {
 id:'DEMO-RECEIPT-2026',status:'requested',startDate:'2026-10-29',endDate:'2026-10-31',
 draft:{coachMode:'group',coachId:'coach',riders:[{name:'Demo Organizer',email:'organizer@example.com'},{name:'Demo Buddy',email:'buddy@example.com'}]},
 estimate:{dates:['2026-10-29','2026-10-30','2026-10-31'],track:{name:'Fox Raceway'},totalAmount:90000,items:[
 {riderIndex:0,productId:'bike-owner',name:'Yamaha YZ450F',image:'/images/bikes/cd178.png',dailyAmount:15000,days:3,amount:45000},
 {riderIndex:0,gearPackage:true,name:'Gear rental package',dailyAmount:2500,days:3,amount:7500},
 {riderIndex:0,productId:'helmet-owner',name:'Riding helmet',size:'M',included:true,image:'/images/booking/2600c.png'},
 {riderIndex:1,productId:'bike-buddy',name:'Honda CRF250R',image:'/images/bikes/1cc67.png',dailyAmount:12000,days:3,amount:36000},
 {coachId:'coach',image:'/images/coaches/26a63.png',name:'Demo Coach',assignmentLabel:'Whole group',dailyAmount:500,days:3,amount:1500},
 ]}
};
(async()=>{
 const root=path.resolve(__dirname,'../../output/pdf');fs.mkdirSync(root,{recursive:true});
 for(const kind of ['owner','buddy']) {
  const context={request:sample,kind,riderIndex:1};
  const view=require('../lib/ride-receipt-data').receiptData(context);
  const images=await require('../lib/receipt-images').receiptImages(view.items);
  const pdf=await require('../lib/ride-receipt-pdf').receiptPdf({...context,images});
  fs.writeFileSync(path.join(root,`sample-${kind}-receipt.pdf`),pdf);
  fs.writeFileSync(path.join(root,`sample-${kind}-receipt.html`),require('../lib/ride-request-email-template').rideRequestEmail({...context,images}).html);
  console.log(kind,pdf.length,'bytes;',images.size,'photos');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
