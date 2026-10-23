import { z } from 'zod';

export type Mode = 'travel' | 'monthly';
export type HandoffType = 'airport' | 'hotel' | 'home';
export type Handoff = { type: HandoffType; address: string };
export type Status = 'saved' | 'return_requested' | 'returned' | 'cancelled';
export type Phase = 'upcoming' | 'active' | 'ended' | 'return_requested' | 'returned' | 'cancelled';
export type PlanId = 'basic' | 'premium';
export type Fit = 'good' | 'ok' | 'poor';

export type AccRequest = { id: string; accessoryId: string; charge: number; status: string; at: string };
export type ExchangeRequest = { id: string; toStrollerId: string; fee: number; status: string; at: string };
export type ReturnChecklist = { frame: boolean; wheels: boolean; harness: boolean; accessories: boolean };
export type ReturnRequest = { date: string; location: string; requestedAt: string; checklist?: ReturnChecklist };
export type Segment = { strollerId: string; fromDate: string };

export type Booking = {
  id: string;
  kind: Mode;
  destination: string;
  startDate: string;
  endDate: string;
  childMonths: number;
  childKg: number;
  strollerId: string;
  accessoryIds: string[];
  handoff: Handoff;
  plan?: PlanId;
  total: number;
  createdAt: string;
  status: Status;
  returnRequest?: ReturnRequest;
  accessoryRequests: AccRequest[];
  exchangeRequests: ExchangeRequest[];
  segments?: Segment[];
  /** Illustrative months actually added. Absent on a first month, which is derived from the 30-day window. */
  monthsPaid?: number;
};

export type Line = { label: string; amount: number; note?: string };
export type Price = { lines: Line[]; total: number; credit: number; creditUsed: number };

export const DAILY_RATE = 12;
export const EXCHANGE_FEE = 15;
export const BASIC_PRICE = 45;
export const PREMIUM_PRICE = 79;
export const PREMIUM_DELTA = PREMIUM_PRICE - BASIC_PRICE;
export const PREMIUM_ACCESSORY_CREDIT = 40;
export const MONTH_DAYS = 30;
export const MIN_TRAVEL_DAYS = 2;
export const EXCHANGE_WINDOW_DAYS = 183;
export const STORAGE_KEY = 'little-roam:bookings:v1';
export const STORAGE_READ_ERROR = 'Saved demo bookings could not be read. They are still on this device. Erase demo data before saving anything new.';

export const PILOT_SHORT = 'Pilot mode: no live inventory, no payment, no fulfillment. Everything here is saved on this device only.';
export const ABOUT = 'Little Roam is an independent concept inspired by a 2016 course. It is not affiliated with Bugaboo. Prices, coverage and policies are illustrative, not commercial offers.';

export const DESTINATIONS = [
  { id: 'Barcelona', country: 'Spain', airport: 'Barcelona El Prat (BCN) sample desk', blurb: 'Flat seafront promenades, tight old-town lanes and a lot of tram rides.', tags: ['Seafront', 'Cobbles', 'Metro'] },
  { id: 'Lisbon', country: 'Portugal', airport: 'Lisbon Humberto Delgado (LIS) sample desk', blurb: 'Steep hills and patterned pavements, where a sturdier wheel earns its place.', tags: ['Hills', 'Tiles', 'Trams'] },
];

export const STROLLERS = [
  { id: 'wren', name: 'Wren Compact', tagline: 'One-hand fold, cabin-friendly', minM: 6, maxM: 36, maxKg: 15, selfKg: 6.4, extra: 0, notes: ['Fits overhead-bin sized bag', 'Light for stairs'] },
  { id: 'cradle', name: 'Cradle Roam', tagline: 'Lie-flat for the youngest', minM: 0, maxM: 6, maxKg: 9, selfKg: 8.1, extra: 3, notes: ['Full recline', 'Breathable mattress'] },
  { id: 'ridge', name: 'Ridge Trail', tagline: 'Big wheels for hills and cobbles', minM: 6, maxM: 48, maxKg: 22, selfKg: 9.8, extra: 4, notes: ['Suspension', 'Large storage basket'] },
];

