const test = require('node:test');
const assert = require('node:assert/strict');
const { buddyDetailsValid } = require('../../ecommerce-frontend/src/services/ride-requests.ts');
test('frontend accepts filled buddy measurements including trailing zeros', () => {
  assert.equal(buddyDetailsValid({ age:'25', heightCm:'175', weightKg:'75' }), true);
  assert.equal(buddyDetailsValid({ age:'25.0', heightCm:'175.50', weightKg:'75.00' }), true);
  assert.equal(buddyDetailsValid({ age:' 25 ', heightCm:' 175 ', weightKg:'75' }), true);
});
test('removed incomplete buddy cannot invalidate the remaining complete buddy', () => {
  const riders = [{}, {age:'25',heightCm:'175',weightKg:'75'}, {age:'',heightCm:'',weightKg:''}];
  assert.equal(riders.slice(1).every(buddyDetailsValid), false);
  const remaining = riders.filter((_,index) => index !== 2);
  assert.equal(remaining.slice(1).every(buddyDetailsValid), true);
});
test('frontend rejects missing fields, out of range values and excessive precision', () => {
  const valid={age:'25',heightCm:'175',weightKg:'75'};
  for (const [key,value] of [['age',''],['age','25.5'],['heightCm',''],['weightKg',''],['weightKg','75.55'],['heightCm','301']]) assert.equal(buddyDetailsValid({...valid,[key]:value}),false);
});
