// Rule tests for js/roam.js against PRD v2. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/roam.js');

const NOW = new Date(2027, 2, 1, 10, 0);            // Monday 1 March 2027, 10:00
const base = { method: 'delivery', address: 'Carrer de Mallorca 250', postcode: '08008', start: '2027-03-15', end: '2027-03-19', ageMonths: 18, name: 'Ana Ruiz', email: 'ana@example.com', phone: '+34 600 000 000' };
const book = (db, over = {}, now = NOW) => R.createBooking(db, { ...base, ...over }, now);
const pass = Object.fromEntries(R.CFG.checklist.map(k => [k, true]));
/** Take a booking from paid to handed over, on time. */
function handOver(db, id) {
  const b = R.booking(db, id);
  assert.ok(R.confirmBooking(db, id, NOW).ok);
  const day = R.at(b.start, '07:00');
  assert.ok(R.inspectUnit(db, b.unitId, pass, day).ok);
  assert.ok(R.dispatch(db, id, day).ok);
  assert.ok(R.recordHandoff(db, id, R.at(b.start, '10:30')).ok);
  return b;
}

test('Pricing: €15 a day, so 5 days is €75; accessories are €10 each per rental; delivery in zone is included', () => {
  assert.equal(R.quote('2027-03-15', '2027-03-19', [], 'delivery').total, 75);
  assert.equal(R.quote('2027-03-15', '2027-03-19', ['rain', 'net'], 'delivery').total, 95);
  assert.equal(R.quote('2027-03-15', '2027-03-28', ['rain'], 'delivery').total, 14 * 15 + 10);
  assert.equal(R.quote('2027-03-15', '2027-03-19', [], 'delivery').lines.at(-1).amount, 0);
  assert.equal(R.quote('2027-03-15', '2027-03-19', [], 'delivery').hold, 150);
});

test('MVP scope: rentals run 3 to 14 days and cannot start today or earlier', () => {
  assert.equal(R.validateDates('2027-03-15', '2027-03-16', NOW), 'short');
  assert.equal(R.validateDates('2027-03-15', '2027-03-17', NOW), null);
  assert.equal(R.validateDates('2027-03-15', '2027-03-28', NOW), null);
  assert.equal(R.validateDates('2027-03-15', '2027-03-29', NOW), 'long');
  assert.equal(R.validateDates('2027-03-01', '2027-03-05', NOW), 'past');
});

test('Story 1: an address outside the zone is a "no" and is logged as denied demand', () => {
  const db = R.newDb();
  const r = R.search(db, { ...base, postcode: '08901' }, NOW);
  assert.equal(r.ok, false); assert.equal(r.reason, 'zone');
  assert.equal(db.searches.at(-1).result, 'denied_zone');
  assert.ok(R.search(db, base, NOW).ok);
  assert.equal(R.metrics(db, NOW).deniedDemand, 0.5);
  assert.ok(R.joinWaitlist(db, 'ana@example.com', { reason: 'zone', postcode: '08901' }, NOW).ok);
  assert.equal(db.waitlist.length, 1);
  assert.equal(R.joinWaitlist(db, 'not-an-email', {}, NOW).ok, false);
});

test('Story 1 and edge case: no unit free for the dates is a "no", logged as denied demand', () => {
  const db = R.newDb();
  for (let i = 0; i < 10; i++) assert.ok(book(db).ok, `booking ${i + 1} of 10 bookable units`);
  const r = R.search(db, base, NOW);
  assert.equal(r.reason, 'full'); assert.equal(db.searches.at(-1).result, 'denied_full');
  assert.equal(book(db).error, 'full');
});

test('Story 2: a child outside the 6 month to 4 year range cannot proceed', () => {
  const db = R.newDb();
  assert.equal(R.search(db, { ...base, ageMonths: 3 }, NOW).reason, 'fit');
  assert.equal(R.search(db, { ...base, ageMonths: 60 }, NOW).reason, 'fit');
  assert.equal(book(db, { ageMonths: 3 }).error, 'fit');
  assert.ok(book(db, { ageMonths: 6 }).ok); assert.ok(book(db, { ageMonths: 47 }).ok);
});

test('Story 3: only accessories confirmed compatible are offered or charged', () => {
  assert.deepEqual(R.offeredAccessories().map(a => a.id), ['rain', 'net']);
  const db = R.newDb(), b = book(db, { accessories: ['rain', 'footmuff'] }).booking;
  assert.deepEqual(b.accessories, ['rain']); assert.equal(b.quote.total, 85);
});