export const ACCESSORIES = [
  { id: 'rain', name: 'Rain cover', price: 6, compat: ['wren', 'cradle', 'ridge'] },
  { id: 'sun', name: 'Clip-on sunshade', price: 4, compat: ['wren', 'ridge'] },
  { id: 'cup', name: 'Cup holder', price: 3, compat: ['wren', 'ridge', 'cradle'] },
  { id: 'foot', name: 'Footmuff', price: 8, compat: ['wren', 'ridge'] },
  { id: 'bag', name: 'Padded travel bag', price: 5, compat: ['wren', 'ridge', 'cradle'] },
];

export const PLANS: { id: PlanId; name: string; price: number; items: string[] }[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: BASIC_PRICE,
    items: [
      'One concept stroller at a time',
      'Accessory requests charged per item',
      '1 free exchange request per 6 months',
      `Extra exchange: ${EXCHANGE_FEE} EUR (hypothesis)`,
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: PREMIUM_PRICE,
    items: [
      'One concept stroller at a time',
      `${PREMIUM_ACCESSORY_CREDIT} EUR accessory credit every paid month`,
      '1 free exchange request each paid month',
      `Extra exchange: ${EXCHANGE_FEE} EUR (hypothesis)`,
    ],
  },
];

export const strollerById = (id: string) => STROLLERS.find((s) => s.id === id);
export const accById = (id: string) => ACCESSORIES.find((a) => a.id === id);
export const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export function suitability(s: (typeof STROLLERS)[number], months: number, kg: number): { ok: boolean; reason: string } {
  if (months < s.minM) return { ok: false, reason: `Illustrative minimum age is ${s.minM} months` };
  if (months > s.maxM) return { ok: false, reason: `Illustrative maximum age is ${s.maxM} months` };
  if (kg > s.maxKg) return { ok: false, reason: `Illustrative weight limit is ${s.maxKg} kg` };
  return { ok: true, reason: `Within illustrative limits (${s.minM}–${s.maxM} months, up to ${s.maxKg} kg)` };
}

export function placeFit(strollerId: string, destination: string, mode: Mode): { fit: Fit; note: string } {
  if (mode === 'monthly') {
    return { fit: 'ok', note: 'Age and weight decide the model. The city is the sample coverage area.' };
  }
  if (destination === 'Lisbon') {
    if (strollerId === 'ridge') return { fit: 'good', note: 'Big wheels suit Lisbon hills and cobbles.' };
    if (strollerId === 'wren') return { fit: 'poor', note: 'Within the age and weight limits, and a poor match for Lisbon hills. A light fold helps on stairs, not on steep cobbles.' };
    return { fit: 'ok', note: 'A lie-flat seat for infants. Hills make this model harder work.' };
  }
  if (strollerId === 'wren') return { fit: 'good', note: 'A tight fold suits lanes, trams and stairs along a flatter seafront.' };
  if (strollerId === 'ridge') return { fit: 'ok', note: 'Stable on the promenade. Heavier than you need for flat ground.' };
  return { fit: 'ok', note: 'A lie-flat seat for the youngest. Fine on the seafront, bulky in old-town lanes.' };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y!, (m ?? 1) - 1, d ?? 1); };
export const todayISO = () => toISO(new Date());
export const addDays = (s: string, n: number) => { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const daysInclusive = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1;
export const fmtDate = (s: string) => parseISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function validateChild(monthsTxt: string, kgTxt: string): string | null {
  const m = Number(monthsTxt);
  const kg = Number(kgTxt);
  if (monthsTxt.trim() === '' || !Number.isFinite(m) || m < 0 || m > 60) return 'Enter your child age in months (0 to 60).';
  if (kgTxt.trim() === '' || !Number.isFinite(kg) || kg <= 0 || kg > 40) return 'Enter your child weight in kg (up to 40).';
  return null;
}

export function validateTrip(mode: Mode, start: string, end: string, monthsTxt: string, kgTxt: string): string | null {
  const child = validateChild(monthsTxt, kgTxt);
  if (child) return child;
  if (!start) return mode === 'travel' ? 'Choose a start date.' : 'Choose a plan start date.';
  if (start < todayISO()) return 'Start date cannot be in the past.';
  if (mode === 'travel') {
    if (!end) return 'Choose an end date.';
    if (end <= start) return `End date must be after the start date. The shortest trip is ${MIN_TRAVEL_DAYS} days.`;
  }
  return null;
}

export function paidMonths(b: Booking): number {
  if (b.kind !== 'monthly') return 0;
  if (b.monthsPaid && b.monthsPaid > 0) return b.monthsPaid;
  return Math.max(1, Math.round(daysInclusive(b.startDate, b.endDate) / MONTH_DAYS));
}

export function monthEnd(start: string): string {
  return addDays(start, MONTH_DAYS - 1);
}

export function phaseOf(b: Booking, today = todayISO()): Phase {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'returned') return 'returned';
  if (b.status === 'return_requested') return 'return_requested';
  if (today < b.startDate) return 'upcoming';
  if (today > b.endDate) return 'ended';
  return 'active';
}

