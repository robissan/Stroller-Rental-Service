/* Little Roam booking rules (PRD v2). Pure logic, no DOM: runs in the browser as `Roam` and in Node via require().
   Every price and policy here is a pilot hypothesis from the PRD. Values marked PLACEHOLDER are not in the PRD. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Roam = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CFG = {
    city: 'Barcelona',
    zone: { from: 8001, to: 8042, label: 'Barcelona city, postcodes 08001 to 08042' },
    pickup: { name: 'Partner pickup point', area: 'Eixample, Barcelona' },          // PLACEHOLDER: partner not chosen
    dailyRate: 15, minDays: 3, maxDays: 14,
    accessoryPrice: 10,
    deliveryFee: 0,                       // included in the pilot; the survey tests a €10 fee
    hold: 150,
    freeCancelHours: 48, lateCancelRefundPct: 50,
    handoffWindowHours: 2, lateHandoffRefundHours: 2,
    lostAfterDays: 3, faultyReplaceHours: 4,
    holdReleaseWorkingDays: 3, confirmWorkingHours: 2, inspectionValidHours: 24,
    turnaroundDays: 1,                    // PLACEHOLDER: one day between rentals for inspection and cleaning
    replacementCost: 400,                 // PLACEHOLDER until supplier quotes
    damage: { wheel: 35, canopy: 60, frame: 180 },   // PLACEHOLDER price list
    windows: ['08:00', '10:00', '12:00', '16:00', '18:00'],
    workStart: 9, workEnd: 18,
    model: { id: 'wren', name: 'Wren', minMonths: 6, maxMonths: 47, maxKg: 22, folded: '52 × 44 × 25 cm', weightKg: 7.2 },  // PLACEHOLDER concept model
    accessories: [
      { id: 'rain', name: 'Rain cover', compatible: true },
      { id: 'net', name: 'Mosquito net', compatible: true },
      { id: 'footmuff', name: 'Footmuff', compatible: false },   // not confirmed compatible, so never offered
    ],
    checklist: ['Brakes', 'Harness', 'Fold lock', 'Wheels', 'Frame', 'Fabric'],
    popup: {
      monthDays: 30,
      plans: { basic: { id: 'basic', name: 'Basic', price: 55 }, premium: { id: 'premium', name: 'Premium', price: 85 } },
      configs: [
        { id: 'carrycot', name: 'Wren with carrycot', minMonths: 0, maxMonths: 5, range: 'birth to 5 months' },
        { id: 'seat', name: 'Wren with seat', minMonths: 6, maxMonths: 47, range: '6 months to 4 years' },
      ],
    },
  };

  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const rentalDays = (start, end) => diffDays(start, end) + 1;          // both the first and last day count
  const at = (date, hhmm) => { const d = parse(date); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  function addWorkingDays(dateIso, n) {
    const d = parse(dateIso);
    while (n > 0) { d.setDate(d.getDate() + 1); if (!isWeekend(d)) n--; }
    return iso(d);
  }
  function addWorkingHours(from, hours) {
    const d = new Date(from); let left = hours * 60;
    for (let guard = 0; guard < 400 && left > 0; guard++) {
      if (isWeekend(d) || d.getHours() >= CFG.workEnd) { d.setDate(d.getDate() + 1); d.setHours(CFG.workStart, 0, 0, 0); continue; }
      if (d.getHours() < CFG.workStart) d.setHours(CFG.workStart, 0, 0, 0);
      const end = new Date(d); end.setHours(CFG.workEnd, 0, 0, 0);
      const take = Math.min(left, (end - d) / 6e4);
      d.setTime(d.getTime() + take * 6e4); left -= take;
    }
    return d;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nice = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const windowEnd = hhmm => `${pad(Number(hhmm.slice(0, 2)) + CFG.handoffWindowHours)}:00`;

  /* ---------- data ---------- */
  function newDb() {
    const units = [];
    for (let i = 1; i <= 12; i++) units.push({ id: `LR-${pad(i)}`, model: 'wren', status: 'available', lastInspection: null, history: [] });
    units[10].status = 'repair'; units[10].history.push({ at: null, type: 'repair', note: 'Front wheel bearing, waiting for part' });
    units[11].status = 'quarantine'; units[11].history.push({ at: null, type: 'quarantine', note: 'Fabric drying after deep clean' });
    return { v: 2, units, bookings: [], subs: [], searches: [], waitlist: [], seq: 1 };
  }
  const BLOCKED = ['inspection', 'cleaning', 'quarantine', 'repair', 'retired'];
  const ACTIVE = ['requested', 'confirmed', 'dispatched', 'handed_over'];
  const unit = (db, id) => db.units.find(u => u.id === id);
  const booking = (db, id) => db.bookings.find(b => b.id === id);
  const sub = (db, id) => db.subs.find(s => s.id === id);
  const log = (rec, now, text) => rec.events.push({ at: new Date(now).toISOString(), text });
  const fail = code => ({ ok: false, error: code });
  function newId(db, prefix) {
    const tail = Math.random().toString(36).slice(2, 5);
    return `${prefix}${db.seq++}${tail}`.toLowerCase();
  }

  /* ---------- checks ---------- */
  const inZone = pc => /^\d{5}$/.test(String(pc).trim()) && Number(pc) >= CFG.zone.from && Number(pc) <= CFG.zone.to;
  function fit(ageMonths) {
    const m = CFG.model, a = Number(ageMonths);
    if (!Number.isFinite(a)) return { ok: false, reason: 'missing' };
    if (a < m.minMonths) return { ok: false, reason: 'too_young' };
    if (a > m.maxMonths) return { ok: false, reason: 'too_old' };
    return { ok: true };
  }
  function validateDates(start, end, now) {
    if (!start || !end) return 'missing';
    if (start <= iso(new Date(now))) return 'past';
    if (end < start) return 'order';
    const n = rentalDays(start, end);
    if (n < CFG.minDays) return 'short';
    if (n > CFG.maxDays) return 'long';
    return null;
  }
  const overlap = (a1, a2, b1, b2) => a1 <= b2 && b1 <= a2;
  /** Units that are cleared for booking and have no rental (plus turnaround) touching these dates. */
  function freeUnits(db, start, end, excludeBookingId) {
    const until = addDays(end, CFG.turnaroundDays);
    return db.units.filter(u => !BLOCKED.includes(u.status) && !db.bookings.some(b =>
      b.id !== excludeBookingId && ACTIVE.includes(b.status) && b.unitId === u.id &&
      overlap(start, until, b.start, addDays(b.end, CFG.turnaroundDays))));
  }
  const offeredAccessories = () => CFG.accessories.filter(a => a.compatible);

  /** Story 1 and 2: is this place, these dates and this child served? Every search is logged. */
  function search(db, q, now) {
    const dateError = validateDates(q.start, q.end, now);
    if (dateError) return { ok: false, reason: 'dates', dateError };
    let result = 'available', reason = null;
    if (q.method === 'delivery' && !inZone(q.postcode)) { result = 'denied_zone'; reason = 'zone'; }
    else if (!freeUnits(db, q.start, q.end).length) { result = 'denied_full'; reason = 'full'; }
    else if (!fit(q.ageMonths).ok) { result = 'denied_fit'; reason = 'fit'; }
    db.searches.push({ at: new Date(now).toISOString(), method: q.method, postcode: q.postcode || null, start: q.start, end: q.end, result });
    return { ok: !reason, reason, fit: fit(q.ageMonths), days: rentalDays(q.start, q.end) };
  }
  function joinWaitlist(db, email, context, now) {
    if (!/^\S+@\S+\.\S+$/.test(email || '')) return fail('email');
    db.waitlist.push({ at: new Date(now).toISOString(), email, ...context });
    return { ok: true };
  }

  /* ---------- price ---------- */
  function quote(start, end, accessoryIds, method) {
    const n = rentalDays(start, end);
    const lines = [{ label: `${n} days at €${CFG.dailyRate} a day`, amount: n * CFG.dailyRate }];
    for (const id of accessoryIds || []) {
      const a = offeredAccessories().find(x => x.id === id);
      if (a) lines.push({ label: a.name, amount: CFG.accessoryPrice });
    }
    lines.push(method === 'pickup'
      ? { label: 'Pickup at partner point', amount: 0 }
      : { label: 'Delivery and collection in zone', amount: CFG.deliveryFee });
    return { days: n, lines, total: lines.reduce((s, l) => s + l.amount, 0), hold: CFG.hold };
  }

  /* ---------- parent: book, change, cancel ---------- */
  function createBooking(db, d, now) {
    const missing = ['name', 'email', 'phone', 'start', 'end', 'ageMonths'].filter(k => d[k] === undefined || d[k] === null || String(d[k]).trim() === '');
    if (d.method === 'delivery' && !String(d.address || '').trim()) missing.push('address');
    if (missing.length) return { ok: false, error: 'missing', missing };
    if (!/^\S+@\S+\.\S+$/.test(d.email)) return { ok: false, error: 'missing', missing: ['email'] };
    if (validateDates(d.start, d.end, now)) return fail('dates');
    if (d.method === 'delivery' && !inZone(d.postcode)) return fail('zone');
    if (!fit(d.ageMonths).ok) return fail('fit');
    const free = freeUnits(db, d.start, d.end);
    if (!free.length) return fail('full');
    const q = quote(d.start, d.end, d.accessories, d.method);
    const b = {
      id: newId(db, 'f'), kind: 'flying', status: 'requested',
      createdAt: new Date(now).toISOString(), confirmBy: addWorkingHours(now, CFG.confirmWorkingHours).toISOString(),
      method: d.method, address: d.address || '', postcode: d.postcode || '',
      start: d.start, end: d.end, handoffWindow: d.handoffWindow || CFG.windows[1], collectWindow: d.collectWindow || CFG.windows[1],
      accessories: (d.accessories || []).filter(id => offeredAccessories().some(a => a.id === id)),
      child: { ageMonths: Number(d.ageMonths) }, contact: { name: d.name, email: d.email, phone: d.phone },
      unitId: free[0].id, quote: q,
      money: { charged: q.total, refunded: 0, extras: [] },
      hold: { amount: CFG.hold, status: 'held' },
      rating: null, events: [],
    };
    log(b, now, `Booked and paid €${q.total}. €${CFG.hold} card hold placed.`);
    db.bookings.push(b);
    return { ok: true, booking: b };
  }
  const handoffAt = b => at(b.start, b.handoffWindow);
  function cancellationTerms(b, now) {
    if (!['requested', 'confirmed', 'dispatched'].includes(b.status)) return { allowed: false, pct: 0, refund: 0 };
    const hours = (handoffAt(b) - new Date(now)) / 36e5;
    const pct = hours >= CFG.freeCancelHours ? 100 : CFG.lateCancelRefundPct;
    return { allowed: true, pct, refund: Math.round(b.money.charged * pct) / 100 };
  }
  function cancelBooking(db, id, now) {
    const b = booking(db, id); if (!b) return fail('not_found');
    const t = cancellationTerms(b, now); if (!t.allowed) return fail('too_late');
    if (b.status === 'dispatched' && unit(db, b.unitId)) unit(db, b.unitId).status = 'available';
    b.status = 'cancelled'; b.money.refunded += t.refund; b.hold.status = 'released';
    log(b, now, `Cancelled by the parent. €${t.refund} refunded (${t.pct}%). Card hold released.`);
    return { ok: true, refund: t.refund, pct: t.pct };
  }
  function canChangeDates(b, now) {
    return ['requested', 'confirmed'].includes(b.status) && (handoffAt(b) - new Date(now)) / 36e5 >= CFG.freeCancelHours;
  }
  function changeDates(db, id, start, end, now) {
    const b = booking(db, id); if (!b) return fail('not_found');
    if (!canChangeDates(b, now)) return fail('too_late');
    const dateError = validateDates(start, end, now); if (dateError) return { ok: false, error: 'dates', dateError };
    const free = freeUnits(db, start, end, b.id); if (!free.length) return fail('full');
    const q = quote(start, end, b.accessories, b.method), diff = q.total - b.money.charged + b.money.refunded;
    b.unitId = (free.find(u => u.id === b.unitId) || free[0]).id;
    b.start = start; b.end = end; b.quote = q;
    if (diff > 0) b.money.charged += diff; else b.money.refunded += -diff;
    log(b, now, `Dates changed to ${nice(start)} to ${nice(end)}. ${diff > 0 ? `€${diff} charged` : diff < 0 ? `€${-diff} refunded` : 'No price change'}.`);
    return { ok: true, diff };
  }
  function rate(db, id, stars, now) {
    const b = booking(db, id); if (!b || b.status !== 'closed') return fail('not_closed');
    if (!(stars >= 1 && stars <= 5)) return fail('range');
    b.rating = Number(stars); log(b, now, `Parent rated the rental ${stars} out of 5.`); return { ok: true };
  }

  /* ---------- operator ---------- */
  const history = (u, now, type, note) => u.history.push({ at: new Date(now).toISOString(), type, note });
  function confirmBooking(db, id, now) {
    const b = booking(db, id); if (!b || b.status !== 'requested') return fail('state');
    b.status = 'confirmed'; b.confirmedAt = new Date(now).toISOString();
    b.confirmedInTime = new Date(now) <= new Date(b.confirmBy);
    log(b, now, `Confirmed by Little Roam${b.confirmedInTime ? '' : ' (after the 2 working hour target)'}.`);
    return { ok: true };
  }
  function declineBooking(db, id, now) {
    const b = booking(db, id); if (!b || b.status !== 'requested') return fail('state');
    const refund = b.money.charged - b.money.refunded;
    b.status = 'declined'; b.money.refunded += refund; b.hold.status = 'released';
    log(b, now, `Declined by Little Roam. €${refund} refunded automatically. Card hold released.`);
    return { ok: true, refund };
  }
  function assignUnit(db, id, unitId, now) {
    const b = booking(db, id); if (!b || !['requested', 'confirmed'].includes(b.status)) return fail('state');
    if (!freeUnits(db, b.start, b.end, b.id).some(u => u.id === unitId)) return fail('unit_not_free');
    b.unitId = unitId; log(b, now, `Unit ${unitId} assigned.`); return { ok: true };
  }
  /** results: { Brakes: true, ... }. A fail pulls the unit for repair and moves its upcoming rentals. */
  function inspectUnit(db, unitId, results, now) {
    const u = unit(db, unitId); if (!u) return fail('not_found');
    const failed = CFG.checklist.filter(k => !results[k]);
    u.lastInspection = { at: new Date(now).toISOString(), pass: !failed.length, failed };
    history(u, now, 'inspection', failed.length ? `Failed: ${failed.join(', ')}` : 'Passed all six checks');
    if (failed.length) {
      u.status = 'repair';
      for (const b of db.bookings.filter(x => x.unitId === unitId && ['requested', 'confirmed'].includes(x.status))) {
        const other = freeUnits(db, b.start, b.end, b.id)[0];
        if (other) { b.unitId = other.id; log(b, now, `Moved to unit ${other.id} after ${unitId} failed inspection.`); }
        else { b.unitId = null; log(b, now, `No replacement unit free after ${unitId} failed inspection.`); }
      }
    } else if (u.status === 'inspection') u.status = 'cleaning';
    return { ok: true, pass: !failed.length };
  }
  function cleanUnit(db, unitId, now) {
    const u = unit(db, unitId); if (!u || u.status !== 'cleaning') return fail('state');
    u.status = 'available'; history(u, now, 'cleaning', 'Cleaned and cleared for booking'); return { ok: true };
  }
  function setUnitStatus(db, unitId, status, note, now) {
    const u = unit(db, unitId); if (!u) return fail('not_found');
    if (!['quarantine', 'repair', 'retired', 'inspection'].includes(status)) return fail('status');
    if (u.status === 'out') return fail('out');
    u.status = status; history(u, now, status === 'inspection' ? 'repair' : status, note || (status === 'inspection' ? 'Work done, waiting for inspection' : ''));
    return { ok: true };
  }
  const inspectionValid = (u, now) => !!(u && u.lastInspection && u.lastInspection.pass &&
    (new Date(now) - new Date(u.lastInspection.at)) / 36e5 <= CFG.inspectionValidHours && new Date(u.lastInspection.at) <= new Date(now));
  function dispatch(db, id, now) {
    const b = booking(db, id); if (!b || b.status !== 'confirmed') return fail('state');
    const u = unit(db, b.unitId); if (!u) return fail('no_unit');
    if (u.status !== 'available') return fail('unit_blocked');
    if (!inspectionValid(u, now)) return fail('inspection');
    b.status = 'dispatched'; b.dispatchedAt = new Date(now).toISOString(); u.status = 'out';
    history(u, now, 'rental', `Dispatched for booking ${b.id}`);
    log(b, now, `Stroller ${u.id} dispatched. It passed inspection within the last 24 hours.`);
    return { ok: true };
  }
  function recordHandoff(db, id, when) {
    const b = booking(db, id); if (!b || b.status !== 'dispatched') return fail('state');
    const due = at(b.start, windowEnd(b.handoffWindow)), t = new Date(when);
    const lateHours = Math.max(0, (t - due) / 36e5);
    b.status = 'handed_over'; b.handedOverAt = t.toISOString(); b.handoffOnTime = lateHours === 0; b.handoffLateHours = lateHours;
    log(b, when, b.handoffOnTime ? 'Handed over inside the 2-hour window. Condition photos taken.' : `Handed over ${lateHours.toFixed(1)} hours after the window.`);
    if (lateHours > CFG.lateHandoffRefundHours) {
      b.money.refunded += CFG.deliveryFee;
      log(b, when, `More than 2 hours late: delivery fee refunded (€${CFG.deliveryFee}).`);
    }
    return { ok: true, onTime: b.handoffOnTime, lateHours };
  }
  /** Stroller faulty at handoff: replace within 4 hours or refund in full. */
  function reportFaulty(db, id, resolution, now) {
    const b = booking(db, id); if (!b || !['dispatched', 'handed_over'].includes(b.status)) return fail('state');
    const old = unit(db, b.unitId);
    if (resolution === 'replace') {
      const other = freeUnits(db, b.start, b.end, b.id).find(u => u.id !== b.unitId && inspectionValid(u, now));
      if (!other) return fail('no_replacement');
      old.status = 'repair'; history(old, now, 'repair', `Reported faulty at handoff for booking ${b.id}`);
      other.status = 'out'; history(other, now, 'rental', `Replacement for booking ${b.id}`);
      b.unitId = other.id; b.replaceBy = new Date(new Date(now).getTime() + CFG.faultyReplaceHours * 36e5).toISOString();
      log(b, now, `Stroller faulty at handoff. Replacement ${other.id} due within ${CFG.faultyReplaceHours} hours.`);
      return { ok: true, unitId: other.id };
    }
    const refund = b.money.charged - b.money.refunded;
    old.status = 'repair'; history(old, now, 'repair', `Reported faulty at handoff for booking ${b.id}`);
    b.status = 'closed'; b.closedReason = 'faulty_refund'; b.money.refunded += refund; b.hold.status = 'released';
    log(b, now, `Stroller faulty at handoff. €${refund} refunded in full. Card hold released.`);
    return { ok: true, refund };
  }
  function recordCollection(db, id, when, photoTaken) {
    const b = booking(db, id); if (!b || b.status !== 'handed_over') return fail('state');
    if (!photoTaken) return fail('photo');
    const lateDays = Math.max(0, diffDays(b.end, iso(new Date(when))));
    b.status = 'returned'; b.returnedAt = new Date(when).toISOString(); b.returnPhoto = true; b.lateDays = lateDays;
    b.holdReleaseBy = addWorkingDays(iso(new Date(when)), CFG.holdReleaseWorkingDays);
    const u = unit(db, b.unitId); u.status = 'inspection'; history(u, when, 'rental', `Returned from booking ${b.id}`);
    log(b, when, 'Stroller collected. Return photo taken.');
    if (lateDays > 0) {
      const fee = lateDays * CFG.dailyRate;
      b.money.extras.push({ label: `Late return, ${lateDays} extra day${lateDays > 1 ? 's' : ''}`, amount: fee }); b.money.charged += fee;
      log(b, when, `Returned ${lateDays} day${lateDays > 1 ? 's' : ''} late: €${fee} charged at the daily rate.`);
    }
    return { ok: true, lateDays };
  }
  function markLost(db, id, now) {
    const b = booking(db, id); if (!b || b.status !== 'handed_over') return fail('state');
    if (diffDays(b.end, iso(new Date(now))) <= CFG.lostAfterDays) return fail('too_soon');
    const extra = CFG.replacementCost - CFG.hold;
    b.status = 'lost'; b.hold.status = 'captured';
    b.money.extras.push({ label: 'Replacement cost, minus the card hold', amount: extra }); b.money.charged += extra;
    const u = unit(db, b.unitId); u.status = 'retired'; history(u, now, 'retired', `Not returned from booking ${b.id}`);
    log(b, now, `Not returned ${CFG.lostAfterDays} days after the end date: treated as lost. €${CFG.hold} hold kept and €${extra} charged.`);
    return { ok: true, extra };
  }
  /** Return inspection: checklist result plus any damaged parts. Ordinary wear is never charged. */
  function inspectReturn(db, id, results, damagedParts, now) {
    const b = booking(db, id); if (!b || b.status !== 'returned') return fail('state');
    const parts = (damagedParts || []).filter(p => p in CFG.damage);
    const charge = Math.min(parts.reduce((s, p) => s + CFG.damage[p], 0), CFG.replacementCost);
    inspectUnit(db, b.unitId, results, now);
    b.status = 'closed'; b.closedReason = charge ? 'damage' : 'clean';
    if (charge) {
      const fromHold = Math.min(charge, b.hold.amount), over = charge - fromHold;
      b.hold.status = 'captured'; b.hold.captured = fromHold; b.damage = { parts, charge };
      b.money.extras.push({ label: `Damage: ${parts.join(', ')}`, amount: charge }); b.money.charged += charge;
      log(b, now, `Damage found (${parts.join(', ')}): €${charge} charged${over ? `, €${fromHold} from the hold and €${over} to the card` : ' from the card hold'}. The rest of the hold is released.`);
    } else {
      b.hold.status = 'released'; b.hold.releasedAt = new Date(now).toISOString();
      log(b, now, `No damage beyond ordinary wear. €${b.hold.amount} hold released.`);
    }
    return { ok: true, charge };
  }

  /* ---------- Pop-up (paused in the pilot; prices are the PRD's survey mid-points) ---------- */
  const configFor = ageMonths => CFG.popup.configs.find(c => ageMonths >= c.minMonths && ageMonths <= c.maxMonths) || null;
  function createSub(db, d, now) {
    const plan = CFG.popup.plans[d.plan]; if (!plan) return fail('plan');
    const missing = ['name', 'email', 'phone', 'address', 'startDate', 'ageMonths'].filter(k => d[k] === undefined || String(d[k]).trim() === '');
    if (missing.length) return { ok: false, error: 'missing', missing };
    if (!/^\S+@\S+\.\S+$/.test(d.email)) return { ok: false, error: 'missing', missing: ['email'] };
    if (!inZone(d.postcode)) return fail('zone');
    if (d.startDate <= iso(new Date(now))) return fail('dates');
    const config = configFor(Number(d.ageMonths)); if (!config) return fail('fit');
    const s = {
      id: newId(db, 'p'), kind: 'popup', status: 'active', plan: plan.id, price: plan.price,
      createdAt: new Date(now).toISOString(), startDate: d.startDate, window: d.window || CFG.windows[1],
      nextPayment: addDays(d.startDate, CFG.popup.monthDays),
      address: d.address, postcode: d.postcode, child: { ageMonths: Number(d.ageMonths) }, config: config.id,
      contact: { name: d.name, email: d.email, phone: d.phone },
      exchanges: [], accessories: [], hold: { amount: CFG.hold, status: 'held' }, events: [],
    };
    log(s, now, `${plan.name} plan started: €${plan.price} for the first ${CFG.popup.monthDays} days. €${CFG.hold} card hold placed.`);
    db.subs.push(s); return { ok: true, sub: s };
  }
  function updateChild(db, id, ageMonths, now) {
    const s = sub(db, id); if (!s || s.status !== 'active') return fail('state');
    s.child.ageMonths = Number(ageMonths);
    const c = configFor(s.child.ageMonths);
    log(s, now, `Child's age updated.`);
    return { ok: true, suggested: c && c.id !== s.config ? c : null, outgrown: !c };
  }
  function requestExchange(db, id, date, window, now) {
    const s = sub(db, id); if (!s || s.status !== 'active') return fail('state');
    const c = configFor(s.child.ageMonths); if (!c || c.id === s.config) return fail('no_change');
    if (!date || date <= iso(new Date(now))) return fail('dates');
    s.exchanges.push({ at: new Date(now).toISOString(), from: s.config, to: c.id, date, window });
    s.config = c.id; log(s, now, `Exchange to the ${c.name} booked for ${nice(date)}, ${window} to ${windowEnd(window)}.`);
    return { ok: true, config: c };
  }
  function requestAccessory(db, id, accessoryId, now) {
    const s = sub(db, id); if (!s || s.status !== 'active') return fail('state');
    if (s.plan !== 'premium') return fail('premium_only');
    const a = offeredAccessories().find(x => x.id === accessoryId); if (!a) return fail('accessory');
    if (s.accessories.includes(a.id)) return fail('already');
    s.accessories.push(a.id); log(s, now, `${a.name} requested. Included in Premium.`); return { ok: true };
  }
  function endSub(db, id, date, window, now) {
    const s = sub(db, id); if (!s || s.status !== 'active') return fail('state');
    if (!date || date <= iso(new Date(now))) return fail('dates');
    s.status = 'ending'; s.endDate = date; s.collectWindow = window; s.holdReleaseBy = addWorkingDays(date, CFG.holdReleaseWorkingDays);
    log(s, now, `Rental ends ${nice(date)}. Collection booked for ${window} to ${windowEnd(window)}. No more payments will be taken.`);
    return { ok: true };
  }

  /* ---------- metrics (PRD "Success metrics and tracking") ---------- */
  function metrics(db, now) {
    const s = db.searches, n = r => s.filter(x => x.result === r).length;
    const made = db.bookings.filter(b => !['requested', 'declined'].includes(b.status)).length;
    const handoffs = db.bookings.filter(b => b.handedOverAt);
    const closed = db.bookings.filter(b => b.status === 'closed' && b.closedReason !== 'faulty_refund');
    const rated = closed.filter(b => b.rating);
    const today = new Date(now), first = iso(new Date(today.getFullYear(), today.getMonth(), 1)), last = iso(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const inFleet = db.units.filter(u => u.status !== 'retired'), down = db.units.filter(u => ['repair', 'quarantine'].includes(u.status)).length;
    let rented = 0;
    for (const b of db.bookings.filter(b => !['cancelled', 'declined'].includes(b.status) && b.closedReason !== 'faulty_refund')) {
      const a = b.start > first ? b.start : first, z = b.end < last ? b.end : last;
      if (a <= z) rented += rentalDays(a, z);
    }
    const fleetDays = inFleet.length * rentalDays(first, last);
    return {
      searches: s.length, available: n('available'), deniedZone: n('denied_zone'), deniedFull: n('denied_full'), deniedFit: n('denied_fit'),
      conversion: n('available') ? made / n('available') : null,
      deniedDemand: s.length ? (n('denied_zone') + n('denied_full')) / s.length : null,
      onTime: handoffs.length ? handoffs.filter(b => b.handoffOnTime).length / handoffs.length : null, handoffs: handoffs.length,
      utilization: fleetDays ? rented / fleetDays : null, rentedDays: rented, fleetDays, unitsDown: down,
      revenue: db.bookings.reduce((t, b) => t + b.money.charged - b.money.refunded, 0),
      satisfaction: rated.length ? rated.reduce((t, b) => t + b.rating, 0) / rated.length : null, ratings: rated.length,
      responseRate: closed.length ? rated.length / closed.length : null,
    };
  }

  return {
    CFG, iso, parse, addDays, diffDays, rentalDays, at, addWorkingDays, addWorkingHours, windowEnd,
    newDb, unit, booking, sub, BLOCKED, ACTIVE,
    inZone, fit, validateDates, freeUnits, offeredAccessories, search, joinWaitlist, quote,
    createBooking, handoffAt, cancellationTerms, cancelBooking, canChangeDates, changeDates, rate,
    confirmBooking, declineBooking, assignUnit, inspectUnit, cleanUnit, setUnitStatus, inspectionValid, dispatch,
    recordHandoff, reportFaulty, recordCollection, markLost, inspectReturn,
    configFor, createSub, updateChild, requestExchange, requestAccessory, endSub, metrics,
  };
});