test('Story 5: booking needs only name, email, phone, delivery address, dates and child age', () => {
  const db = R.newDb();
  assert.ok(book(db).ok);
  for (const k of ['name', 'email', 'phone', 'address', 'ageMonths']) {
    const r = book(db, { [k]: '' });
    assert.equal(r.error, 'missing', k); assert.ok(r.missing.includes(k));
  }
  assert.ok(book(db, { method: 'pickup', address: '', postcode: '' }).ok, 'pickup needs no address');
});

test('Story 6: cancellation is free until 48 hours before handoff, 50% after, nothing after handoff', () => {
  const db = R.newDb(), b = book(db, { accessories: ['rain'] }).booking;   // handoff 15 March 10:00, paid €85
  assert.deepEqual(R.cancellationTerms(b, R.at('2027-03-13', '10:00')), { allowed: true, pct: 100, refund: 85 });
  assert.deepEqual(R.cancellationTerms(b, R.at('2027-03-13', '10:01')), { allowed: true, pct: 50, refund: 42.5 });
  const r = R.cancelBooking(db, b.id, R.at('2027-03-14', '09:00'));
  assert.equal(r.refund, 42.5); assert.equal(b.status, 'cancelled'); assert.equal(b.hold.status, 'released');
  const c = book(db).booking; handOver(db, c.id);
  assert.equal(R.cancellationTerms(c, R.at('2027-03-15', '12:00')).allowed, false);
  assert.equal(R.cancelBooking(db, c.id, R.at('2027-03-15', '12:00')).error, 'too_late');
});

test('Story 6 and edge case: dates change free up to 48 hours before handoff, subject to availability', () => {
  const db = R.newDb(), b = book(db).booking;
  const r = R.changeDates(db, b.id, '2027-03-20', '2027-03-26', NOW);          // 7 days
  assert.ok(r.ok); assert.equal(r.diff, 30); assert.equal(b.money.charged, 105);
  assert.equal(R.changeDates(db, b.id, '2027-03-20', '2027-03-22', NOW).diff, -60);
  assert.equal(b.money.charged - b.money.refunded, 45);
  assert.equal(R.changeDates(db, b.id, '2027-03-25', '2027-03-29', R.at('2027-03-19', '09:00')).error, 'too_late');
  const db2 = R.newDb(), mine = book(db2, { start: '2027-04-01', end: '2027-04-05' }).booking;
  for (let i = 0; i < 10; i++) book(db2);
  assert.equal(R.changeDates(db2, mine.id, '2027-03-15', '2027-03-19', NOW).error, 'full');
});

test('Operator: the same stroller cannot be double-booked, and a day is kept between rentals', () => {
  const db = R.newDb(); const seen = new Set();
  for (let i = 0; i < 10; i++) seen.add(book(db).booking.unitId);
  assert.equal(seen.size, 10);
  const first = db.bookings[0];
  assert.equal(R.assignUnit(db, db.bookings[1].id, first.unitId, NOW).error, 'unit_not_free');
  assert.equal(R.freeUnits(db, '2027-03-20', '2027-03-24').length, 0, 'turnaround day after 19 March');
  assert.equal(R.freeUnits(db, '2027-03-21', '2027-03-25').length, 10);
});

test('Operator: inspection, cleaning, quarantine and repair block a unit until it is cleared', () => {
  const db = R.newDb();
  assert.equal(R.freeUnits(db, '2027-03-15', '2027-03-19').length, 10, 'LR-11 in repair and LR-12 in quarantine are not bookable');
  for (const s of ['inspection', 'cleaning', 'quarantine', 'repair', 'retired']) {
    R.unit(db, 'LR-01').status = s;
    assert.ok(!R.freeUnits(db, '2027-03-15', '2027-03-19').some(u => u.id === 'LR-01'), s);
  }
  R.unit(db, 'LR-01').status = 'inspection';
  R.inspectUnit(db, 'LR-01', pass, NOW); assert.equal(R.unit(db, 'LR-01').status, 'cleaning');
  R.cleanUnit(db, 'LR-01', NOW); assert.equal(R.unit(db, 'LR-01').status, 'available');
  assert.ok(R.freeUnits(db, '2027-03-15', '2027-03-19').some(u => u.id === 'LR-01'));
});

test('Operator flow: confirm within 2 working hours, or decline and refund automatically', () => {
  const db = R.newDb();
  const fri = new Date(2027, 2, 5, 17, 30), b = book(db, {}, fri).booking;      // Friday 17:30
  assert.equal(new Date(b.confirmBy).getTime(), new Date(2027, 2, 8, 10, 30).getTime(), 'Monday 10:30');
  R.confirmBooking(db, b.id, new Date(2027, 2, 8, 9, 30)); assert.equal(b.confirmedInTime, true);
  const c = book(db).booking, r = R.declineBooking(db, c.id, NOW);
  assert.equal(r.refund, 75); assert.equal(c.status, 'declined'); assert.equal(c.hold.status, 'released');
});

