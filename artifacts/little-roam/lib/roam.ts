export type Mode = 'travel' | 'monthly';
export type Handoff = { type: 'airport' | 'hotel'; address: string };
export type Status = 'saved' | 'return_requested' | 'returned' | 'cancelled';
export type AccRequest = { id: string; accessoryId: string; charge: number; status: string; at: string };
export type ExchangeRequest = { id: string; toStrollerId: string; fee: number; status: string; at: string };
export type Booking = {
  id: string; kind: Mode; destination: string; startDate: string; endDate: string;
  childMonths: number; childKg: number; strollerId: string; accessoryIds: string[];
  handoff: Handoff; plan?: 'basic' | 'premium'; total: number; createdAt: string; status: Status;
  returnRequest?: { date: string; location: string; requestedAt: string };
  accessoryRequests: AccRequest[]; exchangeRequests: ExchangeRequest[];
};

export const DAILY_RATE = 12;
export const EXCHANGE_FEE = 15;
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

export const PLANS = [
  { id: 'basic' as const, name: 'Basic', price: 45, items: ['One concept stroller at a time', '1 free exchange request per 6 months', `Extra exchange: ${EXCHANGE_FEE} EUR (hypothesis)`, 'Accessory requests charged per item'] },
  { id: 'premium' as const, name: 'Premium', price: 79, items: ['One concept stroller at a time', '1 free exchange request per 6 months', `Extra exchange: ${EXCHANGE_FEE} EUR (hypothesis)`, 'Accessory requests included'] },
];

export const strollerById = (id: string) => STROLLERS.find((s) => s.id === id);
export const accById = (id: string) => ACCESSORIES.find((a) => a.id === id);
export const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export function suitability(s: (typeof STROLLERS)[number], months: number, kg: number): { ok: boolean; reason: string } {
  if (months < s.minM) return { ok: false, reason: `Illustrative minimum age is ${s.minM} months` };
  if (months > s.maxM) return { ok: false, reason: `Illustrative maximum age is ${s.maxM} months` };
  if (kg > s.maxKg) return { ok: false, reason: `Illustrative weight limit is ${s.maxKg} kg` };
  return { ok: true, reason: `Within illustrative limits (${s.minM}-${s.maxM} months, up to ${s.maxKg} kg)` };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (s: string, n: number) => { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const daysInclusive = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1;
export const fmtDate = (s: string) => parseISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function fleetLimits(): string {
  return STROLLERS.map((s) => `${s.name} ${s.minM}–${s.maxM} months, up to ${s.maxKg} kg`).join('; ');
}

export function validateTrip(mode: Mode, start: string, end: string, monthsTxt: string, kgTxt: string): string | null {
  const m = Number(monthsTxt), kg = Number(kgTxt);
  if (monthsTxt.trim() === '' || !isFinite(m) || m < 0 || m > 60) return 'Enter your child age in months (0 to 60).';
  if (kgTxt.trim() === '' || !isFinite(kg) || kg <= 0 || kg > 40) return 'Enter your child weight in kg (up to 40).';
  if (!STROLLERS.some((s) => suitability(s, m, kg).ok)) return `No model covers this child. Fleet limits: ${fleetLimits()}.`;
  if (!start) return mode === 'travel' ? 'Choose a start date.' : 'Choose a plan start date.';
  if (start < todayISO()) return 'Start date cannot be in the past.';
  if (mode === 'travel') {
    if (!end) return 'Choose an end date.';
    if (end < start) return 'End date cannot be before the start date.';
  }
  return null;
}

export function quote(p: { mode: Mode; start: string; end: string; strollerId: string; accIds: string[]; plan: 'basic' | 'premium' }) {
  const s = strollerById(p.strollerId);
  const accs = p.accIds.map(accById).filter(Boolean) as typeof ACCESSORIES;
  const lines: { label: string; amount: number; note?: string }[] = [];
  if (p.mode === 'travel') {
    const days = p.start && p.end && p.end >= p.start ? daysInclusive(p.start, p.end) : 0;
    const dayWord = days === 1 ? 'day' : 'days';
    lines.push({ label: `Base rate, ${days} ${dayWord} x ${DAILY_RATE}`, amount: days * DAILY_RATE });
    if (s && s.extra > 0) lines.push({ label: `${s.name} model supplement, ${days} x ${s.extra}`, amount: days * s.extra });
    accs.forEach((a) => lines.push({ label: a.name, amount: a.price }));
  } else {
    const pl = PLANS.find((x) => x.id === p.plan)!;
    lines.push({ label: `${pl.name} plan, first month`, amount: pl.price });
    accs.forEach((a) => lines.push(p.plan === 'premium' ? { label: a.name, amount: 0, note: 'Included in Premium' } : { label: a.name, amount: a.price }));
  }
  return { lines, total: lines.reduce((t, l) => t + l.amount, 0) };
}

export function exchangeFeeFor(all: Booking[]): { fee: number; free: boolean } {
  const cutoff = Date.now() - 183 * 86400000;
  const used = all.some((b) => b.exchangeRequests.some((e) => e.fee === 0 && new Date(e.at).getTime() > cutoff));
  return { fee: used ? EXCHANGE_FEE : 0, free: !used };
}

export const STATUS_LABEL: Record<Status, string> = {
  saved: 'Demo saved', return_requested: 'Return requested', returned: 'Marked returned (demo)', cancelled: 'Cancelled',
};
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
