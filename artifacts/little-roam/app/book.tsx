import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, DatePicker, DemoBanner, ErrorNote, Field, H1, H2, Label, P, Pill, Press, PriceLines, Row, Sheet, useTop } from '@/components/ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { F } from '@/constants/theme';
import { ACCESSORIES, DAILY_RATE, DESTINATIONS, MIN_TRAVEL_DAYS, Mode, PLANS, PREMIUM_ACCESSORY_CREDIT, STROLLERS, accById, addDays, blockingReason, createBooking, daysInclusive, eur, fmtDate, placeFit, quote, strollerById, suitability, todayISO, validateTrip } from '@/lib/roam';

const STEPS = ['Trip', 'Equipment', 'Accessories', 'Handoff', 'Review'];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const FIT_TONE = { good: 'sage', ok: 'sky', poor: 'marigold' } as const;

export default function Book() {
  const c = useColors();
  const top = useTop();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ mode?: string; dest?: string; plan?: string }>();
  const { bookings, commit } = useRoam();
  const today = todayISO();

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>(one(p.mode) === 'monthly' ? 'monthly' : 'travel');
  const [dest, setDest] = useState(DESTINATIONS.some((d) => d.id === one(p.dest)) ? (one(p.dest) as string) : 'Barcelona');
  const [plan, setPlan] = useState<'basic' | 'premium'>(one(p.plan) === 'premium' ? 'premium' : 'basic');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [which, setWhich] = useState<'start' | 'end'>('start');
  const [months, setMonths] = useState('');
  const [kg, setKg] = useState('');
  const [strollerId, setStrollerId] = useState('');
  const [accIds, setAccIds] = useState<string[]>([]);
  const [hType, setHType] = useState<'airport' | 'hotel' | 'home'>('airport');
  const [address, setAddress] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);

  const dd = DESTINATIONS.find((d) => d.id === dest)!;
  const datesReady = mode === 'monthly' ? !!start && start >= today : !!start && !!end && end > start;
  const q = quote({ mode, start, end, strollerId, accIds, plan });
  const m = Number(months);
  const w = Number(kg);
  const dirty = step > 0 || !!start || !!end || !!months || !!kg || !!strollerId || accIds.length > 0 || !!address;
  const blocked = blockingReason(bookings);

  const chooseMode = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'monthly') {
      setWhich('start');
      setHType('home');
    } else if (hType === 'home') setHType('airport');
  };

  const next = async () => {
    setError(null);
    if (step === 0) {
      const e = validateTrip(mode, start, end, months, kg);
      if (e) return setError(e);
      if (strollerId) {
        const s = strollerById(strollerId);
        if (s && !suitability(s, m, w).ok) {
          setStrollerId('');
          setAccIds([]);
        }
      }
    } else if (step === 1) {
      if (!strollerId) return setError('Choose a suitable stroller to continue.');
    } else if (step === 3) {
      if (mode === 'monthly' && address.trim().length < 5) return setError('Enter the home address where the stroller would live.');
      if (mode === 'travel' && hType === 'hotel' && address.trim().length < 5) return setError('Hotel address is required for hotel handoff.');
    } else if (step === 4) {
      if (blocked) return setError(blocked);
      if (!agree) return setError('Please acknowledge the pilot terms to save the demo booking.');
      const e = validateTrip(mode, start, end, months, kg);
      if (e) return setError(e);
      const s = strollerById(strollerId);
      if (!s || !suitability(s, m, w).ok) return setError('Selected stroller does not suit the child details.');
      const booking = createBooking({
        kind: mode,
        destination: dest,
        startDate: start,
        endDate: end,
        childMonths: m,
        childKg: w,
        strollerId,
        accessoryIds: accIds,
        handoff: mode === 'monthly'
          ? { type: 'home', address: address.trim() }
          : { type: hType === 'hotel' ? 'hotel' : 'airport', address: hType === 'hotel' ? address.trim() : dd.airport },
        plan,
      });
      setSaving(true);
      try {
        await commit((prev) => {
          const reason = blockingReason(prev);
          if (reason) throw new Error(reason);
          return [booking, ...prev];
        });
        setSavedId(booking.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save.');
      } finally {
        setSaving(false);
      }
      return;
    }
    setStep(step + 1);
  };

  const pickStroller = (id: string) => { setStrollerId(id); setAccIds((a) => a.filter((x) => accById(x)?.compat.includes(id))); };
  const close = () => { if (dirty && !savedId) setDiscard(true); else router.back(); };

  if (savedId) {
    return (
      <View testID="booking-saved" style={{ flex: 1, backgroundColor: c.pine, padding: 24, paddingTop: top + 24, justifyContent: 'center', gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={30} color={c.accentForeground} /></View>
        <H1 color={c.pineForeground}>Demo booking saved</H1>
        <P color={c.pineForeground} size={15}>This is a DEMO record stored on this device. Nothing was paid, reserved or sent. No real stroller is waiting for you.</P>
        <Btn testID="view-rental" label="View in My rentals" onPress={() => { router.dismissAll?.(); router.replace({ pathname: '/rental/[id]', params: { id: savedId } }); }} />
        <Press testID="done-close" accessibilityLabel="Close" onPress={() => router.back()} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.pineForeground }}>Close</Text>
        </Press>
      </View>
    );
  }

  const ranked = [...STROLLERS].sort((a, b) => {
    const as = suitability(a, m, w).ok ? 0 : 1;
    const bs = suitability(b, m, w).ok ? 0 : 1;
    if (as !== bs) return as - bs;
    const rank = { good: 0, ok: 1, poor: 2 };
    return rank[placeFit(a.id, dest, mode).fit] - rank[placeFit(b.id, dest, mode).fit];
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }} testID="book-screen">
      <View style={{ paddingTop: top, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Label>Step {step + 1} of 5</Label><H2>{STEPS[step]}</H2></View>
          <Press testID="book-close" accessibilityLabel="Close booking" onPress={close} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Feather name="x" size={24} color={c.foreground} /></Press>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.primary : c.border }} />)}
        </View>
      </View>
      <KeyboardAwareScrollViewCompat bottomOffset={120} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }}>
        <DemoBanner />
        {blocked ? <ErrorNote text={blocked} /> : null}

        {step === 0 ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip testID="mode-travel" label="Flying Solutions" active={mode === 'travel'} onPress={() => chooseMode('travel')} />
              <Chip testID="mode-monthly" label="Pop-up Solutions" active={mode === 'monthly'} onPress={() => chooseMode('monthly')} />
            </View>
            <Label>{mode === 'monthly' ? 'Sample coverage' : 'Destination'}</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>{DESTINATIONS.map((d) => <Chip key={d.id} testID={`book-dest-${d.id}`} label={d.id} active={d.id === dest} onPress={() => setDest(d.id)} />)}</View>
            {mode === 'monthly' ? <P size={12}>The city is where this concept could operate. The stroller itself is for home, not an airport desk.</P> : null}
            {mode === 'monthly' ? (
              <>
                <Label>Plan</Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>{PLANS.map((x) => <Chip key={x.id} testID={`plan-${x.id}`} label={`${x.name} ${x.price} EUR`} active={x.id === plan} onPress={() => setPlan(x.id)} />)}</View>
                {plan === 'premium' ? <P size={12}>Premium is {PREMIUM_ACCESSORY_CREDIT} EUR of accessory credit each paid month, and one free exchange per paid month.</P> : <P size={12}>Basic charges each accessory and includes one free exchange per 6 months.</P>}
              </>
            ) : null}
            <Label>{mode === 'travel' ? 'Dates' : 'Plan start date'}</Label>
            {mode === 'travel' ? (
              <>
                <P size={13}>{DAILY_RATE} EUR a day. Shortest trip is {MIN_TRAVEL_DAYS} days. {start && end && end > start ? `${daysInclusive(start, end)} days selected.` : 'Choose a start, then an end.'}</P>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip testID="which-start" label={`Start: ${start ? fmtDate(start) : 'choose'}`} active={which === 'start'} onPress={() => setWhich('start')} />
                  <Chip testID="which-end" label={`End: ${end ? fmtDate(end) : 'choose'}`} active={which === 'end'} onPress={() => setWhich('end')} />
                </View>
              </>
            ) : <P color={c.foreground}>{start ? `Starts ${fmtDate(start)}. First month runs 30 days, through ${fmtDate(addDays(start, 29))}.` : 'Choose a start date. A month is 30 days.'}</P>}
            <DatePicker
              key={`${mode}-${which}`}
              testID="date-picker"
              value={mode === 'monthly' || which === 'start' ? start : end}
              rangeStart={start}
              rangeEnd={mode === 'travel' ? end : start}
              min={mode === 'monthly' || which === 'start' ? today : (start ? addDays(start, 1) : today)}
              onChange={(d) => {
                setError(null);
                if (mode === 'monthly' || which === 'start') { setStart(d); if (end && end <= d) setEnd(''); if (mode === 'travel') setWhich('end'); }
                else setEnd(d);
              }}
            />
            <Label>Child suitability</Label>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field testID="input-months" label="Age (months)" keyboardType="number-pad" value={months} onChangeText={(t) => setMonths(t.replace(/[^0-9]/g, ''))} placeholder="e.g. 14" /></View>
              <View style={{ flex: 1 }}><Field testID="input-kg" label="Weight (kg)" keyboardType="decimal-pad" value={kg} onChangeText={(t) => setKg(t.replace(/[^0-9.]/g, ''))} placeholder="e.g. 9.5" /></View>
            </View>
            <P size={12}>Age and weight are stored with the demo booking on this device and can be updated later. They are not a safety check.</P>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <P>Sample concept models for a {m}-month, {w} kg child. Age and weight are hard limits. {mode === 'travel' ? `Place notes for ${dest} are advice, not a block.` : 'For a monthly plan, place does not change the model.'}</P>
            {ranked.map((s) => {
              const su = suitability(s, m, w);
              const fit = placeFit(s.id, dest, mode);
              const sel = strollerId === s.id;
              return (
                <Press key={s.id} testID={`pick-${s.id}`} disabled={!su.ok} accessibilityLabel={s.name} onPress={() => pickStroller(s.id)}>
                  <Card style={{ gap: 6, borderColor: sel ? c.primary : c.border, borderWidth: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: F.display, fontSize: 19, color: c.foreground }}>{s.name}</Text>
                      {sel ? <Feather name="check-circle" size={20} color={c.primary} /> : null}
                    </View>
                    <P>{s.tagline}</P>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      <Pill label={su.ok ? 'Suitable' : 'Not suitable'} tone={su.ok ? 'sage' : 'danger'} />
                      {su.ok && mode === 'travel' ? <Pill label={fit.fit === 'good' ? `Good for ${dest}` : fit.fit === 'poor' ? `Poor match for ${dest}` : 'Possible here'} tone={FIT_TONE[fit.fit]} /> : null}
                    </View>
                    <P size={12.5} color={su.ok ? c.mutedForeground : c.destructive}>{su.reason}</P>
                    {su.ok ? <P size={12.5}>{fit.note}</P> : null}
                    {mode === 'travel' ? <P size={12.5}>{s.extra > 0 ? `Supplement ${s.extra} EUR/day` : 'No model supplement'}</P> : <P size={12.5}>Monthly price does not add a model supplement.</P>}
                  </Card>
                </Press>
              );
            })}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <P>Only accessories compatible with the {strollerById(strollerId)?.name} are shown. {mode === 'monthly' ? (plan === 'premium' ? ` Premium applies a ${PREMIUM_ACCESSORY_CREDIT} EUR credit this month. Anything above the credit is listed as a charge and is still not billed.` : ' Basic: accessories are charged per item, once.') : ' Each accessory is a flat per-trip amount, separate from the daily rate.'}</P>
            {ACCESSORIES.filter((a) => a.compat.includes(strollerId)).map((a) => {
              const on = accIds.includes(a.id);
              return (
                <Press key={a.id} testID={`acc-${a.id}`} selected={on} accessibilityLabel={a.name} onPress={() => setAccIds(on ? accIds.filter((x) => x !== a.id) : [...accIds, a.id])}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? c.primary : c.border, borderWidth: 2 }}>
                    <Feather name={on ? 'check-square' : 'square'} size={22} color={on ? c.primary : c.mutedForeground} />
                    <View style={{ flex: 1 }}><Text style={{ fontFamily: F.bold, fontSize: 15, color: c.foreground }}>{a.name}</Text></View>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.foreground }}>{mode === 'travel' ? `${eur(a.price)} per trip` : eur(a.price)}</Text>
                  </Card>
                </Press>
              );
            })}
            <P size={12}>Accessories are optional. Continue if you need none.</P>
          </>
        ) : null}

        {step === 3 ? (
          mode === 'monthly' ? (
            <>
              <P>Where will the stroller live? This is a home address in ordinary language, stored only on this device. There is no airport handoff on a monthly plan.</P>
              <Field testID="input-address" label="Home address" value={address} onChangeText={setAddress} placeholder="Street, neighborhood, city" error={!!error} />
              <P size={12}>Coverage sample: {dest}. The address is required for this handoff and is one of the personal details saved with the booking, along with your child's age and weight.</P>
            </>
          ) : (
            <>
              <P>Where would handoff happen in this concept? This pilot only records the place.</P>
              <Press testID="handoff-airport" selected={hType === 'airport'} accessibilityLabel="Airport desk" onPress={() => setHType('airport')}>
                <Card style={{ gap: 4, borderWidth: 2, borderColor: hType === 'airport' ? c.primary : c.border }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.foreground }}>Airport desk</Text>
                  <P>{dd.airport}</P>
                </Card>
              </Press>
              <Press testID="handoff-hotel" selected={hType === 'hotel'} accessibilityLabel="Hotel" onPress={() => setHType('hotel')}>
                <Card style={{ gap: 4, borderWidth: 2, borderColor: hType === 'hotel' ? c.primary : c.border }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.foreground }}>Hotel in {dest}</Text>
                  <P>Hotel address required</P>
                </Card>
              </Press>
              {hType === 'hotel' ? <Field testID="input-address" label="Hotel address" value={address} onChangeText={setAddress} placeholder="Street, number, city" error={!!error} /> : null}
              <P size={12}>A hotel address is stored on this device with the child's age, weight, dates and destination. An airport desk does not ask for one.</P>
            </>
          )
        ) : null}

        {step === 4 ? (
          <>
            <Card style={{ gap: 8 }}>
              <Pill label={mode === 'travel' ? 'Flying Solutions' : 'Pop-up Solutions'} tone={mode === 'travel' ? 'sky' : 'marigold'} />
              <Row a={mode === 'monthly' ? 'Coverage' : 'Destination'} b={dest} />
              <Row a={mode === 'travel' ? 'Dates' : 'First month'} b={mode === 'travel' ? `${fmtDate(start)} to ${fmtDate(end)} (${daysInclusive(start, end)} days)` : `${fmtDate(start)} to ${fmtDate(addDays(start, 29))}`} />
              <Row a="Stroller" b={strollerById(strollerId)?.name ?? ''} />
              <Row a="Child" b={`${m} months, ${w} kg`} />
              <Row a="Handoff" b={mode === 'monthly' ? address.trim() : hType === 'hotel' ? address.trim() : dd.airport} />
            </Card>
            <Card>
              <PriceLines lines={q.lines} total={q.total} caption="Upfront total (illustrative)" />
              {q.credit > 0 ? <P size={12} style={{ marginTop: 8 }}>{eur(q.credit - q.creditUsed)} of {eur(q.credit)} Premium accessory credit left.</P> : null}
            </Card>
            <Card tone="marigold" style={{ gap: 4 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: c.accentForeground }}>DEMO terms</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.accentForeground }}>Prices and policies are illustrative, not an offer. Confirming saves a demo record on this device. No payment is taken, no inventory is held and nothing is delivered. Age and weight checks are not safety certification.</Text>
            </Card>
            <Press testID="agree-terms" selected={agree} accessibilityLabel="I understand this is a demo with no real order" onPress={() => setAgree(!agree)}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Feather name={agree ? 'check-square' : 'square'} size={22} color={agree ? c.primary : c.mutedForeground} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: c.foreground }}>I understand this is a demo with no real order.</Text>
              </View>
            </Press>
          </>
        ) : null}

        <ErrorNote testID="book-error" text={error} />
      </KeyboardAwareScrollViewCompat>
      <View style={{ gap: 8, padding: 16, paddingBottom: Math.max(ins.bottom, 16), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background }}>
        {datesReady ? <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.foreground }}>Illustrative total {eur(q.total)}{mode === 'travel' && start && end && end > start ? ` · ${daysInclusive(start, end)} days` : ''}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 ? <View style={{ flex: 1 }}><Btn testID="book-back" kind="ghost" label="Back" onPress={() => { setError(null); setStep(step - 1); }} /></View> : null}
          <View style={{ flex: 2 }}><Btn testID="book-next" disabled={saving} label={step === 4 ? (saving ? 'Saving...' : 'Save DEMO booking') : 'Continue'} onPress={next} /></View>
        </View>
      </View>
      <Sheet visible={discard} onClose={() => setDiscard(false)} title="Discard this demo?" testID="sheet-discard">
        <P>The dates and choices in this booker will be dropped. Nothing has been saved.</P>
        <Btn testID="confirm-discard" kind="danger" label="Discard" onPress={() => router.back()} />
        <Btn testID="keep-editing" kind="ghost" label="Keep editing" onPress={() => setDiscard(false)} />
      </Sheet>
    </View>
  );
}