test('Story 7: a stroller is only dispatched if it passed inspection in the last 24 hours', () => {
  const db = R.newDb(), b = book(db).booking; R.confirmBooking(db, b.id, NOW);
  assert.equal(R.dispatch(db, b.id, R.at('2027-03-15', '07:00')).error, 'inspection');
  R.inspectUnit(db, b.unitId, pass, R.at('2027-03-13', '07:00'));
  assert.equal(R.dispatch(db, b.id, R.at('2027-03-15', '07:00')).error, 'inspection', 'inspection is 48 hours old');
  R.inspectUnit(db, b.unitId, pass, R.at('2027-03-14', '09:00'));
  assert.ok(R.dispatch(db, b.id, R.at('2027-03-15', '07:00')).ok);
  const h = R.unit(db, b.unitId).history.map(e => e.type);
  assert.deepEqual(h, ['inspection', 'inspection', 'rental']);
});

test('Operator: a unit that fails inspection goes to repair and its upcoming rental moves to another unit', () => {
  const db = R.newDb(), b = book(db).booking, was = b.unitId; R.confirmBooking(db, b.id, NOW);
  R.inspectUnit(db, was, { ...pass, Brakes: false }, NOW);
  assert.equal(R.unit(db, was).status, 'repair'); assert.notEqual(b.unitId, was); assert.ok(b.unitId);
});

test('Story 7 and edge case: handoff inside the 2-hour window is on time; over 2 hours late refunds the delivery fee', () => {
  const db = R.newDb(), a = book(db).booking; handOver(db, a.id);
  assert.equal(a.handoffOnTime, true);
  const b = book(db).booking; R.confirmBooking(db, b.id, NOW);
  R.inspectUnit(db, b.unitId, pass, R.at('2027-03-15', '07:00')); R.dispatch(db, b.id, R.at('2027-03-15', '07:00'));
  const r = R.recordHandoff(db, b.id, R.at('2027-03-15', '14:30'));          // window 10:00 to 12:00
  assert.equal(r.onTime, false); assert.equal(r.lateHours, 2.5);
  assert.ok(b.events.some(e => /delivery fee refunded/.test(e.text)));
  assert.equal(R.metrics(db, NOW).onTime, 0.5);
});

test('Edge case: a stroller faulty at handoff is replaced within 4 hours or refunded in full', () => {
  const db = R.newDb(), a = book(db).booking, old = a.unitId; R.confirmBooking(db, a.id, NOW);
  const t = R.at('2027-03-15', '07:00');
  R.inspectUnit(db, old, pass, t); R.inspectUnit(db, 'LR-05', pass, t); R.dispatch(db, a.id, t);
  const r = R.reportFaulty(db, a.id, 'replace', R.at('2027-03-15', '10:30'));
  assert.equal(r.unitId, 'LR-05'); assert.equal(R.unit(db, old).status, 'repair');
  assert.equal(new Date(a.replaceBy).getTime(), R.at('2027-03-15', '14:30').getTime());
  const b = book(db, { start: '2027-04-01', end: '2027-04-05' }).booking; R.confirmBooking(db, b.id, NOW);
  R.inspectUnit(db, b.unitId, pass, R.at('2027-04-01', '07:00')); R.dispatch(db, b.id, R.at('2027-04-01', '07:00'));
  assert.equal(R.reportFaulty(db, b.id, 'refund', R.at('2027-04-01', '10:30')).refund, 75);
  assert.equal(b.money.charged - b.money.refunded, 0); assert.equal(b.hold.status, 'released');
});

test('Story 8: collection needs a return photo; a clean return releases the hold within 3 working days', () => {
  const db = R.newDb(), b = book(db).booking; handOver(db, b.id);
  assert.equal(R.recordCollection(db, b.id, R.at('2027-03-19', '10:30'), false).error, 'photo');
  assert.ok(R.recordCollection(db, b.id, R.at('2027-03-19', '10:30'), true).ok);      // Friday
  assert.equal(b.holdReleaseBy, '2027-03-24', 'Wednesday: three working days after Friday');
  assert.equal(R.unit(db, b.unitId).status, 'inspection');
  assert.equal(R.inspectReturn(db, b.id, pass, [], R.at('2027-03-22', '09:00')).charge, 0);
  assert.equal(b.hold.status, 'released'); assert.equal(b.status, 'closed');
  assert.ok(R.rate(db, b.id, 5, NOW).ok); assert.equal(R.metrics(db, NOW).satisfaction, 5);
});

