const test = require('node:test');
const assert = require('node:assert/strict');
const { measurements } = require('../lib/profile-measurements');
test('accepts metric measurements and one decimal place', () => {
  assert.deepEqual(measurements({ heightCm: '175.5', weightKg: '75' }), { data: { heightCm: 175.5, weightKg: 75 } });
});
test('omitted values remain unchanged and blank values clear the field', () => {
  assert.deepEqual(measurements({}), { data: {} });
  assert.deepEqual(measurements({ heightCm: ' ', weightKg: null }), { data: { heightCm: null, weightKg: null } });
});
test('rejects invalid types, out of range values and excess precision', () => {
  for (const value of [true, [], {}, -1, 'Infinity', 'NaN', '175.55', '1e2', '301', '29']) assert.ok(measurements({ heightCm: value }).error, String(value));
  for (const value of ['0', '501', '75.55']) assert.ok(measurements({ weightKg: value }).error);
});
