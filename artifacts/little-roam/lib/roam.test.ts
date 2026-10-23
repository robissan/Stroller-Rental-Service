import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXCHANGE_FEE,
  PREMIUM_ACCESSORY_CREDIT,
  PREMIUM_PRICE,
  BASIC_PRICE,
  addDays,
  applyExchange,
  blockingReason,
  cancelBooking,
  createBooking,
  renewMonth,
  daysInclusive,
  exchangeFeeFor,
  exchangeTargets,
  loadStored,
  monthEnd,
  outgrown,
  paidMonths,
  placeFit,
  priceBooking,
  quote,
  requestReturn,
  suitability,
  validateTrip,
  withChild,
  type Booking,
  type Draft,
} from './roam';

const now = new Date(2026, 5, 10, 12, 0, 0);

function draft(over: Partial<Draft> = {}): Draft {
  return {
    kind: 'monthly',
    destination: 'Lisbon',
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    childMonths: 20,
    childKg: 12,
    strollerId: 'wren',
    accessoryIds: [],
    handoff: { type: 'home', address: 'Alfama 4' },
    plan: 'basic',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

test('inclusive day count and the two-day minimum', () => {
  assert.equal(daysInclusive('2026-06-01', '2026-06-01'), 1);
  assert.equal(daysInclusive('2026-06-01', '2026-06-02'), 2);
  assert.equal(daysInclusive('2026-10-26', '2026-10-27'), 2);
  const same = validateTrip('travel', '2026-12-01', '2026-12-01', '14', '9');
  assert.match(same ?? '', /shortest trip is 2 days/);
  const trip = quote({ mode: 'travel', start: '2026-12-01', end: '2026-12-02', strollerId: 'wren', accIds: [], plan: 'basic' });
  assert.equal(trip.total, 24);
  const cradle = quote({ mode: 'travel', start: '2026-12-01', end: '2026-12-02', strollerId: 'cradle', accIds: [], plan: 'basic' });
  assert.equal(cradle.total, 30);
  const ridge = quote({ mode: 'travel', start: '2026-12-01', end: '2026-12-02', strollerId: 'ridge', accIds: ['rain'], plan: 'basic' });
  assert.equal(ridge.total, 32 + 6);
  assert.ok(ridge.lines.some((line) => line.label.includes('per trip')));
});

test('a monthly window is 30 inclusive days from the start', () => {
  assert.equal(addDays('2026-01-31', 29), '2026-03-01');
  assert.equal(monthEnd('2026-01-31'), '2026-03-01');
  const booking = createBooking(draft({ startDate: '2026-01-31' }));
  assert.equal(booking.endDate, '2026-03-01');
  assert.equal(daysInclusive(booking.startDate, booking.endDate), 30);
  assert.equal(paidMonths(booking), 1);
});

test('Cradle at 5 months has no exchange target until the child record grows', () => {
  const baby = createBooking(draft({ strollerId: 'cradle', childMonths: 5, childKg: 7, plan: 'basic' }));
  assert.equal(exchangeTargets(baby).some((row) => row.suitability.ok), false);
  assert.equal(applyExchange([baby], baby, 'wren', now).strollerId, 'cradle');
  const grown = withChild(baby, 8, 9);
  assert.equal(outgrown(grown), true);
  assert.deepEqual(
    exchangeTargets(grown).filter((row) => row.suitability.ok).map((row) => row.stroller.id),
    ['wren', 'ridge'],
  );
  const swapped = applyExchange([grown], grown, 'wren', now);
  assert.equal(swapped.strollerId, 'wren');
  assert.equal(swapped.segments?.at(-1)?.strollerId, 'wren');
  assert.ok(swapped.segments!.some((segment) => segment.strollerId === 'cradle'));
});

test('an exchange drops accessories the new model cannot take', () => {
  const booking = createBooking(draft({
    plan: 'premium',
    strollerId: 'wren',
    childMonths: 6,
    childKg: 8,
    accessoryIds: ['sun', 'foot', 'rain'],
  }));
  const swapped = applyExchange([booking], booking, 'cradle', now);
  assert.equal(swapped.strollerId, 'cradle');
  assert.deepEqual([...swapped.accessoryIds].sort(), ['rain']);
});

test('Premium credit covers the catalog and Basic charges the same items', () => {
  const ids = ['rain', 'sun', 'cup', 'foot', 'bag'];
  const premium = createBooking(draft({ plan: 'premium', strollerId: 'ridge', accessoryIds: ids }));
  const priced = priceBooking(premium);
  assert.equal(priced.credit, PREMIUM_ACCESSORY_CREDIT);
  assert.equal(priced.creditUsed, 26);
  assert.equal(premium.total, PREMIUM_PRICE);
  const basic = createBooking(draft({ plan: 'basic', strollerId: 'ridge', accessoryIds: ids }));
  assert.equal(basic.total, BASIC_PRICE + 26);
});

test('a second Premium exchange in the paid month costs 15 EUR', () => {
  let booking = createBooking(draft({ plan: 'premium', id: 'p1' }));
  booking = applyExchange([booking], booking, 'ridge', now);
  assert.equal(booking.exchangeRequests[0]?.fee, 0);
  assert.equal(booking.total, PREMIUM_PRICE);
  const second = applyExchange([booking], booking, 'wren', now);
  assert.equal(second.exchangeRequests[1]?.fee, EXCHANGE_FEE);
  assert.equal(second.strollerId, 'wren');
  assert.equal(second.total, PREMIUM_PRICE + EXCHANGE_FEE);
});

test('renewing a month grants another free Premium exchange', () => {
  let booking = createBooking(draft({ plan: 'premium' }));
  booking = applyExchange([booking], booking, 'ridge', now);
  booking = renewMonth(booking, '2026-06-10');
  assert.equal(paidMonths(booking), 2);
  assert.equal(booking.total, PREMIUM_PRICE * 2);
  assert.equal(priceBooking(booking).credit, PREMIUM_ACCESSORY_CREDIT * 2);
  const next = applyExchange([booking], booking, 'wren', now);
  assert.equal(next.exchangeRequests.at(-1)?.fee, 0);
});

test('a cancelled Basic booking does not consume the free exchange', () => {
  let used = createBooking(draft({ id: 'used', plan: 'basic' }));
  used = applyExchange([used], used, 'ridge', now);
  used = cancelBooking(used);
  const next = createBooking(draft({ id: 'next', plan: 'basic' }));
  assert.equal(exchangeFeeFor([used, next], next, now).free, true);
  const charged = applyExchange([used, next], next, 'ridge', now);
  assert.equal(charged.exchangeRequests[0]?.fee, 0);

  let open = createBooking(draft({ id: 'open', plan: 'basic' }));
  open = applyExchange([open], open, 'ridge', now);
  const other = createBooking(draft({ id: 'other', plan: 'basic' }));
  assert.equal(exchangeFeeFor([open, other], other, now).free, false);
  assert.equal(applyExchange([open, other], other, 'ridge', now).exchangeRequests[0]?.fee, EXCHANGE_FEE);
});

test('one open booking blocks another, and an early return reprices the trip', () => {
  const open = createBooking(draft());
  assert.match(blockingReason([open]) ?? '', /one stroller at a time/);
  assert.equal(blockingReason([cancelBooking(open)]), null);

  const trip = createBooking(draft({
    kind: 'travel',
    startDate: '2026-06-01',
    endDate: '2026-06-04',
    strollerId: 'wren',
    handoff: { type: 'airport', address: 'LIS sample desk' },
    plan: 'basic',
  }));
  assert.equal(trip.total, 48);
  const onTrip = new Date(2026, 5, 1, 12, 0, 0);
  const early = requestReturn(trip, {
    date: '2026-06-02',
    location: 'Airport desk',
    checklist: { frame: true, wheels: true, harness: false, accessories: true },
  }, onTrip);
  assert.equal(early.booking?.total, 24);
  assert.equal(early.booking?.returnRequest?.checklist?.harness, false);
  const late = requestReturn(trip, {
    date: '2026-06-06',
    location: 'Airport desk',
    checklist: { frame: true, wheels: true, harness: true, accessories: true },
  }, onTrip);
  assert.equal(late.booking?.total, 72);
});

test('Lisbon prefers the sturdier wheel without overriding age limits', () => {
  assert.equal(placeFit('ridge', 'Lisbon', 'travel').fit, 'good');
  assert.equal(placeFit('wren', 'Lisbon', 'travel').fit, 'poor');
  const cradle = suitability(
    { id: 'cradle', name: 'Cradle Roam', tagline: '', minM: 0, maxM: 6, maxKg: 9, selfKg: 8.1, extra: 3, notes: [] },
    5,
    7,
  );
  assert.equal(cradle.ok, true);
});

test('unreadable storage is kept and not treated as writable', () => {
  assert.equal(loadStored(null).writable, true);
  assert.equal(loadStored('{').writable, false);
  assert.equal(loadStored('{"no":"array"}').writable, false);
  assert.equal(loadStored('[{"id":"x"}]').writable, false);
  const booking: Booking = createBooking(draft({ id: 'ok' }));
  const partial = { ...booking, accessoryRequests: undefined, exchangeRequests: undefined };
  const loaded = loadStored(JSON.stringify([partial]));
  assert.equal(loaded.writable, true);
  assert.equal(loaded.bookings[0]?.accessoryRequests.length, 0);
  assert.equal(loaded.bookings[0]?.exchangeRequests.length, 0);
  const missingDate = { ...booking, createdAt: undefined };
  assert.equal(loadStored(JSON.stringify([missingDate])).writable, false);
});
