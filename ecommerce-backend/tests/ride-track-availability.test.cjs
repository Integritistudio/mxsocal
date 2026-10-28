const test = require('node:test');
const assert = require('node:assert/strict');
const { trackAvailableForDates } = require('../lib/track-availability');
const dates = ['2026-10-31', '2026-11-01'];
const records = [
  { trackId: 'track', month: '2026-10', days: { '2026-10-31': { status: 'available' } } },
  { trackId: 'track', month: '2026-11', days: { '2026-11-01': { status: 'available' } } },
];
test('track must be available for every day across months', () => {
  assert.equal(trackAvailableForDates('track', dates, records), true);
  assert.equal(trackAvailableForDates('other', dates, records), false);
});
test('closed or missing dates exclude the track', () => {
  assert.equal(trackAvailableForDates('track', dates, records.slice(0, 1)), false);
  const closed = JSON.parse(JSON.stringify(records)); closed[1].days['2026-11-01'].status = 'unavailable';
  assert.equal(trackAvailableForDates('track', dates, closed), false);
  assert.equal(trackAvailableForDates('track', [], records), false);
});