export const PHASE_LABEL: Record<Phase, string> = {
  upcoming: 'Upcoming',
  active: 'Out now',
  ended: 'Ended',
  return_requested: 'Return requested',
  returned: 'Returned (demo)',
  cancelled: 'Cancelled',
};

export const PHASE_TONE: Record<Phase, 'sage' | 'marigold' | 'sky' | 'danger' | 'muted'> = {
  upcoming: 'sky',
  active: 'sage',
  ended: 'marigold',
  return_requested: 'sky',
  returned: 'muted',
  cancelled: 'danger',
};

export function groupBookings(all: Booking[], today = todayISO()): { phase: Phase; label: string; items: Booking[] }[] {
  const order: Phase[] = ['active', 'return_requested', 'upcoming', 'ended', 'returned', 'cancelled'];
  return order
    .map((phase) => ({
      phase,
      label: PHASE_LABEL[phase],
      items: all
        .filter((b) => phaseOf(b, today) === phase)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || b.createdAt.localeCompare(a.createdAt)),
    }))
    .filter((g) => g.items.length > 0);
}

export function outgrown(b: Booking): boolean {
  const s = strollerById(b.strollerId);
  if (!s) return false;
  return !suitability(s, b.childMonths, b.childKg).ok;
}

export function exchangeTargets(b: Booking) {
  return STROLLERS.filter((s) => s.id !== b.strollerId).map((stroller) => ({
    stroller,
    suitability: suitability(stroller, b.childMonths, b.childKg),
  }));
}

export function blockingReason(all: Booking[]): string | null {
  const open = all.find((b) => b.status === 'saved' || b.status === 'return_requested');
  if (!open) return null;
  const name = strollerById(open.strollerId)?.name ?? 'A stroller';
  return `${name} in ${open.destination} is still an open demo booking. Return or cancel it before starting another. This pilot keeps one stroller at a time.`;
}

function billedEnd(b: Booking): string {
  if (b.kind === 'travel' && b.returnRequest && b.returnRequest.date < b.endDate) return b.returnRequest.date;
  return b.endDate;
}

function lateDays(b: Booking): number {
  if (b.kind !== 'travel' || !b.returnRequest) return 0;
  if (b.returnRequest.date <= b.endDate) return 0;
  return daysInclusive(addDays(b.endDate, 1), b.returnRequest.date);
}

function segmentRows(b: Booking, end: string): { strollerId: string; days: number }[] {
  const existing = b.segments?.length ? b.segments : [{ strollerId: b.strollerId, fromDate: b.startDate }];
  const sorted = [...existing].filter((s) => s.fromDate <= end).sort((a, c) => a.fromDate.localeCompare(c.fromDate));
  const rows = sorted.length && sorted[0]!.fromDate <= b.startDate
    ? sorted
    : [{ strollerId: b.strollerId, fromDate: b.startDate }, ...sorted];
  const out: { strollerId: string; days: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const from = rows[i]!.fromDate < b.startDate ? b.startDate : rows[i]!.fromDate;
    const nextFrom = i + 1 < rows.length ? rows[i + 1]!.fromDate : null;
    const to = nextFrom ? addDays(nextFrom, -1) : end;
    const capped = to > end ? end : to;
    if (capped < from) continue;
    out.push({ strollerId: rows[i]!.strollerId, days: daysInclusive(from, capped) });
  }
  return out;
}

