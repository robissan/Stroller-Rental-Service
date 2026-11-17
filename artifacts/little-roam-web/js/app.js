/* Little Roam screens: Flying booking, booking page, Pop-up plan, back office. Rules live in roam.js. */
(() => {
  'use strict';
  const R = window.Roam, C = R.CFG, APP = document.getElementById('app');
  const now = () => (window.__ROAM_NOW ? new Date(window.__ROAM_NOW) : new Date());

  /* ---------- storage: this device only, with an in-memory fallback ---------- */
  const KEY = 'littleroam.v2'; let mem = null;
  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 2) return d; } catch (e) { /* no storage */ }
    return mem || R.newDb();
  }
  let db = load();
  function save() { mem = db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* keep in memory */ } }

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = n => '€' + (Number.isInteger(n) ? n : n.toFixed(2));
  const dFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const tFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const day = isoDate => dFmt.format(R.parse(isoDate));
  const when = t => tFmt.format(new Date(t));
  const win = w => `${w} to ${R.windowEnd(w)}`;
  const pct = v => (v === null ? 'No data yet' : Math.round(v * 100) + '%');
  const local = d => `${R.iso(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const tomorrow = () => R.addDays(R.iso(now()), 1);
  const AGES = [[3, 'Under 6 months'], [8, '6 to 11 months'], [18, '1 year'], [30, '2 years'], [42, '3 years'], [60, '4 or older']];
  const ageLabel = m => (AGES.find(a => a[0] === Number(m)) || [0, `${m} months`])[1];
  const PHOTOS = [['frames/f-000.webp', 'Wren stroller from the front, seat facing forward'], ['frames/f-010.webp', 'Wren stroller with the seat turned to face the parent'], ['frames/f-020.webp', 'Wren stroller folded flat']];
  const STATUS = {
    requested: ['Waiting for confirmation', 'mari'], confirmed: ['Confirmed', ''], dispatched: ['On its way', 'sky'], handed_over: ['With you', 'dark'],
    returned: ['Returned, being checked', 'sky'], closed: ['Closed', 'plain'], cancelled: ['Cancelled', 'plain'], declined: ['Declined and refunded', 'rust'], lost: ['Treated as lost', 'rust'],
    active: ['Active', 'dark'], ending: ['Ending', 'mari'],
    available: ['Available', ''], out: ['Out on rental', 'dark'], inspection: ['Needs inspection', 'mari'], cleaning: ['Needs cleaning', 'sky'], quarantine: ['Quarantine', 'rust'], repair: ['In repair', 'rust'], retired: ['Retired', 'plain'],
  };
  const pill = s => `<span class="pill ${STATUS[s][1]}" data-status="${s}">${STATUS[s][0]}</span>`;
  const field = (name, label, value, o = {}) => `
    <div class="field ${o.err ? 'bad' : ''}">
      <label for="${name}">${label}</label>
      ${o.hint ? `<span class="hint" id="${name}-hint">${o.hint}</span>` : ''}
      <input id="${name}" name="${name}" type="${o.type || 'text'}" value="${esc(value)}" ${o.attrs || ''} ${o.err ? `aria-invalid="true" aria-describedby="${name}-err"` : ''}>
      ${o.err ? `<span class="err" id="${name}-err">${o.err}</span>` : ''}
    </div>`;
  const select = (name, label, value, options, o = {}) => `
    <div class="field ${o.err ? 'bad' : ''}">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" ${o.err ? `aria-invalid="true" aria-describedby="${name}-err"` : ''}>
        ${o.placeholder ? `<option value="">${o.placeholder}</option>` : ''}
        ${options.map(([v, t]) => `<option value="${v}" ${String(v) === String(value) ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      ${o.err ? `<span class="err" id="${name}-err">${o.err}</span>` : ''}
    </div>`;
  const windows = () => C.windows.map(w => [w, win(w)]);
  const lines = (q, extra = '') => `<div class="lines">${q.lines.map(l => `<div><span>${esc(l.label)}</span><span>${l.amount ? eur(l.amount) : 'Included'}</span></div>`).join('')}${extra}</div>`;
  const DATE_ERR = { missing: 'Choose your dates.', past: 'Pick a start date from tomorrow.', too_soon: 'That first day is too soon for us to confirm. Pick a later one.', order: 'The return date is before the start date.', short: `Rentals are ${C.minDays} days or longer.`, long: `Rentals are ${C.maxDays} days or shorter.` };
  const readForm = (form, into) => { for (const [k, v] of new FormData(form)) into[k] = typeof v === 'string' ? v.trim() : v; };
  const emailOk = s => /^\S+@\S+\.\S+$/.test(s || '');

  function header(current) {
    const link = (hash, text) => `<a href="#${hash}" ${current === hash ? 'aria-current="page"' : ''}>${text}</a>`;
    return `<header class="app-top"><a class="mark" href="#top">Little Roam</a>
      <nav aria-label="Booking">${link('flying', 'Book a trip')}${link('popup', 'Monthly')}${link('trips', 'My bookings')}</nav></header>`;
  }
  const stepper = (labels, at) => `<ol class="stepper" aria-label="Progress">${labels.map((l, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}" ${i === at ? 'aria-current="step"' : ''}>${l}</li>`).join('')}</ol>`;
  const termsHtml = () => `
    <dl class="terms">
      <div><dt>Cancelling</dt><dd>Free until ${C.freeCancelHours} hours before handoff. ${C.lateCancelRefundPct}% back after that. Nothing back once you have the stroller.</dd></div>
      <div><dt>Changing dates</dt><dd>Free until ${C.freeCancelHours} hours before handoff, if a stroller is free.</dd></div>
      <div><dt>Card hold</dt><dd>${eur(C.hold)} is held on your card, not charged. We release it within ${C.holdReleaseWorkingDays} working days of a clean return.</dd></div>
      <div><dt>Damage</dt><dd>Normal wear is free. Damaged parts are charged from a set list: wheel ${eur(C.damage.wheel)}, canopy ${eur(C.damage.canopy)}, frame ${eur(C.damage.frame)}. Never more than the stroller's replacement cost.</dd></div>
      <div><dt>Late return</dt><dd>${eur(C.dailyRate)} for each extra day. After ${C.lostAfterDays} days we treat the stroller as lost.</dd></div>
    </dl>`;

  /* ================= Flying ================= */
  const F0 = () => ({ step: 'check', method: 'delivery', address: '', postcode: '', start: '', end: '', age: '', res: null, err: {}, acc: [], hw: '10:00', cw: '10:00', name: '', email: '', phone: '', wl: null });
  let F = F0();
  const fSteps = ['Check', 'Book', 'Receive', 'Return'];

  function flyingCheck() {
    const e = F.err, del = F.method === 'delivery';
    return `<main class="shell">
      ${stepper(fSteps, 0)}
      <h1>Check your trip</h1>
      <p class="lede">A stroller in ${C.city}, delivered or picked up. ${eur(C.dailyRate)} a day, ${C.minDays} to ${C.maxDays} days.</p>
      <form class="card" data-act="f-check" novalidate>
        <fieldset><legend class="legend">How do you want to get it?</legend>
          <div class="choice cols">
            <label><input type="radio" name="method" value="delivery" ${del ? 'checked' : ''} data-change="f-method"><span><b>Delivered to you</b><span>Hotel or flat in ${C.city}</span></span></label>
            <label><input type="radio" name="method" value="pickup" ${del ? '' : 'checked'} data-change="f-method"><span><b>I'll pick it up</b><span>${C.pickup.area}</span></span></label>
          </div>
        </fieldset>
        ${del ? `<div class="two">${field('address', 'Address', F.address, { err: e.address, attrs: 'autocomplete="street-address"' })}${field('postcode', 'Postcode', F.postcode, { err: e.postcode, attrs: 'inputmode="numeric" autocomplete="postal-code" maxlength="5"' })}</div>` : ''}
        <div class="field ${e.dates ? 'bad' : ''}">
          <span class="legend" id="when-l">Dates and times</span>
          <button type="button" class="when" id="when" data-act="cal-open" aria-describedby="when-l${e.dates ? ' when-err' : ''}">${F.start && F.end
            ? `<b>${day(F.start)}, ${win(F.hw)}</b><span>to ${day(F.end)}, ${win(F.cw)}</span>`
            : '<span class="ph">Choose dates</span>'}</button>
          ${e.dates ? `<span class="err" id="when-err">${e.dates}</span>` : ''}
        </div>
        ${select('age', "Child's age", F.age, AGES, { placeholder: 'Choose an age', err: e.age })}
        <button class="btn block" type="submit">Check availability</button>
      </form>
      ${F.res ? flyingResult() : ''}
    </main>`;
  }
  function flyingResult() {
    const r = F.res, m = C.model;
    if (r.ok) {
      const q = R.quote(F.start, F.end, [], F.method);
      return `<section class="card sage" id="result" tabindex="-1" data-result="yes">
          <h2>Yes, we can ${F.method === 'delivery' ? `deliver to ${esc(F.postcode)}` : 'have one ready to pick up'}.</h2>
          <p>${day(F.start)} to ${day(F.end)}: ${q.days} days, ${eur(q.days * C.dailyRate)} before add-ons.</p>
        </section>
        <section class="card" id="model">
          <div class="spread"><h2>Your stroller: the ${m.name}</h2><span class="pill">Fits your child</span></div>
          <div class="photos">${PHOTOS.map(p => `<img src="${p[0]}" alt="${p[1]}" loading="lazy">`).join('')}</div>
          <dl class="specs">
            <dt>Age</dt><dd>${m.minMonths} months to 4 years</dd>
            <dt>Weight</dt><dd>Up to ${m.maxKg} kg</dd>
            <dt>Folded</dt><dd>${m.folded}</dd>
            <dt>Weighs</dt><dd>${m.weightKg} kg</dd>
          </dl>
          <div class="pb-row"><div class="pb-sum"><b>${eur(q.total)}</b><span>${q.days} days, before extras</span></div><button class="btn" data-act="f-continue">Continue</button></div>
        </section>`;
    }
    const copy = {
      zone: [`We don't deliver to ${esc(F.postcode)} yet.`, `The pilot covers ${C.zone.label}. You can pick up in ${C.pickup.area} instead, or join the waitlist.`],
      full: ['No stroller is free for those dates.', "Try other dates, or join the waitlist and we'll email you if one frees up."],
      fit: r.fit.reason === 'too_young'
        ? [`The ${m.name} doesn't fit babies under ${m.minMonths} months.`, "It has no carrycot, so we can't rent it for your child yet."]
        : [`The ${m.name} fits children up to their 4th birthday.`, "We can't rent it for an older child."],
    }[r.reason];
    const waitlist = r.reason === 'fit' ? '' : F.wl === 'done'
      ? `<p role="status" data-waitlist="done"><b>You're on the waitlist.</b> Demo: saved on this device only.</p>`
      : `<form class="row" data-act="f-waitlist" novalidate>
           <div class="field" style="flex:1;min-width:14rem"><label for="wl">Email for the waitlist</label><input id="wl" name="wl" type="email" autocomplete="email" ${F.wl === 'bad' ? 'aria-invalid="true"' : ''}>${F.wl === 'bad' ? '<span class="err">Enter an email address, like you@example.com.</span>' : ''}</div>
           <button class="btn pine" type="submit" style="align-self:end">Join the waitlist</button>
         </form>`;
    return `<section class="card warn" id="result" tabindex="-1" data-result="no" data-reason="${r.reason}"><h2>${copy[0]}</h2><p>${copy[1]}</p>${waitlist}</section>`;
  }
  function flyingDetails() {
    const e = F.err;
    return `<main class="shell">
      ${stepper(fSteps, 1)}
      <a class="back" href="#flying" data-act="f-back">Back to dates</a>
      <h1>Your booking</h1>
      <form class="shell" style="padding:0" data-act="f-review" novalidate>
        <section class="card"><h2>Add an accessory</h2>
          <div class="choice">${R.offeredAccessories().map(a => `<label><input type="checkbox" name="acc" value="${a.id}" ${F.acc.includes(a.id) ? 'checked' : ''}><span><b>${a.name}</b><span>Fits the ${C.model.name}</span></span><span class="amt">+${eur(C.accessoryPrice)}</span></label>`).join('')}</div>
        </section>
        <section class="card"><h2>Your details</h2>
          ${field('name', 'Name', F.name, { err: e.name, attrs: 'autocomplete="name"' })}
          <div class="two">${field('email', 'Email', F.email, { type: 'email', err: e.email, attrs: 'autocomplete="email"' })}${field('phone', 'Phone', F.phone, { type: 'tel', err: e.phone, attrs: 'autocomplete="tel"' })}</div>
        </section>
        <div class="paybar" id="paybar"><div class="pb-row"><div class="pb-sum"><b data-running>${eur(R.quote(F.start, F.end, F.acc, F.method).total)}</b><span data-running-note>${runningNote(F.acc)}</span></div><button class="btn" type="submit">Review price</button></div></div>
      </form>
    </main>`;
  }
  function flyingReview() {
    const q = R.quote(F.start, F.end, F.acc, F.method);
    return `<main class="shell">
      ${stepper(fSteps, 1)}
      <a class="back" href="#flying" data-act="f-details">Back to your details</a>
      <h1>Review and pay</h1>
      ${deadlineCard()}
      <section class="card" id="summary">
        <div class="spread"><h2>${C.model.name} stroller</h2><span>${day(F.start)} to ${day(F.end)}</span></div>
        ${lines(q, `<div class="sum"><span>Total to pay now</span><span data-total>${eur(q.total)}</span></div><div class="sub"><span>Card hold, not charged</span><span>${eur(q.hold)}</span></div>`)}
        <p>This is the full price. Nothing is added after this screen.</p>
      </section>
      <section class="card"><h2>${F.method === 'delivery' ? 'Delivery' : 'Pickup'}</h2>
        <dl class="specs"><dt>${F.method === 'delivery' ? 'Arrives' : 'Pick up'}</dt><dd>${day(F.start)}, ${win(F.hw)}</dd><dt>${F.method === 'delivery' ? 'Collected' : 'Bring back'}</dt><dd>${day(F.end)}, ${win(F.cw)}</dd><dt>Where</dt><dd>${F.method === 'delivery' ? `${esc(F.address)}, ${esc(F.postcode)}` : `${C.pickup.name}, ${C.pickup.area}`}</dd></dl>
      </section>
      <section class="card"><details class="terms-box"><summary>All terms</summary>${termsHtml()}</details></section>
      ${F.err.pay ? `<p class="err" role="alert">${F.err.pay}</p>` : ''}
      <div class="paybar"><div class="pb-row"><div class="pb-sum"><b>${eur(q.total)}</b><span>${runningNote(F.acc)}</span></div><button class="btn" data-act="f-pay">Pay ${eur(q.total)}</button></div>
        <p class="pb-legal">By paying you agree to pay the total shown and to the terms above. Demo: no card is taken and no money moves.</p></div>
    </main>`;
  }
  const runningNote = acc => [`${R.rentalDays(F.start, F.end)} days`, ...acc.map(id => C.accessories.find(a => a.id === id).name.toLowerCase())].join(' + ');
  function deadlineCard() {
    const del = F.method === 'delivery', freeUntil = new Date(R.at(F.start, F.hw).getTime() - C.freeCancelHours * 36e5);
    return now() < freeUntil
      ? `<section class="card sky" id="deadline"><h2>Free cancellation until ${when(freeUntil)}</h2><p>After that, ${C.lateCancelRefundPct}% back until ${del ? 'delivery' : 'pickup'}. Nothing back once you have the stroller.</p></section>`
      : `<section class="card sky" id="deadline"><h2>Cancelling gives ${C.lateCancelRefundPct}% back</h2><p>Your ${del ? 'delivery' : 'pickup'} is less than ${C.freeCancelHours} hours away. Nothing back once you have the stroller.</p></section>`;
  }
  function viewFlying() { return header('flying') + (F.step === 'details' ? flyingDetails() : F.step === 'review' ? flyingReview() : flyingCheck()); }

  /* ================= Booking page ================= */
  let justBooked = null, B = { panel: null, err: null, msg: null };
  function viewBooking(id) {
    const b = R.booking(db, id);
    if (!b) return header('trips') + `<main class="shell"><h1>We can't find that booking</h1><p class="lede">Bookings in this demo are saved on the device that made them.</p><a class="btn" href="#flying">Book a trip</a></main>`;
    const ORDER = ['requested', 'confirmed', 'dispatched', 'handed_over', 'returned', 'closed'];
    const isNew = justBooked === id && b.status === 'requested', done = s => ORDER.indexOf(b.status) >= ORDER.indexOf(s);
    const del = b.method === 'delivery', where = del ? `${esc(b.address)}, ${esc(b.postcode)}` : `${C.pickup.name}, ${C.pickup.area}`;
    const live = ['requested', 'confirmed', 'dispatched'].includes(b.status), terms = R.cancellationTerms(b, now()), u = R.unit(db, b.unitId);
    const remind = new Date(R.handoffAt(b).getTime() - 24 * 36e5), guide = location.href.split('#')[0] + '#fold-guide';
    const stepAt = { requested: 1, confirmed: 1, dispatched: 2, handed_over: 2, returned: 3, closed: 4, lost: 3 }[b.status];
    const net = b.money.charged - b.money.refunded;
    let qr = '';
    try { const q = window.qrcode(0, 'M'); q.addData(guide); q.make(); qr = q.createSvgTag({ cellSize: 3, margin: 2 }); } catch (e) { /* link only */ }
    return header('trips') + `<main class="shell" data-booking="${b.id}" data-state="${b.status}">
      ${stepAt === undefined ? '' : stepper(fSteps, stepAt)}
      ${isNew ? `<section class="card sage" role="status" id="confirmed"><h2>You're booked.</h2><p>We confirm within ${C.confirmWorkingHours} working hours. If we can't, you get a full refund automatically.</p></section>` : ''}
      ${B.msg ? `<p class="flash" role="status">${B.msg}</p>` : ''}
      <div class="spread"><h1 style="font-family:var(--display);font-size:clamp(28px,5vw,38px);letter-spacing:-.02em;line-height:1.1">Booking ${b.id.toUpperCase()}</h1>${pill(b.status)}</div>

      ${isNew ? `<section class="card"><h2>Your confirmation email</h2>
        <div class="mail" id="mail">
          <span class="meta">To ${esc(b.contact.email)}, sent ${when(b.createdAt)}</span>
          <b>Your Little Roam booking ${b.id.toUpperCase()}</b>
          <span>${del ? 'Delivery' : 'Pickup'}: ${day(b.start)}, ${win(b.handoffWindow)}, ${where}.</span>
          <span>${del ? 'Collection' : 'Return'}: ${day(b.end)}, ${win(b.collectWindow)}.</span>
          <span>Paid ${eur(b.quote.total)}. ${eur(b.hold.amount)} held on your card.</span>
          <a href="#booking-${b.id}">Change or cancel this booking</a>
        </div>
        <p class="hint">Demo: this is what the email would say. Nothing is sent.</p></section>` : ''}

      <section class="card"><h2>What happens next</h2>
        <ol class="timeline">
          <li class="done"><b>Booked and paid</b><span>${when(b.createdAt)}</span></li>
          <li class="${done('confirmed') ? 'done' : b.status === 'requested' ? 'now' : ''}"><b>We confirm</b><span>${b.confirmedAt ? when(b.confirmedAt) : `By ${when(b.confirmBy)}`}</span></li>
          <li><b>Reminder</b><span>${when(remind)}, by email, 24 hours before</span></li>
          <li class="${done('handed_over') ? 'done' : ['confirmed', 'dispatched'].includes(b.status) ? 'now' : ''}" id="handoff"><b>${del ? 'Delivery' : 'Pickup'}: ${day(b.start)}, ${win(b.handoffWindow)}</b><span>${where}. ${b.handedOverAt ? `Handed over ${when(b.handedOverAt)}.` : b.dispatchedAt ? `Stroller ${u.id} is on its way. It passed inspection ${when(u.lastInspection.at)}.` : 'Every stroller is inspected in the 24 hours before it leaves.'}</span></li>
          <li class="${done('returned') ? 'done' : b.status === 'handed_over' ? 'now' : ''}" id="return"><b>${del ? 'Collection' : 'Return'}: ${day(b.end)}, ${win(b.collectWindow)}</b><span>${b.returnedAt ? `Collected ${when(b.returnedAt)}. Return photo taken.` : 'Booked at checkout. The courier photographs the stroller.'}</span></li>
          <li class="${b.hold.status !== 'held' ? 'done' : b.status === 'returned' ? 'now' : ''}" id="hold"><b>Card hold ${b.hold.status === 'released' ? 'released' : b.hold.status === 'captured' ? 'used for charges' : 'released'}</b><span>${b.hold.status === 'released' ? `${eur(b.hold.amount)} released.` : b.hold.status === 'captured' ? `${eur(b.hold.captured || b.hold.amount)} kept. See charges below.` : `${eur(b.hold.amount)}, by ${day(b.holdReleaseBy || R.addWorkingDays(b.end, C.holdReleaseWorkingDays))} if the stroller comes back clean.`}</span></li>
        </ol>
      </section>

      ${['confirmed', 'dispatched', 'handed_over'].includes(b.status) || isNew ? `<section class="card sky" id="guide"><h2>Folding guide</h2>
        <div class="qr">${qr}<div><p>One minute, four steps. The same code is on the stroller's handle.</p><a class="btn pine small" href="#fold-guide" style="margin-top:10px">Open the folding guide</a></div></div></section>` : ''}

      <section class="card"><h2>Price</h2>
        ${lines(b.quote, b.money.extras.map(x => `<div><span>${esc(x.label)}</span><span>${eur(x.amount)}</span></div>`).join('') +
          (b.money.refunded ? `<div><span>Refunded</span><span>−${eur(b.money.refunded)}</span></div>` : '') +
          `<div class="sum"><span>${net === b.quote.total ? 'Paid' : 'Net paid'}</span><span data-net>${eur(net)}</span></div>`)}
      </section>

      ${b.status === 'closed' && b.closedReason !== 'faulty_refund' ? `<section class="card" id="rating"><h2>How was it?</h2>
        ${b.rating ? `<p role="status">Thanks. You rated this rental ${b.rating} out of 5.</p>` : `<div class="stars" role="group" aria-label="Rate from 1 to 5">${[1, 2, 3, 4, 5].map(n => `<button data-act="b-rate" data-n="${n}" aria-label="${n} out of 5">${n}</button>`).join('')}</div>`}</section>` : ''}

      ${live ? `<section class="card" id="manage"><h2>Change or cancel</h2>
        ${B.panel === 'cancel' ? `<div id="cancel-panel" style="display:grid;gap:12px"><p><b>You'll get ${eur(terms.refund)} back (${terms.pct}%).</b> ${terms.pct === 100 ? `It's more than ${C.freeCancelHours} hours before handoff, so cancelling is free.` : `It's less than ${C.freeCancelHours} hours before handoff.`} The card hold is released.</p>
            <div class="row"><button class="btn danger" data-act="b-cancel-yes">Cancel booking</button><button class="btn ghost" data-act="b-panel" data-panel="">Keep booking</button></div></div>`
        : `<p>${R.canChangeDates(b, now()) ? `Free until ${when(new Date(R.handoffAt(b).getTime() - C.freeCancelHours * 36e5))}.` : b.status === 'dispatched' ? `The stroller is on its way, so the dates can't change. You can still cancel for ${terms.pct}% back.` : `Dates can't change in the last ${C.freeCancelHours} hours. You can still cancel for ${terms.pct}% back.`}</p>
           <div class="row">${R.canChangeDates(b, now()) ? '<button class="btn ghost" data-act="b-change">Change dates</button>' : ''}<button class="btn danger" data-act="b-panel" data-panel="cancel">Cancel booking</button></div>`}
      </section>` : ''}

      <section class="card"><h2>Activity</h2><ul class="log">${b.events.map(e => `<li>${when(e.at)}: ${esc(e.text)}</li>`).join('')}</ul></section>
      <p class="hint">Need help? Email or WhatsApp us, Monday to Friday, ${C.workStart}:00 to ${C.workEnd}:00.</p>
    </main>`;
  }
  function viewGuide() {
    return header('') + `<main class="shell"><h1>Fold the ${C.model.name} in one minute</h1>
      <section class="card"><div class="photos" style="grid-template-columns:1fr 1fr"><img src="frames/f-000.webp" alt="Wren stroller open"><img src="frames/f-020.webp" alt="Wren stroller folded flat"></div>
      <ol class="guide"><li><span><b>Empty it and lock the brake.</b> Take your child and bags out. Press the red pedal down.</span></li><li><span><b>Close the canopy.</b> Push it back until it sits flat.</span></li><li><span><b>Squeeze both handle buttons.</b> Push the handle down towards the wheels.</span></li><li><span><b>Wait for the click.</b> The fold lock holds it shut. Carry it by the frame.</span></li></ol>
      <p>To open it, release the fold lock and lift the handle until it clicks.</p></section>
      <p class="hint">Demo guide for a concept model. The real one follows the maker's manual.</p></main>`;
  }
  function viewTrips() {
    const all = [...db.bookings, ...db.subs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return header('trips') + `<main class="shell"><h1>My bookings</h1>
      ${all.length ? `<section class="card">${all.map(x => `<div class="job"><div class="spread"><a class="who" href="#${x.kind === 'flying' ? 'booking' : 'plan'}-${x.id}">${x.kind === 'flying' ? `Trip, ${day(x.start)} to ${day(x.end)}` : `${C.popup.plans[x.plan].name} monthly plan`}</a>${pill(x.status)}</div><span class="meta">${x.id.toUpperCase()}</span></div>`).join('')}</section>`
        : `<section class="card"><h2>Nothing booked yet</h2><p>Bookings you make on this device show up here.</p><div class="row"><a class="btn" href="#flying">Book a trip</a><a class="btn ghost" href="#popup">See monthly plans</a></div></section>`}
    </main>`;
  }

  /* ================= Pop-up ================= */
  const P0 = () => ({ step: 'plan', plan: 'basic', age: '', address: '', postcode: '', startDate: '', window: '10:00', name: '', email: '', phone: '', err: {} });
  let P = P0(), M = { msg: null, err: null, suggest: null };
  const pSteps = ['Plan', 'Home', 'Review', 'Manage'];
  const paused = `<section class="card sky" id="paused"><h2>Paused in the pilot</h2><p>Monthly plans aren't on sale yet. At ${eur(C.popup.plans.basic.price)} a month Basic loses money, so we're testing prices first. This demo shows how it would work.</p></section>`;
  const cfgPhoto = id => (id === 'carrycot' ? ['frames/f-030.webp', 'Wren stroller with a carrycot and rain cover'] : PHOTOS[0]);
  function popupPlan() {
    const e = P.err, cfg = P.age ? R.configFor(Number(P.age)) : null;
    return `<main class="shell">${stepper(pSteps, 0)}<h1>A stroller by the month</h1>
      <p class="lede">For home in ${C.city}. Swap it as your child grows. Send it back when you're done.</p>
      ${paused}
      <form class="card" data-act="p-plan" novalidate>
        <fieldset><legend class="legend">Choose a plan</legend><div class="choice">
          ${Object.values(C.popup.plans).map(p => `<label><input type="radio" name="plan" value="${p.id}" ${P.plan === p.id ? 'checked' : ''}><span><b>${p.name}</b><span>${p.id === 'basic' ? 'The stroller, swapped as your child grows' : 'Basic, plus a rain cover or mosquito net when you ask'}</span></span><span class="amt">${eur(p.price)} a month</span></label>`).join('')}
        </div></fieldset>
        ${select('age', "Child's age", P.age, AGES, { placeholder: 'Choose an age', err: e.age })}
        ${cfg ? `<p id="fitted"><b>You'd start with the ${cfg.name}.</b> It fits from ${cfg.range}.</p>` : ''}
        <button class="btn block" type="submit">Continue</button>
      </form></main>`;
  }
  function popupHome() {
    const e = P.err;
    return `<main class="shell">${stepper(pSteps, 1)}<a class="back" href="#popup" data-act="p-go" data-step="plan">Back to plans</a><h1>Where and when</h1>
      <form class="shell" style="padding:0" data-act="p-home" novalidate>
        <section class="card"><h2>Delivery</h2>
          <div class="two">${field('address', 'Home address', P.address, { err: e.address, attrs: 'autocomplete="street-address"' })}${field('postcode', 'Postcode', P.postcode, { err: e.postcode, attrs: 'inputmode="numeric" maxlength="5" autocomplete="postal-code"' })}</div>
          <div class="two">${field('startDate', 'Start date', P.startDate, { type: 'date', err: e.startDate, attrs: `min="${tomorrow()}"` })}${select('window', 'Arrival window', P.window, windows())}</div>
        </section>
        <section class="card"><h2>Your details</h2>
          ${field('name', 'Name', P.name, { err: e.name, attrs: 'autocomplete="name"' })}
          <div class="two">${field('email', 'Email', P.email, { type: 'email', err: e.email, attrs: 'autocomplete="email"' })}${field('phone', 'Phone', P.phone, { type: 'tel', err: e.phone, attrs: 'autocomplete="tel"' })}</div>
        </section>
        <button class="btn block" type="submit">Review plan</button>
      </form></main>`;
  }
  function popupReview() {
    const p = C.popup.plans[P.plan], cfg = R.configFor(Number(P.age));
    return `<main class="shell">${stepper(pSteps, 2)}<a class="back" href="#popup" data-act="p-go" data-step="home">Back to delivery</a><h1>Review your plan</h1>
      <section class="card" id="psummary"><div class="spread"><h2>${p.name} plan</h2><span>${cfg.name}</span></div>
        <div class="lines"><div><span>First ${C.popup.monthDays} days</span><span>${eur(p.price)}</span></div><div><span>Delivery in zone</span><span>Included</span></div>
        <div class="sum"><span>Total to pay now</span><span data-total>${eur(p.price)}</span></div><div class="sub"><span>Then every ${C.popup.monthDays} days</span><span>${eur(p.price)}</span></div><div class="sub"><span>Card hold, not charged</span><span>${eur(C.hold)}</span></div></div>
      </section>
      <section class="card"><h2>Delivery</h2><dl class="specs"><dt>Arrives</dt><dd>${day(P.startDate)}, ${win(P.window)}</dd><dt>Where</dt><dd>${esc(P.address)}, ${esc(P.postcode)}</dd></dl></section>
      <section class="card"><h2>Terms</h2><dl class="terms">
        <div><dt>Swaps</dt><dd>When your child outgrows the stroller, book a swap. It's included.</dd></div>
        <div><dt>Ending</dt><dd>Book a collection any time. We take no more payments after that.</dd></div>
        <div><dt>Card hold</dt><dd>${eur(C.hold)} is held, not charged. Released within ${C.holdReleaseWorkingDays} working days of a clean return.</dd></div>
        <div><dt>Damage</dt><dd>Normal wear is free. Damaged parts are charged from a set list, never more than the replacement cost.</dd></div></dl></section>
      ${P.err.pay ? `<p class="err" role="alert">${P.err.pay}</p>` : ''}
      <button class="btn block" data-act="p-pay">Start plan and pay ${eur(p.price)}</button>
      <p class="hint" style="text-align:center">Demo: no card is taken and no money moves.</p></main>`;
  }
  function viewPopup() { return header('popup') + (P.step === 'home' ? popupHome() : P.step === 'review' ? popupReview() : popupPlan()); }
  function viewPlan(id) {
    const s = R.sub(db, id);
    if (!s) return header('trips') + `<main class="shell"><h1>We can't find that plan</h1><a class="btn" href="#popup">See monthly plans</a></main>`;
    const p = C.popup.plans[s.plan], cfg = C.popup.configs.find(c => c.id === s.config), ph = cfgPhoto(s.config), active = s.status === 'active';
    const want = R.configFor(s.child.ageMonths), swap = active && want && want.id !== s.config, outgrown = active && !want;
    return header('trips') + `<main class="shell" data-plan="${s.id}" data-state="${s.status}">
      ${stepper(pSteps, 3)}
      ${justBooked === id && !M.msg && active ? `<section class="card sage" role="status" id="started"><h2>Your plan has started.</h2><p>The ${cfg.name} arrives ${day(s.startDate)}, ${win(s.window)}.</p></section>` : ''}
      ${M.msg ? `<p class="flash" role="status">${M.msg}</p>` : ''}
      <div class="spread"><h1 style="font-family:var(--display);font-size:clamp(28px,5vw,38px);letter-spacing:-.02em;line-height:1.1">${p.name} plan</h1>${pill(s.status)}</div>
      <section class="card"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><img src="${ph[0]}" alt="${ph[1]}" style="width:92px;flex:none;aspect-ratio:3/4;object-fit:cover;border-radius:12px;border:1px solid var(--border)">
        <div style="display:grid;gap:8px;flex:1;min-width:0"><h2 id="config">${cfg.name}</h2><dl class="specs"><dt>Fits</dt><dd>${cfg.range}</dd><dt>Price</dt><dd>${eur(s.price)} every ${C.popup.monthDays} days</dd><dt>${active ? 'Next payment' : 'Ends'}</dt><dd>${active ? day(s.nextPayment) : `${day(s.endDate)}, collected ${win(s.collectWindow)}`}</dd>${s.accessories.length ? `<dt>Extras</dt><dd>${s.accessories.map(a => C.accessories.find(x => x.id === a).name).join(', ')}</dd>` : ''}</dl></div></div></section>
      ${active ? `<section class="card" id="grow"><h2>Has your child grown?</h2>
        <form class="row" data-act="m-age" novalidate><div style="flex:1;min-width:12rem">${select('age', "Child's age now", AGES.reduce((best, a) => (Math.abs(a[0] - s.child.ageMonths) < Math.abs(best - s.child.ageMonths) ? a[0] : best), AGES[0][0]), AGES)}</div><button class="btn ghost" type="submit" style="align-self:end">Update age</button></form>
        ${swap ? `<div id="swap" style="display:grid;gap:12px"><p><b>Time to swap to the ${want.name}.</b> It fits from ${want.range}. Swaps are included.</p>
          <form data-act="m-swap" novalidate style="display:grid;gap:12px"><div class="two">${field('date', 'Swap date', '', { type: 'date', err: M.err, attrs: `min="${tomorrow()}"` })}${select('window', 'Arrival window', '10:00', windows())}</div><button class="btn" type="submit">Book the swap</button></form></div>`
        : outgrown ? `<p id="outgrown"><b>Your child has outgrown the ${C.model.name}.</b> Book a collection below to end your plan.</p>` : `<p>The ${cfg.name} still fits.</p>`}
      </section>
      <section class="card" id="extras"><h2>Accessories</h2>
        ${s.plan === 'premium' ? `<p>Included in Premium. Ask for one when you need it.</p><div class="row">${R.offeredAccessories().map(a => (s.accessories.includes(a.id) ? `<span class="pill">${a.name} requested</span>` : `<button class="btn ghost small" data-act="m-acc" data-id="${a.id}">Request ${a.name.toLowerCase()}</button>`)).join('')}</div>`
        : `<p>Rain cover and mosquito net come with Premium, ${eur(C.popup.plans.premium.price)} a month.</p>`}
      </section>
      <section class="card" id="end"><h2>Send it back</h2><p>Pick a collection time. We take no more payments after that.</p>
        <form data-act="m-end" novalidate style="display:grid;gap:12px"><div class="two">${field('endDate', 'Collection date', '', { type: 'date', err: M.endErr, attrs: `min="${tomorrow()}"` })}${select('endWindow', 'Collection window', '10:00', windows())}</div><button class="btn danger" type="submit">Book collection and end plan</button></form>
      </section>` : `<section class="card sage" id="ending"><h2>Collection booked</h2><p>${day(s.endDate)}, ${win(s.collectWindow)}. The ${eur(s.hold.amount)} card hold is released by ${day(s.holdReleaseBy)} if the stroller comes back clean.</p></section>`}
      <section class="card"><h2>Activity</h2><ul class="log">${s.events.map(e => `<li>${when(e.at)}: ${esc(e.text)}</li>`).join('')}</ul></section>
    </main>`;
  }

  /* ================= Back office ================= */
  let O = { msg: null, from: '', to: '' };
  const OPS_ERR = { inspection: 'This unit needs a passed inspection in the last 24 hours before it can go out.', unit_blocked: 'This unit is not cleared for rental.', unit_not_free: 'That unit is not free for these dates.', photo: 'Take the return photo before recording the collection.', too_soon: `A stroller counts as lost ${C.lostAfterDays} days after the end date.`, no_replacement: 'No other inspected unit is free. Inspect one first, or refund.', no_unit: 'No unit is assigned.', state: 'That step is not available for this booking.', out: 'This unit is out on rental.' };
  function jobActions(b) {
    const u = R.unit(db, b.unitId), valid = R.inspectionValid(u, now());
    if (b.status === 'requested') return `<span class="meta">Confirm by ${when(b.confirmBy)}${now() > new Date(b.confirmBy) ? ' <span class="pill rust">Overdue</span>' : ''}</span><div class="row"><button class="btn small" data-act="o-confirm" data-id="${b.id}">Confirm</button><button class="btn danger small" data-act="o-decline" data-id="${b.id}">Decline and refund</button></div>`;
    if (b.status === 'confirmed') {
      const free = R.freeUnits(db, b.start, b.end, b.id);
      return `<div class="row"><label class="sr" for="u-${b.id}">Unit</label><select id="u-${b.id}">${free.map(x => `<option ${x.id === b.unitId ? 'selected' : ''}>${x.id}</option>`).join('')}</select><button class="btn ghost small" data-act="o-assign" data-id="${b.id}">Assign unit</button></div>
        <span class="meta">${valid ? `${u.id} passed inspection ${when(u.lastInspection.at)}.` : `${u ? u.id : 'No unit'} needs an inspection before dispatch.`}</span>
        <div class="row">${valid ? '' : `<button class="btn ghost small" data-act="o-inspect" data-unit="${b.unitId}">Inspect ${b.unitId}: pass</button>`}<button class="btn small" data-act="o-dispatch" data-id="${b.id}" ${valid ? '' : 'disabled'}>Dispatch</button></div>`;
    }
    if (b.status === 'dispatched') return `<div class="row"><label class="sr" for="h-${b.id}">Handoff time</label><input type="datetime-local" id="h-${b.id}" value="${local(new Date(R.handoffAt(b).getTime() + 30 * 6e4))}"><button class="btn small" data-act="o-handoff" data-id="${b.id}">Record handoff</button></div>
        <div class="row"><button class="btn ghost small" data-act="o-faulty" data-id="${b.id}" data-how="replace">Faulty: replace</button><button class="btn danger small" data-act="o-faulty" data-id="${b.id}" data-how="refund">Faulty: refund</button></div>`;
    if (b.status === 'handed_over') return `<div class="row"><label class="sr" for="c-${b.id}">Collection time</label><input type="datetime-local" id="c-${b.id}" value="${local(new Date(R.at(b.end, b.collectWindow).getTime() + 30 * 6e4))}"><label class="checks"><span style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="p-${b.id}"> Return photo taken</span></label></div>
        <div class="row"><button class="btn small" data-act="o-collect" data-id="${b.id}">Record collection</button><button class="btn danger small" data-act="o-lost" data-id="${b.id}">Mark as lost</button></div>`;
    if (b.status === 'returned') return `<div class="checks" id="k-${b.id}">${C.checklist.map(k => `<label><input type="checkbox" value="${k}" checked> ${k}</label>`).join('')}</div>
        <div class="checks" id="d-${b.id}"><b>Damaged:</b>${Object.keys(C.damage).map(k => `<label><input type="checkbox" value="${k}"> ${k} ${eur(C.damage[k])}</label>`).join('')}</div>
        <div class="row"><button class="btn small" data-act="o-inspect-return" data-id="${b.id}">Log return inspection</button></div>`;
    return `<span class="meta">${esc(b.events.at(-1).text)}</span>`;
  }
  function viewOps() {
    const m = R.metrics(db, now()), order = ['requested', 'confirmed', 'dispatched', 'handed_over', 'returned'];
    const jobs = [...db.bookings].sort((a, b) => (order.indexOf(a.status) + 9) % 9 - (order.indexOf(b.status) + 9) % 9 || (a.start < b.start ? -1 : 1));
    const from = O.from || tomorrow(), to = O.to || R.addDays(from, 4);
    const free = R.freeUnits(db, from, to);
    const acts = u => ({
      available: `<button class="btn ghost small" data-act="o-inspect" data-unit="${u.id}">Inspect: pass</button><button class="btn danger small" data-act="o-status" data-unit="${u.id}" data-to="repair">To repair</button>`,
      inspection: `<button class="btn ghost small" data-act="o-inspect" data-unit="${u.id}">Inspect: pass</button><button class="btn danger small" data-act="o-inspect-fail" data-unit="${u.id}">Inspect: fail</button>`,
      cleaning: `<button class="btn ghost small" data-act="o-clean" data-unit="${u.id}">Mark cleaned</button><button class="btn danger small" data-act="o-status" data-unit="${u.id}" data-to="quarantine">Quarantine</button>`,
      quarantine: `<button class="btn ghost small" data-act="o-status" data-unit="${u.id}" data-to="inspection">Clear for inspection</button>`,
      repair: `<button class="btn ghost small" data-act="o-status" data-unit="${u.id}" data-to="inspection">Repair done</button><button class="btn danger small" data-act="o-status" data-unit="${u.id}" data-to="retired">Retire</button>`,
    }[u.status] || '');
    return `<header class="app-top"><a class="mark" href="#top">Little Roam</a><nav aria-label="Back office"><a href="#ops" aria-current="page">Back office</a><a href="#flying">Parent view</a></nav></header>
    <main class="shell wide">
      <h1>Back office</h1>
      <p class="lede">${C.city} pilot. One model, ${db.units.length} units, run by hand.</p>
      ${O.msg ? `<p class="flash" role="status" id="flash">${O.msg}</p>` : ''}
      <section class="tiles" id="metrics" aria-label="Pilot metrics">
        <div class="tile" data-m="conversion"><span>Booking conversion</span><b>${pct(m.conversion)}</b><small>${m.available} search${m.available === 1 ? '' : 'es'} found a stroller</small></div>
        <div class="tile" data-m="denied"><span>Denied demand</span><b>${pct(m.deniedDemand)}</b><small>${m.deniedZone} out of zone, ${m.deniedFull} no unit free</small></div>
        <div class="tile" data-m="ontime"><span>On-time handoff</span><b>${pct(m.onTime)}</b><small>${m.handoffs} handoff${m.handoffs === 1 ? '' : 's'} recorded</small></div>
        <div class="tile" data-m="util"><span>Utilisation this month</span><b>${pct(m.utilization)}</b><small>${m.rentedDays} of ${m.fleetDays} fleet days. ${m.unitsDown} units down.</small></div>
        <div class="tile" data-m="revenue"><span>Revenue, net of refunds</span><b>${eur(m.revenue)}</b><small>Costs aren't logged yet, so no contribution figure</small></div>
        <div class="tile" data-m="sat"><span>Satisfaction</span><b>${m.satisfaction === null ? 'No data yet' : m.satisfaction.toFixed(1) + ' of 5'}</b><small>${m.ratings} rating${m.ratings === 1 ? '' : 's'}${m.responseRate === null ? '' : `, ${pct(m.responseRate)} response rate`}</small></div>
      </section>
      <div class="ops-grid">
        <section class="card" id="jobs"><h2>Bookings</h2>
          ${jobs.length ? jobs.map(b => `<div class="job" data-job="${b.id}" data-state="${b.status}">
              <div class="spread"><span class="who">${esc(b.contact.name)}, ${b.id.toUpperCase()}</span>${pill(b.status)}</div>
              <span class="meta">${day(b.start)} to ${day(b.end)}, ${b.method === 'delivery' ? esc(b.postcode) : 'pickup'}, unit ${b.unitId || 'none'}, ${eur(b.money.charged - b.money.refunded)}</span>
              ${jobActions(b)}</div>`).join('') : '<p>No bookings yet. Make one from the parent view.</p>'}
        </section>
        <div style="display:grid;gap:18px">
          <section class="card" id="avail"><h2>Free units by date</h2>
            <form class="row" data-act="o-avail" novalidate><div class="field" style="flex:1"><label for="from">From</label><input type="date" id="from" name="from" value="${from}"></div><div class="field" style="flex:1"><label for="to">To</label><input type="date" id="to" name="to" value="${to}"></div><button class="btn ghost small" type="submit" style="align-self:end;min-height:48px">Check</button></form>
            <p id="avail-out"><b>${free.length} of ${db.units.length} units free</b>${free.length ? `: ${free.map(u => u.id).join(', ')}` : ''}</p>
          </section>
          <section class="card" id="demand"><h2>Demand log</h2>
            <dl class="specs"><dt>Searches</dt><dd>${m.searches}</dd><dt>Out of zone</dt><dd>${m.deniedZone}</dd><dt>No unit free</dt><dd>${m.deniedFull}</dd><dt>Child outside range</dt><dd>${m.deniedFit}</dd><dt>Waitlist</dt><dd>${db.waitlist.length}</dd></dl>
          </section>
        </div>
      </div>
      <section class="card" id="fleet"><h2>Fleet</h2>
        <div style="overflow-x:auto"><table class="fleet"><thead><tr><th>Unit</th><th>Status</th><th>Last inspection</th><th>History</th><th>Actions</th></tr></thead><tbody>
          ${db.units.map(u => `<tr data-unit="${u.id}" data-state="${u.status}"><td><b>${u.id}</b></td><td>${pill(u.status)}</td><td>${u.lastInspection ? `${u.lastInspection.pass ? 'Passed' : 'Failed'} ${when(u.lastInspection.at)}` : 'None logged'}</td>
            <td><details><summary>${u.history.length} entr${u.history.length === 1 ? 'y' : 'ies'}</summary><ul class="log">${u.history.map(h => `<li>${h.at ? when(h.at) : 'Before the pilot'}: ${h.type}. ${esc(h.note)}</li>`).join('')}</ul></details></td>
            <td><div class="row">${acts(u)}</div></td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <div class="row"><button class="btn danger small" data-act="o-reset">Reset demo data</button><span class="hint">Everything here is saved on this device only.</span></div>
    </main>`;
  }

  /* ================= calendar sheet: dates and 2-hour windows in one place ================= */
  const CALROOT = document.createElement('dialog');
  CALROOT.className = 'cal'; CALROOT.setAttribute('aria-labelledby', 'cal-title');
  document.body.appendChild(CALROOT);
  let CAL = null;
  const longDay = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
  function openCal(o) {
    const earliest = R.earliestStart(now());
    CAL = { hw: '10:00', cw: '10:00', ...o, earliest, err: null, month: (o.start || earliest).slice(0, 7) };
    renderCal();
    if (!CALROOT.open) CALROOT.showModal();
    const f = CALROOT.querySelector('.day.s') || CALROOT.querySelector('.day:not([disabled])'); if (f) f.focus();
  }
  function closeCal() { if (CALROOT.open) CALROOT.close(); CAL = null; }
  function dayOff(d) {
    if (d < CAL.earliest) return true;
    if (CAL.start && !CAL.end && d > CAL.start) { const n = R.rentalDays(CAL.start, d); return n < C.minDays || n > C.maxDays; }
    return false;
  }
  function renderCal(focusDay) {
    const c = CAL, [y, m] = c.month.split('-').map(Number), first = new Date(y, m - 1, 1);
    const cells = Array.from({ length: (first.getDay() + 6) % 7 }, () => '<span aria-hidden="true"></span>');
    for (let n = 1; n <= new Date(y, m, 0).getDate(); n++) {
      const d = R.iso(new Date(y, m - 1, n)), s = d === c.start, e = d === c.end, r = c.start && c.end && d > c.start && d < c.end;
      cells.push(`<button type="button" class="day${s ? ' s' : ''}${e ? ' e' : ''}${r ? ' r' : ''}" data-day="${d}" ${dayOff(d) ? 'disabled' : ''} aria-pressed="${s || e}" aria-label="${longDay.format(R.parse(d))}${s ? ', first day' : e ? ', last day' : ''}">${n}</button>`);
    }
    const del = c.method !== 'pickup';
    const sum = c.start && c.end ? `${day(c.start)} to ${day(c.end)}: ${R.rentalDays(c.start, c.end)} days, both days count`
      : c.start ? `${day(c.start)}. Now pick your last day, ${C.minDays} to ${C.maxDays} days in all.` : 'Pick your first day.';
    const chips = (name, legend, val) => `<fieldset class="chips"><legend class="legend">${legend}</legend><div>${C.windows.map(w => `<label><input type="radio" name="${name}" value="${w}" ${w === val ? 'checked' : ''}><span>${win(w)}</span></label>`).join('')}</div></fieldset>`;
    CALROOT.innerHTML = `<div class="cal-in" data-month="${c.month}">
      <div class="cal-head"><h2 id="cal-title">${c.windows ? 'Dates and times' : 'Change dates'}</h2><button type="button" class="x" data-cal="close" aria-label="Close">✕</button></div>
      <p class="cal-sum" aria-live="polite">${sum}</p>
      <div class="cal-nav"><button type="button" data-cal="prev" aria-label="Previous month" ${c.month > c.earliest.slice(0, 7) ? '' : 'disabled'}>‹</button><b>${monthName.format(first)}</b><button type="button" data-cal="next" aria-label="Next month">›</button></div>
      <div class="grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(w => `<span class="wd" aria-hidden="true">${w}</span>`).join('')}${cells.join('')}</div>
      <p class="hint">Earliest ${del ? 'delivery' : 'pickup'}: ${day(c.earliest)}. We confirm each booking first, within ${C.confirmWorkingHours} working hours, Monday to Friday.</p>
      ${c.windows ? chips('hw', `${del ? 'Delivered' : 'Pick up'}${c.start ? ', ' + day(c.start) : ''}`, c.hw) + chips('cw', `${del ? 'Collected' : 'Bring back'}${c.end ? ', ' + day(c.end) : ''}`, c.cw) : ''}
      ${c.err ? `<p class="err" role="alert">${c.err}</p>` : ''}
      <div class="cal-foot"><button type="button" class="btn ghost small" data-cal="clear">Clear</button><button type="button" class="btn" data-cal="save" ${c.start && c.end ? '' : 'disabled'}>Save</button></div>
    </div>`;
    if (focusDay) { const b = CALROOT.querySelector(`[data-day="${focusDay}"]`); if (b) b.focus(); }
  }
  CALROOT.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b || !CAL) return;
    const c = CAL, d = b.dataset.day, a = b.dataset.cal;
    if (d) { if (!c.start || c.end || d <= c.start) { c.start = d; c.end = null; } else c.end = d; c.err = null; return renderCal(d); }
    if (a === 'close') return closeCal();
    if (a === 'prev' || a === 'next') {
      const [y, m] = c.month.split('-').map(Number); c.month = R.iso(new Date(y, m - 1 + (a === 'next' ? 1 : -1), 1)).slice(0, 7);
      renderCal(); const nb = CALROOT.querySelector(`[data-cal="${a}"]:not([disabled])`); if (nb) nb.focus(); return;
    }
    if (a === 'clear') { c.start = c.end = null; c.err = null; return renderCal(); }
    if (a === 'save') c.onSave(c);
  });
  CALROOT.addEventListener('change', ev => { if (CAL && (ev.target.name === 'hw' || ev.target.name === 'cw')) CAL[ev.target.name] = ev.target.value; });
  CALROOT.addEventListener('close', () => { CAL = null; });

  /* ================= routing ================= */
  function current() {
    const h = location.hash.slice(1);
    if (h === 'flying') return ['flying'];
    if (h === 'popup') return ['popup'];
    if (h === 'trips') return ['trips'];
    if (h === 'ops') return ['ops'];
    if (h === 'fold-guide') return ['guide'];
    if (h.startsWith('booking-')) return ['booking', h.slice(8)];
    if (h.startsWith('plan-')) return ['plan', h.slice(5)];
    return null;
  }
  function render(focusId) {
    const c = current();
    if (!c) return;
    APP.innerHTML = { flying: viewFlying, popup: viewPopup, trips: viewTrips, ops: viewOps, guide: viewGuide, booking: () => viewBooking(c[1]), plan: () => viewPlan(c[1]) }[c[0]]();
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); } }
  }
  function route() {
    const c = current();
    document.body.classList.toggle('in-app', !!c);
    if (c) { B = { panel: null, err: null, msg: null }; M = { msg: null, err: null }; O.msg = null; render(); window.scrollTo(0, 0); }
    else {
      window.dispatchEvent(new Event('resize'));
      const el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
    }
  }
  const go = hash => { if (location.hash === '#' + hash) route(); else location.hash = hash; };

  /* ================= actions ================= */
  const need = (obj, keys, msgs) => { const e = {}; for (const k of keys) if (!obj[k]) e[k] = msgs[k]; return e; };
  const CONTACT = { name: 'Enter your name.', email: 'Enter an email address, like you@example.com.', phone: 'Enter a phone number we can reach you on.' };
  function contactErrors(o) {
    const e = need(o, ['name', 'email', 'phone'], CONTACT);
    if (o.email && !emailOk(o.email)) e.email = CONTACT.email;
    if (o.phone && o.phone.replace(/\D/g, '').length < 6) e.phone = CONTACT.phone;
    return e;
  }
  const ops = (r, okMsg) => { O.msg = r.ok ? okMsg : (OPS_ERR[r.error] || 'That did not work.'); save(); render(); };
  const allPass = () => Object.fromEntries(C.checklist.map(k => [k, true]));
  const curId = () => current()[1];

  const acts = {
    /* Flying */
    'f-method'(el) { readForm(el.form, F); F.res = null; F.err = {}; render(); },
    'f-check'(form) {
      readForm(form, F); F.wl = null; F.res = null;
      const e = {};
      if (F.method === 'delivery') { if (!F.address) e.address = 'Enter the address where you are staying.'; if (!/^\d{5}$/.test(F.postcode)) e.postcode = 'Enter a 5-digit postcode, like 08008.'; }
      const de = R.validateDates(F.start, F.end, now()); if (de) e.dates = DATE_ERR[de];
      if (!F.age) e.age = "Choose your child's age.";
      F.err = e;
      if (Object.keys(e).length) return render();
      F.res = R.search(db, { method: F.method, postcode: F.postcode, start: F.start, end: F.end, ageMonths: Number(F.age) }, now()); save();
      render('result');
    },
    'cal-open'(el) {
      readForm(el.form, F);
      openCal({ method: F.method, start: F.start || null, end: F.end || null, hw: F.hw, cw: F.cw, windows: true, onSave(c) {
        Object.assign(F, { start: c.start, end: c.end, hw: c.hw, cw: c.cw, res: null }); F.err = { ...F.err, dates: null };
        closeCal(); render(); const w = document.getElementById('when'); if (w) w.focus();
      } });
    },
    'f-waitlist'(form) {
      const email = new FormData(form).get('wl');
      const r = R.joinWaitlist(db, String(email || '').trim(), { reason: F.res.reason, postcode: F.postcode, start: F.start, end: F.end }, now());
      F.wl = r.ok ? 'done' : 'bad'; save(); render('result');
    },
    'f-continue'() { F.step = 'details'; F.err = {}; render(); window.scrollTo(0, 0); },
    'f-back'() { F.step = 'check'; render(); window.scrollTo(0, 0); },
    'f-details'() { F.step = 'details'; render(); window.scrollTo(0, 0); },
    'f-review'(form) {
      readForm(form, F); F.acc = new FormData(form).getAll('acc');
      F.err = contactErrors(F);
      if (!Object.keys(F.err).length) F.step = 'review';
      render(); window.scrollTo(0, 0);
    },
    'f-pay'() {
      const r = R.createBooking(db, { method: F.method, address: F.address, postcode: F.postcode, start: F.start, end: F.end, ageMonths: Number(F.age), accessories: F.acc, handoffWindow: F.hw, collectWindow: F.cw, name: F.name, email: F.email, phone: F.phone }, now());
      if (!r.ok) { F.err = { pay: r.error === 'full' ? 'The last stroller for those dates has just gone. Go back and try other dates.' : 'Something in this booking needs fixing. Go back and check your details.' }; return render(); }
      save(); justBooked = r.booking.id; F = F0(); go('booking-' + r.booking.id);
    },
    /* Booking page */
    'b-panel'(el) { B.panel = el.dataset.panel || null; B.err = null; B.msg = null; render(B.panel === 'cancel' ? 'cancel-panel' : null); },
    'b-change'() {
      const id = curId(), b = R.booking(db, id); B.msg = null; B.panel = null;
      openCal({ method: b.method, start: b.start, end: b.end, windows: false, onSave(c) {
        const r = R.changeDates(db, id, c.start, c.end, now());
        if (!r.ok) { c.err = r.error === 'dates' ? DATE_ERR[r.dateError] : r.error === 'full' ? 'No stroller is free for those dates. Your booking is unchanged.' : `Dates can't change in the last ${C.freeCancelHours} hours.`; return renderCal(); }
        save(); closeCal(); B.msg = `Dates changed. ${r.diff > 0 ? `${eur(r.diff)} charged.` : r.diff < 0 ? `${eur(-r.diff)} refunded.` : 'No price change.'}`; render();
      } });
    },
    'b-cancel-yes'() { const r = R.cancelBooking(db, curId(), now()); save(); B.panel = null; B.msg = r.ok ? `Booking cancelled. ${eur(r.refund)} refunded.` : "This booking can't be cancelled now."; render(); },
    'b-rate'(el) { R.rate(db, curId(), Number(el.dataset.n), now()); save(); render(); },
    /* Pop-up */
    'p-go'(el) { P.step = el.dataset.step; P.err = {}; render(); window.scrollTo(0, 0); },
    'p-age'(el) { readForm(el.form, P); render(); },
    'p-plan'(form) {
      readForm(form, P); P.err = {};
      if (!P.age) P.err.age = "Choose your child's age.";
      else if (!R.configFor(Number(P.age))) P.err.age = `The ${C.model.name} fits children up to their 4th birthday.`;
      if (!P.err.age) P.step = 'home';
      render(); window.scrollTo(0, 0);
    },
    'p-home'(form) {
      readForm(form, P);
      const e = contactErrors(P);
      if (!P.address) e.address = 'Enter your home address.';
      if (!/^\d{5}$/.test(P.postcode)) e.postcode = 'Enter a 5-digit postcode, like 08012.';
      else if (!R.inZone(P.postcode)) e.postcode = `We only cover ${C.zone.label}.`;
      if (!P.startDate || P.startDate <= R.iso(now())) e.startDate = 'Pick a start date from tomorrow.';
      P.err = e; if (!Object.keys(e).length) P.step = 'review';
      render(); window.scrollTo(0, 0);
    },
    'p-pay'() {
      const r = R.createSub(db, { plan: P.plan, name: P.name, email: P.email, phone: P.phone, address: P.address, postcode: P.postcode, startDate: P.startDate, window: P.window, ageMonths: Number(P.age) }, now());
      if (!r.ok) { P.err = { pay: 'Something in this plan needs fixing. Go back and check your details.' }; return render(); }
      save(); justBooked = r.sub.id; P = P0(); go('plan-' + r.sub.id);
    },
    'm-age'(form) { const r = R.updateChild(db, curId(), Number(new FormData(form).get('age')), now()); save(); M = { msg: r.suggested ? null : r.outgrown ? null : 'Age updated. No swap needed.' }; render(r.suggested ? 'swap' : null); },
    'm-swap'(form) {
      const v = {}; readForm(form, v); const r = R.requestExchange(db, curId(), v.date, v.window, now());
      if (!r.ok) { M = { err: 'Pick a swap date from tomorrow.' }; return render(); }
      save(); M = { msg: `Swap booked. The ${r.config.name} arrives ${day(v.date)}, ${win(v.window)}.` }; render(); window.scrollTo(0, 0);
    },
    'm-acc'(el) { const r = R.requestAccessory(db, curId(), el.dataset.id, now()); save(); M = { msg: r.ok ? 'Requested. We bring it with your next delivery.' : null }; render(); },
    'm-end'(form) {
      const v = {}; readForm(form, v); const r = R.endSub(db, curId(), v.endDate, v.endWindow, now());
      if (!r.ok) { M = { endErr: 'Pick a collection date from tomorrow.' }; return render(); }
      save(); M = { msg: 'Collection booked. Your plan ends then.' }; render(); window.scrollTo(0, 0);
    },
    /* Back office */
    'o-confirm'(el) { ops(R.confirmBooking(db, el.dataset.id, now()), 'Booking confirmed.'); },
    'o-decline'(el) { const r = R.declineBooking(db, el.dataset.id, now()); ops(r, `Booking declined. ${eur(r.refund || 0)} refunded automatically.`); },
    'o-assign'(el) { const id = el.dataset.id; ops(R.assignUnit(db, id, document.getElementById('u-' + id).value, now()), 'Unit assigned.'); },
    'o-inspect'(el) { ops(R.inspectUnit(db, el.dataset.unit, allPass(), now()), `${el.dataset.unit} passed inspection.`); },
    'o-inspect-fail'(el) { ops(R.inspectUnit(db, el.dataset.unit, { ...allPass(), Brakes: false }, now()), `${el.dataset.unit} failed inspection and is in repair.`); },
    'o-clean'(el) { ops(R.cleanUnit(db, el.dataset.unit, now()), `${el.dataset.unit} cleaned and available.`); },
    'o-status'(el) { ops(R.setUnitStatus(db, el.dataset.unit, el.dataset.to, '', now()), `${el.dataset.unit} updated.`); },
    'o-dispatch'(el) { ops(R.dispatch(db, el.dataset.id, now()), 'Stroller dispatched.'); },
    'o-handoff'(el) { const id = el.dataset.id, r = R.recordHandoff(db, id, new Date(document.getElementById('h-' + id).value)); ops(r, r.onTime ? 'Handoff recorded: on time.' : `Handoff recorded: ${(r.lateHours || 0).toFixed(1)} hours late.`); },
    'o-faulty'(el) { const r = R.reportFaulty(db, el.dataset.id, el.dataset.how, now()); ops(r, el.dataset.how === 'replace' ? `Replacement ${r.unitId} due within ${C.faultyReplaceHours} hours.` : `Refunded ${eur(r.refund || 0)} in full.`); },
    'o-collect'(el) { const id = el.dataset.id, r = R.recordCollection(db, id, new Date(document.getElementById('c-' + id).value), document.getElementById('p-' + id).checked); ops(r, r.lateDays ? `Collected ${r.lateDays} day${r.lateDays > 1 ? 's' : ''} late. ${eur(r.lateDays * C.dailyRate)} charged.` : 'Collection recorded with return photo.'); },
    'o-lost'(el) { const r = R.markLost(db, el.dataset.id, now()); ops(r, `Marked as lost. ${eur(C.hold)} hold kept and ${eur(r.extra || 0)} charged.`); },
    'o-inspect-return'(el) {
      const id = el.dataset.id, res = {}, parts = [];
      document.querySelectorAll(`#k-${id} input`).forEach(i => { res[i.value] = i.checked; });
      document.querySelectorAll(`#d-${id} input:checked`).forEach(i => parts.push(i.value));
      const r = R.inspectReturn(db, id, res, parts, now());
      ops(r, r.charge ? `Damage logged. ${eur(r.charge)} charged.` : `Clean return. ${eur(C.hold)} hold released.`);
    },
    'o-avail'(form) { readForm(form, O); O.msg = null; render(); },
    'o-reset'() { db = R.newDb(); save(); O = { msg: 'Demo data reset.', from: '', to: '' }; render(); },
  };

  APP.addEventListener('submit', ev => { const a = ev.target.dataset.act; if (acts[a]) { ev.preventDefault(); acts[a](ev.target, ev); } });
  APP.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]'); if (!el || el.tagName === 'FORM') return;
    if (el.tagName === 'A') ev.preventDefault();
    acts[el.dataset.act](el, ev);
  });
  APP.addEventListener('change', ev => {
    const a = ev.target.dataset.change; if (a) return acts[a](ev.target);
    if (ev.target.name === 'acc') {
      const acc = [...ev.target.form.querySelectorAll('input[name="acc"]:checked')].map(i => i.value);
      ev.target.form.querySelector('[data-running]').textContent = eur(R.quote(F.start, F.end, acc, F.method).total);
      ev.target.form.querySelector('[data-running-note]').textContent = runningNote(acc);
      return;
    }
    if (ev.target.id === 'age' && ev.target.form && ev.target.form.dataset.act === 'p-plan') acts['p-age'](ev.target);
  });
  window.addEventListener('hashchange', route);

  /* Landing: the sign-up form at the foot of the page joins the same waitlist. */
  const join = document.getElementById('join');
  if (join) join.addEventListener('submit', ev => {
    ev.preventDefault();
    const r = R.joinWaitlist(db, document.getElementById('em').value.trim(), { reason: 'launch' }, now()); save();
    document.getElementById('msg').textContent = r.ok ? "You're on the list. Demo: saved on this device only, nothing is sent." : 'Enter an email address, like you@example.com.';
  });

  window.RoamApp = { get db() { return db; }, save, reload() { db = load(); route(); } };
  route();
})();
