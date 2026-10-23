import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, DatePicker, DemoBanner, ErrorNote, Field, H1, H2, Label, P, Pill, Press, Row, useTop } from '@/components/ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { F } from '@/constants/theme';
import { ACCESSORIES, Booking, DESTINATIONS, Mode, PLANS, STROLLERS, accById, addDays, eur, fmtDate, newId, quote, strollerById, suitability, todayISO, validateTrip } from '@/lib/roam';

const STEPS = ['Trip', 'Equipment', 'Accessories', 'Handoff', 'Review'];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Book() {
  const c = useColors();
  const top = useTop();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ mode?: string; dest?: string; plan?: string }>();
  const { commit } = useRoam();
  const today = todayISO();

  const [step, setStep] = useState<number>(0);
  const [mode, setMode] = useState<Mode>(one(p.mode) === 'monthly' ? 'monthly' : 'travel');
  const [dest, setDest] = useState<string>(DESTINATIONS.some((d) => d.id === one(p.dest)) ? (one(p.dest) as string) : 'Barcelona');
  const [plan, setPlan] = useState<'basic' | 'premium'>(one(p.plan) === 'premium' ? 'premium' : 'basic');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [which, setWhich] = useState<'start' | 'end'>('start');
  const [months, setMonths] = useState<string>('');
  const [kg, setKg] = useState<string>('');
  const [strollerId, setStrollerId] = useState<string>('');
  const [accIds, setAccIds] = useState<string[]>([]);
  const [hType, setHType] = useState<'airport' | 'hotel'>('airport');
  const [address, setAddress] = useState<string>('');
  const [agree, setAgree] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<boolean>(false);
  const savedIdRef = useRef<string | null>(null);
  const allowLeave = useRef<boolean>(false);
  const navigation = useNavigation();
  savedIdRef.current = savedId;

  const dd = DESTINATIONS.find((d) => d.id === dest)!;
  const q = quote({ mode, start, end, strollerId, accIds, plan });
  const m = Number(months), w = Number(kg);

  const next = async () => {
    setError(null);
    if (step === 0) {
      const e = validateTrip(mode, start, end, months, kg);
      if (e) return setError(e);
      if (strollerId) { const s = strollerById(strollerId); if (s && !suitability(s, m, w).ok) setStrollerId(''); }
    } else if (step === 1) {
      if (!strollerId) return setError('Choose a suitable stroller to continue.');
    } else if (step === 3) {
      if (hType === 'hotel' && address.trim().length < 5) return setError('Hotel address is required for hotel handoff.');
    } else if (step === 4) {
      if (!agree) return setError('Please acknowledge the pilot terms to save the demo booking.');
      const e = validateTrip(mode, start, end, months, kg);
      if (e) return setError(e);
      const s = strollerById(strollerId);
      if (!s || !suitability(s, m, w).ok) return setError('Selected stroller does not suit the child details.');
      const b: Booking = {
        id: newId(), kind: mode, destination: dest, startDate: start, endDate: mode === 'travel' ? end : addDays(start, 29),
        childMonths: m, childKg: w, strollerId, accessoryIds: accIds,
        handoff: { type: hType, address: hType === 'hotel' ? address.trim() : dd.airport },
        plan: mode === 'monthly' ? plan : undefined, total: q.total, createdAt: new Date().toISOString(), status: 'saved',
        accessoryRequests: [], exchangeRequests: [],
      };
      setSaving(true);
      try { await commit((prev) => [b, ...prev]); setSavedId(b.id); }
      catch (err) { setError(err instanceof Error ? err.message : 'Could not save.'); }
      finally { setSaving(false); }
      return;
    }
    setStep(step + 1);
  };

  const pickStroller = (id: string) => { setStrollerId(id); setAccIds((a) => a.filter((x) => accById(x)?.compat.includes(id))); };
  const leave = () => router.back();
  const discard = () => { allowLeave.current = true; setConfirmLeave(false); router.back(); };

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || savedIdRef.current) return;
      e.preventDefault();
      setConfirmLeave(true);
    });
    return sub;
  }, [navigation]);

  if (savedId) {
    return (
      <View testID="booking-saved" style={{ flex: 1, backgroundColor: c.pine, padding: 24, paddingTop: top + 24, justifyContent: 'center', gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={30} color={c.accentForeground} /></View>
        <H1 color={c.pineForeground}>Demo booking saved</H1>
        <P color="#C9D7CF" size={15}>This is a DEMO record stored on this device. Nothing was paid, reserved or sent. No real stroller is waiting for you.</P>
        <Btn testID="view-rental" label="View in My rentals" onPress={() => { router.dismissAll?.(); router.replace({ pathname: '/rental/[id]', params: { id: savedId } }); }} />
        <Btn testID="done-close" kind="ghost" light label="Close" onPress={leave} />
      </View>
    );
  }

  const bar = (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
      {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.primary : c.border }} />)}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }} testID="book-screen">
      <View style={{ paddingTop: top, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Label>Step {step + 1} of 5</Label><H2>{STEPS[step]}</H2></View>
          <Press testID="book-close" onPress={() => setConfirmLeave(true)}><Feather name="x" size={24} color={c.foreground} /></Press>
        </View>
        {bar}
      </View>
      <KeyboardAwareScrollViewCompat bottomOffset={80} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }}>
        <DemoBanner />

        {step === 0 ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip testID="mode-travel" label="Flying Solutions" active={mode === 'travel'} onPress={() => setMode('travel')} />
              <Chip testID="mode-monthly" label="Pop-up Solutions" active={mode === 'monthly'} onPress={() => setMode('monthly')} />
            </View>
            <Label>Destination</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>{DESTINATIONS.map((d) => <Chip key={d.id} testID={`book-dest-${d.id}`} label={d.id} active={d.id === dest} onPress={() => setDest(d.id)} />)}</View>
            {mode === 'monthly' ? (
              <>
                <Label>Plan</Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>{PLANS.map((x) => <Chip key={x.id} testID={`plan-${x.id}`} label={`${x.name} ${x.price} EUR`} active={x.id === plan} onPress={() => setPlan(x.id)} />)}</View>
              </>
            ) : null}
            <Label>{mode === 'travel' ? 'Dates' : 'Plan start date'}</Label>
            {mode === 'travel' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip testID="which-start" label={`Start: ${start ? fmtDate(start) : 'choose'}`} active={which === 'start'} onPress={() => setWhich('start')} />
                <Chip testID="which-end" label={`End: ${end ? fmtDate(end) : 'choose'}`} active={which === 'end'} onPress={() => setWhich('end')} />
              </View>
            ) : <P color={c.foreground}>{start ? `Starts ${fmtDate(start)}` : 'Choose a start date'}</P>}
            <DatePicker
              key={which}
              testID="date-picker"
              value={which === 'start' || mode === 'monthly' ? start : end}
              min={which === 'end' && start ? (mode === 'travel' ? start : addDays(start, 1)) : today}
              onChange={(d) => {
                setError(null);
                if (which === 'start' || mode === 'monthly') { setStart(d); if (end && end < d) setEnd(''); if (mode === 'travel') setWhich('end'); }
                else setEnd(d);
              }}
            />
            <Label>Child suitability</Label>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field testID="input-months" label="Age (months)" keyboardType="number-pad" value={months} onChangeText={(t) => setMonths(t.replace(/[^0-9]/g, ''))} placeholder="e.g. 14" /></View>
              <View style={{ flex: 1 }}><Field testID="input-kg" label="Weight (kg)" keyboardType="decimal-pad" value={kg} onChangeText={(t) => setKg(t.replace(/[^0-9.]/g, ''))} placeholder="e.g. 9.5" /></View>
            </View>
            <P size={12}>Used only to check illustrative limits. Stored with the demo booking on this device.</P>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <P>Sample concept models for a {m}-month, {w} kg child. Not live inventory.</P>
            {STROLLERS.map((s) => {
              const su = suitability(s, m, w); const sel = strollerId === s.id;
              return (
                <Press key={s.id} testID={`pick-${s.id}`} disabled={!su.ok} onPress={() => pickStroller(s.id)}>
                  <Card style={{ gap: 6, borderColor: sel ? c.primary : c.border, borderWidth: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: F.display, fontSize: 19, color: c.foreground }}>{s.name}</Text>
                      {sel ? <Feather name="check-circle" size={20} color={c.primary} /> : null}
                    </View>
                    <P>{s.tagline}</P>
                    <Pill label={su.ok ? 'Suitable' : 'Not suitable'} tone={su.ok ? 'sage' : 'danger'} />
                    <P size={12.5} color={su.ok ? c.mutedForeground : c.destructive}>{su.reason}</P>
                    {mode === 'travel' ? <P size={12.5}>{s.extra > 0 ? `Supplement ${s.extra} EUR/day` : 'No supplement'}</P> : null}
                  </Card>
                </Press>
              );
            })}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <P>Only accessories compatible with the {strollerById(strollerId)?.name} are shown.{mode === 'monthly' ? (plan === 'premium' ? ' Premium includes accessories.' : ' Basic: accessories are charged per item.') : ' Charged per item for the trip.'}</P>
            {ACCESSORIES.filter((a) => a.compat.includes(strollerId)).map((a) => {
              const on = accIds.includes(a.id); const inc = mode === 'monthly' && plan === 'premium';
              return (
                <Press key={a.id} testID={`acc-${a.id}`} onPress={() => setAccIds(on ? accIds.filter((x) => x !== a.id) : [...accIds, a.id])}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? c.primary : c.border, borderWidth: 2 }}>
                    <Feather name={on ? 'check-square' : 'square'} size={22} color={on ? c.primary : c.mutedForeground} />
                    <View style={{ flex: 1 }}><Text style={{ fontFamily: F.bold, fontSize: 15, color: c.foreground }}>{a.name}</Text></View>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.foreground }}>{inc ? 'Included' : eur(a.price)}</Text>
                  </Card>
                </Press>
              );
            })}
            <P size={12}>Accessories are optional. Skip this step if you need none.</P>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <P>Where would handoff happen in this concept?</P>
            <Press testID="handoff-airport" onPress={() => setHType('airport')}>
              <Card style={{ gap: 4, borderWidth: 2, borderColor: hType === 'airport' ? c.primary : c.border }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.foreground }}>Airport desk</Text>
                <P>{dd.airport}</P>
              </Card>
            </Press>
            <Press testID="handoff-hotel" onPress={() => setHType('hotel')}>
              <Card style={{ gap: 4, borderWidth: 2, borderColor: hType === 'hotel' ? c.primary : c.border }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.foreground }}>Hotel in {dest}</Text>
                <P>Hotel address required</P>
              </Card>
            </Press>
            {hType === 'hotel' ? <Field testID="input-address" label="Hotel address" value={address} onChangeText={setAddress} placeholder="Street, number, city" error={!!error} /> : null}
            <P size={12}>The address is the only optional personal detail in the app. It stays on this device.</P>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Card style={{ gap: 8 }}>
              <Pill label={mode === 'travel' ? 'Flying Solutions' : 'Pop-up Solutions'} tone={mode === 'travel' ? 'sky' : 'marigold'} />
              <Row a="Destination" b={dest} />
              <Row a={mode === 'travel' ? 'Dates' : 'Starts'} b={mode === 'travel' ? `${fmtDate(start)} to ${fmtDate(end)}` : fmtDate(start)} />
              <Row a="Stroller" b={strollerById(strollerId)?.name ?? ''} />
              <Row a="Child" b={`${m} months, ${w} kg`} />
              <Row a="Handoff" b={hType === 'airport' ? dd.airport : address.trim()} />
            </Card>
            <Card style={{ gap: 8 }}>
              <H2>Upfront total (illustrative)</H2>
              {q.lines.map((l, i) => <Row key={i} a={l.label} b={l.note ?? eur(l.amount)} />)}
              <View style={{ height: 1, backgroundColor: c.border }} />
              <Row bold a="Total, not charged" b={eur(q.total)} />
            </Card>
            <Card tone="marigold" style={{ gap: 4 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: c.accentForeground }}>DEMO terms</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.accentForeground }}>Prices and policies are illustrative, not an offer. Confirming saves a demo record on this device. No payment is taken, no inventory is held and nothing is delivered. Simulated checks are not safety certification.</Text>
            </Card>
            <Press testID="agree-terms" onPress={() => setAgree(!agree)}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Feather name={agree ? 'check-square' : 'square'} size={22} color={agree ? c.primary : c.mutedForeground} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: c.foreground }}>I understand this is a demo with no real order.</Text>
              </View>
            </Press>
          </>
        ) : null}

      </KeyboardAwareScrollViewCompat>
      <View style={{ gap: 10, padding: 16, paddingBottom: Math.max(ins.bottom, 16), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background }}>
        <ErrorNote testID="book-error" text={error} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 ? <View style={{ flex: 1 }}><Btn testID="book-back" kind="ghost" label="Back" onPress={() => { setError(null); setStep(step - 1); }} /></View> : null}
          <View style={{ flex: 2 }}><Btn testID="book-next" disabled={saving} label={step === 4 ? (saving ? 'Saving...' : 'Save DEMO booking') : 'Continue'} onPress={next} /></View>
        </View>
      </View>
      {confirmLeave ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', zIndex: 30 }}>
          <Pressable testID="discard-backdrop" onPress={() => setConfirmLeave(false)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(42,36,51,0.5)' }} />
          <View testID="sheet-discard" style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Math.max(ins.bottom, 20) + 8, gap: 14 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
            <H2>Discard this booking?</H2>
            <P>Leaving now throws away the dates, child details and choices on this form. Nothing has been saved on this device.</P>
            <Btn testID="confirm-discard" kind="danger" label="Yes, discard" onPress={discard} />
            <Btn testID="keep-editing" kind="ghost" label="Keep editing" onPress={() => setConfirmLeave(false)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