function accessoryWalk(b: Booking, extraIds: string[] = []) {
  const credit = b.kind === 'monthly' && b.plan === 'premium' ? PREMIUM_ACCESSORY_CREDIT * paidMonths(b) : 0;
  let left = credit;
  let creditUsed = 0;
  const seen = new Set<string>();
  const rows: { id: string; price: number; covered: number; due: number }[] = [];
  for (const id of [...b.accessoryIds, ...b.accessoryRequests.map((r) => r.accessoryId), ...extraIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const a = accById(id);
    if (!a) continue;
    const covered = Math.min(left, a.price);
    left -= covered;
    creditUsed += covered;
    rows.push({ id, price: a.price, covered, due: a.price - covered });
  }
  return { rows, credit, creditUsed };
}

export function priceBooking(b: Booking): Price {
  const lines: Line[] = [];
  if (b.kind === 'travel') {
    for (const seg of segmentRows(b, billedEnd(b))) {
      const s = strollerById(seg.strollerId);
      const name = s?.name ?? 'Stroller';
      lines.push({ label: `${name}, ${seg.days} days × ${DAILY_RATE}`, amount: seg.days * DAILY_RATE });
      if (s && s.extra > 0) lines.push({ label: `${name} model supplement, ${seg.days} × ${s.extra}`, amount: seg.days * s.extra });
    }
    const late = lateDays(b);
    if (late > 0) lines.push({ label: `Late return, ${late} days × ${DAILY_RATE} (hypothesis)`, amount: late * DAILY_RATE });
  } else {
    const plan = PLANS.find((p) => p.id === (b.plan ?? 'basic')) ?? PLANS[0]!;
    const months = paidMonths(b);
    lines.push({ label: `${plan.name} plan, ${months} ${months === 1 ? 'month' : 'months'}`, amount: plan.price * months });
  }
  const walked = accessoryWalk(b);
  for (const row of walked.rows) {
    const name = accById(row.id)?.name ?? row.id;
    const per = b.kind === 'travel' ? ', per trip' : '';
    lines.push({
      label: `${name}${per}`,
      amount: row.due,
      note: row.covered > 0 ? (row.due === 0 ? 'Included in the Premium credit' : `${eur(row.covered)} of the Premium credit applied`) : undefined,
    });
  }
  for (const ex of b.exchangeRequests) {
    if (ex.fee > 0) lines.push({ label: `Exchange to ${strollerById(ex.toStrollerId)?.name ?? 'stroller'}`, amount: ex.fee });
  }
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, total, credit: walked.credit, creditUsed: walked.creditUsed };
}

export function reprice(b: Booking): Booking {
  return { ...b, total: priceBooking(b).total };
}