test('Edge case: damage is charged from a price list, capped at replacement cost; ordinary wear is free', () => {
  const db = R.newDb(), b = book(db).booking; handOver(db, b.id);
  R.recordCollection(db, b.id, R.at('2027-03-19', '10:30'), true);
  const r = R.inspectReturn(db, b.id, pass, ['wheel', 'canopy'], R.at('2027-03-20', '09:00'));
  assert.equal(r.charge, 95); assert.equal(b.hold.status, 'captured'); assert.equal(b.hold.captured, 95);
  const sum = Object.values(R.CFG.damage).reduce((a, n) => a + n, 0);
  assert.ok(sum <= R.CFG.replacementCost, 'full price list stays under the cap');
});

test('Edge case: a late return is charged the daily rate per extra day; after 3 days it counts as lost', () => {
  const db = R.newDb(), a = book(db).booking; handOver(db, a.id);
  assert.equal(R.recordCollection(db, a.id, R.at('2027-03-21', '10:00'), true).lateDays, 2);
  assert.deepEqual(a.money.extras[0], { label: 'Late return, 2 extra days', amount: 30 });
  const b = book(db, { start: '2027-04-01', end: '2027-04-05' }).booking; handOver(db, b.id);
  assert.equal(R.markLost(db, b.id, R.at('2027-04-08', '10:00')).error, 'too_soon');
  assert.equal(R.markLost(db, b.id, R.at('2027-04-09', '10:00')).extra, R.CFG.replacementCost - 150);
  assert.equal(b.hold.status, 'captured'); assert.equal(R.unit(db, b.unitId).status, 'retired');
});

test('Metrics: conversion, denied demand, utilisation and satisfaction follow the PRD definitions', () => {
  const db = R.newDb();
  R.search(db, base, NOW); R.search(db, base, NOW); R.search(db, { ...base, postcode: '17001' }, NOW); R.search(db, { ...base, postcode: '08901' }, NOW);
  const b = book(db).booking; R.confirmBooking(db, b.id, NOW);
  const m = R.metrics(db, NOW);
  assert.equal(m.conversion, 0.5); assert.equal(m.deniedDemand, 0.5);
  assert.equal(m.rentedDays, 5); assert.equal(m.fleetDays, 12 * 31); assert.equal(m.unitsDown, 2);
});

test('Pop-up: plans are €55 and €85 for 30 days; the configuration follows the child\'s age', () => {
  const db = R.newDb(), d = { plan: 'basic', name: 'Ana', email: 'ana@example.com', phone: '600', address: 'Carrer A 1', postcode: '08012', startDate: '2027-03-10', ageMonths: 3 };
  const s = R.createSub(db, d, NOW).sub;
  assert.equal(s.price, 55); assert.equal(s.config, 'carrycot'); assert.equal(s.nextPayment, '2027-04-09');
  assert.equal(R.createSub(db, { ...d, plan: 'premium' }, NOW).sub.price, 85);
  assert.equal(R.createSub(db, { ...d, postcode: '08901' }, NOW).error, 'zone');
  assert.equal(R.createSub(db, { ...d, ageMonths: 60 }, NOW).error, 'fit');
});

test('Pop-up: swap as the child grows, Premium accessories on demand, and return to end', () => {
  const db = R.newDb(), d = { plan: 'basic', name: 'Ana', email: 'ana@example.com', phone: '600', address: 'Carrer A 1', postcode: '08012', startDate: '2027-03-10', ageMonths: 3 };
  const s = R.createSub(db, d, NOW).sub;
  assert.equal(R.requestExchange(db, s.id, '2027-03-20', '10:00', NOW).error, 'no_change');
  assert.equal(R.updateChild(db, s.id, 8, NOW).suggested.id, 'seat');
  assert.ok(R.requestExchange(db, s.id, '2027-03-20', '10:00', NOW).ok); assert.equal(s.config, 'seat');
  assert.equal(R.requestAccessory(db, s.id, 'rain', NOW).error, 'premium_only');
  const p = R.createSub(db, { ...d, plan: 'premium' }, NOW).sub;
  assert.ok(R.requestAccessory(db, p.id, 'rain', NOW).ok); assert.equal(R.requestAccessory(db, p.id, 'footmuff', NOW).error, 'accessory');
  assert.ok(R.endSub(db, s.id, '2027-04-02', '12:00', NOW).ok);
  assert.equal(s.status, 'ending'); assert.equal(s.holdReleaseBy, '2027-04-07');
});