export function quote(p: { mode: Mode; start: string; end: string; strollerId: string; accIds: string[]; plan: PlanId }): Price {
  const empty: Price = { lines: [], total: 0, credit: 0, creditUsed: 0 };
  if (p.mode === 'travel' && (!p.start || !p.end || p.end <= p.start)) return empty;
  if (p.mode === 'monthly' && !p.start) return empty;
  return priceBooking(createBooking({
    kind: p.mode,
    destination: 'Barcelona',
    startDate: p.start,
    endDate: p.mode === 'travel' ? p.end : p.start,
    childMonths: 12,
    childKg: 9,
    strollerId: p.strollerId || 'wren',
    accessoryIds: p.accIds,
    handoff: { type: p.mode === 'monthly' ? 'home' : 'airport', address: 'sample' },
    plan: p.plan,
    id: 'quote',
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

export function exchangeFeeFor(all: Booking[], booking: Booking, now = new Date()): { fee: number; free: boolean; detail: string } {
  if (booking.plan === 'premium') {
    const used = booking.exchangeRequests.filter((e) => e.fee === 0).length;
    const allowance = paidMonths(booking);
    const free = used < allowance;
    return {
      fee: free ? 0 : EXCHANGE_FEE,
      free,
      detail: free
        ? `Premium includes ${allowance} free exchange ${allowance === 1 ? 'request' : 'requests'} across the paid ${allowance === 1 ? 'month' : 'months'}.`
        : `The free Premium exchange for these paid months is used. The next one is ${EXCHANGE_FEE} EUR (hypothesis).`,
    };
  }
  const cutoff = now.getTime() - EXCHANGE_WINDOW_DAYS * 86400000;
  const used = all.some((b) =>
    b.kind === 'monthly' &&
    b.plan !== 'premium' &&
    b.status !== 'cancelled' &&
    b.exchangeRequests.some((e) => e.fee === 0 && Date.parse(e.at) > cutoff),
  );
  return {
    fee: used ? EXCHANGE_FEE : 0,
    free: !used,
    detail: used
      ? `A free Basic exchange was already used in the last 6 months. This one is ${EXCHANGE_FEE} EUR (hypothesis).`
      : 'Basic includes 1 free exchange request in a 6-month window.',
  };
}

export function withChild(b: Booking, months: number, kg: number): Booking {
  return { ...b, childMonths: months, childKg: kg };
}

function manageable(b: Booking, now: Date): boolean {
  return b.status === 'saved' && phaseOf(b, toISO(now)) !== 'ended';
}

export function applyExchange(all: Booking[], b: Booking, toId: string, now = new Date()): Booking {
  if (b.kind !== 'monthly' || !manageable(b, now)) return b;
  const target = strollerById(toId);
  if (!target || !suitability(target, b.childMonths, b.childKg).ok) return b;
  const { fee } = exchangeFeeFor(all, b, now);
  const fromDate = toISO(now) < b.startDate ? b.startDate : toISO(now);
  const existing = b.segments?.length ? b.segments : [{ strollerId: b.strollerId, fromDate: b.startDate }];
  const segments = fromDate <= b.startDate
    ? [{ strollerId: toId, fromDate: b.startDate }]
    : [...existing.filter((s) => s.fromDate < fromDate), { strollerId: toId, fromDate }];
  const keep = (id: string) => accById(id)?.compat.includes(toId) ?? false;
  return reprice({
    ...b,
    strollerId: toId,
    segments,
    accessoryIds: b.accessoryIds.filter(keep),
    accessoryRequests: b.accessoryRequests.filter((r) => keep(r.accessoryId)),
    exchangeRequests: [...b.exchangeRequests, {
      id: newId(),
      toStrollerId: toId,
      fee,
      status: 'Recorded on this device. The active stroller is now this model.',
      at: now.toISOString(),
    }],
  });
}

export function requestAccessory(b: Booking, accId: string, now = new Date()): Booking {
  if (!manageable(b, now)) return b;
  if (b.accessoryIds.includes(accId) || b.accessoryRequests.some((r) => r.accessoryId === accId)) return b;
  const accessory = accById(accId);
  if (!accessory || !accessory.compat.includes(b.strollerId)) return b;
  const due = accessoryWalk(b, [accId]).rows.find((row) => row.id === accId)?.due ?? accessory.price;
  return reprice({
    ...b,
    accessoryRequests: [...b.accessoryRequests, {
      id: newId(),
      accessoryId: accId,
      charge: due,
      status: 'Request documented',
      at: now.toISOString(),
    }],
  });
}

export function renewMonth(b: Booking, today = todayISO()): Booking {
  if (b.kind !== 'monthly' || b.status !== 'saved') return b;
  const monthsPaid = paidMonths(b) + 1;
  const endDate = b.endDate < today ? monthEnd(today) : addDays(b.endDate, MONTH_DAYS);
  return reprice({ ...b, endDate, monthsPaid });
}

export function requestReturn(
  b: Booking,
  input: { date: string; location: string; checklist: ReturnChecklist },
  now = new Date(),
): { booking?: Booking; error?: string } {
  if (b.status !== 'saved') return { error: 'This booking can no longer be updated.' };
  if (!input.date) return { error: 'Choose a return date.' };
  const today = toISO(now);
  if (input.date < today) return { error: 'Return date cannot be in the past.' };
  if (input.date < b.startDate) return { error: 'Return date cannot be before the rental start.' };
  if (input.location.trim().length < 3) return { error: 'Enter a return location.' };
  return {
    booking: reprice({
      ...b,
      status: 'return_requested',
      returnRequest: {
        date: input.date,
        location: input.location.trim(),
        requestedAt: now.toISOString(),
        checklist: input.checklist,
      },
    }),
  };
}

export function markReturned(b: Booking): Booking {
  if (b.status !== 'return_requested') return b;
  return { ...b, status: 'returned' };
}

export function cancelReturn(b: Booking): Booking {
  if (b.status !== 'return_requested') return b;
  const next: Booking = { ...b, status: 'saved', returnRequest: undefined };
  return reprice(next);
}

export function cancelBooking(b: Booking): Booking {
  if (b.status !== 'saved') return b;
  return { ...b, status: 'cancelled' };
}

export type Draft = {
  kind: Mode;
  destination: string;
  startDate: string;
  endDate: string;
  childMonths: number;
  childKg: number;
  strollerId: string;
  accessoryIds: string[];
  handoff: Handoff;
  plan: PlanId;
  id?: string;
  createdAt?: string;
};

export function createBooking(input: Draft): Booking {
  const startDate = input.startDate;
  const endDate = input.kind === 'travel' ? input.endDate : monthEnd(startDate);
  return reprice({
    id: input.id ?? newId(),
    kind: input.kind,
    destination: input.destination,
    startDate,
    endDate,
    childMonths: input.childMonths,
    childKg: input.childKg,
    strollerId: input.strollerId,
    accessoryIds: input.accessoryIds,
    handoff: input.handoff,
    plan: input.kind === 'monthly' ? input.plan : undefined,
    total: 0,
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: 'saved',
    accessoryRequests: [],
    exchangeRequests: [],
    segments: [{ strollerId: input.strollerId, fromDate: startDate }],
  });
}

const checklistSchema = z.object({
  frame: z.boolean(),
  wheels: z.boolean(),
  harness: z.boolean(),
  accessories: z.boolean(),
});

const bookingSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['travel', 'monthly']),
  destination: z.string(),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  childMonths: z.number(),
  childKg: z.number(),
  strollerId: z.string().min(1),
  accessoryIds: z.array(z.string()).default([]),
  handoff: z.object({
    type: z.enum(['airport', 'hotel', 'home']),
    address: z.string(),
  }),
  plan: z.enum(['basic', 'premium']).optional(),
  total: z.number(),
  createdAt: z.string().min(1),
  status: z.enum(['saved', 'return_requested', 'returned', 'cancelled']),
  returnRequest: z.object({
    date: z.string(),
    location: z.string(),
    requestedAt: z.string(),
    checklist: checklistSchema.optional(),
  }).optional(),
  accessoryRequests: z.array(z.object({
    id: z.string(),
    accessoryId: z.string(),
    charge: z.number(),
    status: z.string(),
    at: z.string(),
  })).default([]),
  exchangeRequests: z.array(z.object({
    id: z.string(),
    toStrollerId: z.string(),
    fee: z.number(),
    status: z.string(),
    at: z.string(),
  })).default([]),
  segments: z.array(z.object({
    strollerId: z.string(),
    fromDate: z.string(),
  })).optional(),
  monthsPaid: z.number().int().positive().optional(),
});

function hydrate(b: Booking): Booking {
  const segments = b.segments?.length ? b.segments : [{ strollerId: b.strollerId, fromDate: b.startDate }];
  return reprice({ ...b, segments });
}

export function parseStoredBookings(raw: unknown): { ok: true; bookings: Booking[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: STORAGE_READ_ERROR };
  const bookings: Booking[] = [];
  for (const item of raw) {
    const parsed = bookingSchema.safeParse(item);
    if (!parsed.success) return { ok: false, error: STORAGE_READ_ERROR };
    bookings.push(hydrate(parsed.data));
  }
  return { ok: true, bookings };
}

export function loadStored(raw: string | null): { bookings: Booking[]; writable: boolean; error: string | null } {
  if (raw == null || raw === '') return { bookings: [], writable: true, error: null };
  try {
    const parsed = parseStoredBookings(JSON.parse(raw));
    if (!parsed.ok) return { bookings: [], writable: false, error: parsed.error };
    return { bookings: parsed.bookings, writable: true, error: null };
  } catch {
    return { bookings: [], writable: false, error: STORAGE_READ_ERROR };
  }
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
