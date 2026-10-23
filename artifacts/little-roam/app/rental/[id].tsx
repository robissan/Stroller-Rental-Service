import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DatePicker, DemoBanner, Empty, ErrorNote, Field, Footer, H1, H2, Label, P, Pill, Press, PriceLines, Row, Screen, Sheet } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { F } from '@/constants/theme';
import { ACCESSORIES, Booking, DAILY_RATE, PHASE_LABEL, PHASE_TONE, STROLLERS, accById, applyExchange, cancelBooking, cancelReturn, eur, exchangeFeeFor, exchangeTargets, fmtDate, markReturned, outgrown, phaseOf, priceBooking, renewMonth, requestAccessory, requestReturn, strollerById, todayISO, validateChild, withChild, type ReturnChecklist } from '@/lib/roam';

type Sh = null | 'acc' | 'exchange' | 'return' | 'cancel' | 'returned' | 'child';
const emptyCheck = (): ReturnChecklist => ({ frame: false, wheels: false, harness: false, accessories: false });

export default function RentalDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, ready, commit } = useRoam();
  const b = bookings.find((x) => x.id === id);
  const [sheet, setSheet] = useState<Sh>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retDate, setRetDate] = useState('');
  const [retLoc, setRetLoc] = useState('');
  const [check, setCheck] = useState<ReturnChecklist>(emptyCheck());
  const [months, setMonths] = useState('');
  const [kg, setKg] = useState('');

  const back = (
    <Press testID="rental-back" accessibilityLabel="Back to My rentals" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rentals'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
      <Feather name="arrow-left" size={20} color={c.pine} /><Text style={{ fontFamily: F.bold, color: c.pine }}>My rentals</Text>
    </Press>
  );

  if (!ready) return <Screen padBottom={40}>{back}<View style={{ height: 160, borderRadius: c.radius, backgroundColor: c.muted }} /></Screen>;
  if (!b) return <Screen padBottom={40}>{back}<Empty icon="search" title="Rental not found" body="This demo booking is not on this device. It may have been removed." action={<Btn testID="not-found-back" label="Back to My rentals" onPress={() => router.replace('/rentals')} />} /></Screen>;

  const s = strollerById(b.strollerId);
  const phase = phaseOf(b);
  const open = b.status === 'saved' || b.status === 'return_requested';
  const canRequest = b.status === 'saved' && phase !== 'ended';
  const prem = b.plan === 'premium';
  const price = priceBooking(b);
  const grown = outgrown(b);
  const exInfo = exchangeFeeFor(bookings, b);

  const update = async (fn: (prev: Booking[]) => Booking[], msg: string) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await commit(fn);
      setSheet(null);
      setNote(msg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };
  const map = (fn: (x: Booking) => Booking, msg: string) => update((prev) => prev.map((x) => (x.id === b.id ? fn(x) : x)), msg);

  const openSheet = (k: Sh) => {
    setErr(null);
    setNote(null);
    if (k === 'return') {
      setRetDate('');
      setRetLoc(b.handoff.address);
      setCheck(emptyCheck());
    }
    if (k === 'child') {
      setMonths(String(b.childMonths));
      setKg(String(b.childKg));
    }
    setSheet(k);
  };

  const saveChild = () => {
    const e = validateChild(months, kg);
    if (e) return setErr(e);
    map((x) => withChild(x, Number(months), Number(kg)), 'Age and weight updated on this device.');
  };
  const reqAcc = (accId: string) => map((x) => requestAccessory(x, accId), 'Accessory request documented. Nothing is fulfilled in this pilot.');
  const reqEx = (toId: string) => update(
    (prev) => prev.map((x) => (x.id === b.id ? applyExchange(prev, x, toId) : x)),
    'Exchange recorded. The active stroller on this demo is now the model you chose.',
  );
  const sendReturn = () => {
    const result = requestReturn(b, { date: retDate, location: retLoc, checklist: check });
    if (result.error || !result.booking) return setErr(result.error ?? 'Could not record the return.');
    const next = result.booking;
    map(() => next, 'Return request recorded locally.');
  };

  const previous = (b.segments ?? []).filter((seg) => seg.strollerId !== b.strollerId);
  const compatAcc = ACCESSORIES.filter((a) => a.compat.includes(b.strollerId));
  const checks: { key: keyof ReturnChecklist; label: string }[] = [
    { key: 'frame', label: 'Frame present' },
    { key: 'wheels', label: 'Wheels present' },
    { key: 'harness', label: 'Harness present' },
    { key: 'accessories', label: 'Accessories with the stroller' },
  ];

  return (
    <View style={{ flex: 1 }} testID="rental-detail">
      <Screen padBottom={40}>
        {back}
        <View style={{ gap: 6 }}>
          <Label>{b.kind === 'travel' ? 'Flying Solutions' : 'Pop-up Solutions'}</Label>
          <H1>{s?.name ?? 'Stroller'} in {b.destination}</H1>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}><Pill label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} /><Pill label="DEMO record" tone="marigold" /></View>
        </View>
        <DemoBanner />
        {note ? <Card tone="sage"><Text testID="rental-note" style={{ fontFamily: F.medium, color: c.pine }}>{note}</Text></Card> : null}
        {grown && canRequest ? <Card tone="marigold"><Text style={{ fontFamily: F.medium, color: c.accentForeground }}>This model is past its illustrative age or weight limit for the child details on this booking. Request an exchange to a model that fits.</Text></Card> : null}

        <Card style={{ gap: 8 }}>
          <Row a={b.kind === 'travel' ? 'Dates' : 'Paid window'} b={`${fmtDate(b.startDate)} to ${fmtDate(b.endDate)}`} />
          {b.plan ? <Row a="Plan" b={prem ? 'Premium' : 'Basic'} /> : null}
          <Row a="Child" b={`${b.childMonths} months, ${b.childKg} kg`} />
          <Row a={b.handoff.type === 'airport' ? 'Airport desk' : b.handoff.type === 'home' ? 'Home' : 'Hotel'} b={b.handoff.address} />
          <Row a="Accessories" b={b.accessoryIds.length ? b.accessoryIds.map((a) => accById(a)?.name).filter(Boolean).join(', ') : 'None'} />
          {previous.length > 0 ? <Row a="Previous model" b={previous.map((seg) => strollerById(seg.strollerId)?.name).filter(Boolean).join(', ')} /> : null}
          <P size={12}>Saved {fmtDate(b.createdAt.slice(0, 10))}. Age and weight are illustrative limits, not a safety certification.</P>
        </Card>

        <Card>
          <PriceLines lines={price.lines} total={price.total} caption="Illustrative total" />
          {price.credit > 0 ? <P size={12} style={{ marginTop: 8 }}>{eur(price.credit - price.creditUsed)} of {eur(price.credit)} Premium accessory credit left.</P> : null}
        </Card>

        {b.returnRequest ? (
          <Card tone="sky" style={{ gap: 6 }}>
            <H2>Return request</H2>
            <Row a="Requested for" b={fmtDate(b.returnRequest.date)} />
            <Row a="Location" b={b.returnRequest.location} />
            {b.returnRequest.checklist ? (
              <P size={12} color={c.pine}>Condition noted on this device: {[
                b.returnRequest.checklist.frame ? 'frame' : null,
                b.returnRequest.checklist.wheels ? 'wheels' : null,
                b.returnRequest.checklist.harness ? 'harness' : null,
                b.returnRequest.checklist.accessories ? 'accessories' : null,
              ].filter(Boolean).join(', ') || 'nothing marked present'}. Not a safety certification.</P>
            ) : null}
            {b.kind === 'travel' && b.returnRequest.date < b.endDate ? <P size={12} color={c.pine}>Early return: the total is recalculated through this date.</P> : null}
            {b.kind === 'travel' && b.returnRequest.date > b.endDate ? <P size={12} color={c.pine}>Late return: {DAILY_RATE} EUR a day after the booked end is included above as a hypothesis.</P> : null}
          </Card>
        ) : null}

        {b.accessoryRequests.length > 0 ? (
          <Card style={{ gap: 8 }}>
            <H2>Accessory requests</H2>
            {b.accessoryRequests.map((r) => <Row key={r.id} a={`${accById(r.accessoryId)?.name ?? 'Accessory'}, ${r.status}`} b={r.charge === 0 ? 'Included' : eur(r.charge)} />)}
          </Card>
        ) : null}
        {b.exchangeRequests.length > 0 ? (
          <Card style={{ gap: 8 }}>
            <H2>Exchange requests</H2>
            {b.exchangeRequests.map((r) => <View key={r.id} style={{ gap: 2 }}><Row a={`To ${strollerById(r.toStrollerId)?.name ?? 'stroller'}`} b={r.fee === 0 ? 'Free' : eur(r.fee)} /><P size={12}>{r.status}</P></View>)}
          </Card>
        ) : null}

        {open ? (
          <View style={{ gap: 10 }}>
            <H2>Manage</H2>
            {b.kind === 'monthly' && b.status === 'saved' ? <Btn testID="open-child" kind="ghost" icon="edit-2" label="Update age and weight" disabled={busy} onPress={() => openSheet('child')} /> : null}
            {phase === 'ended' ? <P>This paid window has ended. Add another illustrative month, or schedule a return. New exchanges wait until the plan is renewed.</P> : null}
            {b.kind === 'monthly' && b.status === 'saved' ? <Btn testID="renew-month" kind="pine" icon="plus" label="Add another month (demo)" disabled={busy} onPress={() => map((x) => renewMonth(x), 'Another illustrative month was added. Nothing was charged.')} /> : null}
            {canRequest ? <Btn testID="open-accessory" kind="pine" icon="plus" label="Request an accessory" disabled={busy} onPress={() => openSheet('acc')} /> : null}
            {canRequest && b.kind === 'monthly' ? <Btn testID="open-exchange" kind="pine" icon="repeat" label="Request an exchange" disabled={busy} onPress={() => openSheet('exchange')} /> : null}
            {b.status === 'saved' ? <Btn testID="open-return" icon="corner-down-left" label="Schedule a return" disabled={busy} onPress={() => openSheet('return')} /> : null}
            {b.status === 'return_requested' ? (
              <>
                <P>A return is already requested, so new exchanges and accessories stay closed.</P>
                <Btn testID="mark-returned" label="Record as returned (demo)" icon="check" disabled={busy} onPress={() => openSheet('returned')} />
                <Btn testID="cancel-return" kind="ghost" label="Cancel return request" disabled={busy} onPress={() => map((x) => cancelReturn(x), 'Return request cancelled.')} />
              </>
            ) : null}
            {b.status === 'saved' ? <Btn testID="open-cancel" kind="danger" label="Cancel demo booking" disabled={busy} onPress={() => openSheet('cancel')} /> : null}
          </View>
        ) : <P>This booking is {PHASE_LABEL[phase].toLowerCase()}, so no further requests can be made.</P>}
        {!sheet ? <ErrorNote testID="rental-error" text={err} /> : null}
        <Footer />
      </Screen>

      <Sheet visible={sheet === 'child'} onClose={() => setSheet(null)} title="Update age and weight" testID="sheet-child">
        <P>These details stay on this device. Saving them rechecks the current model. If the child has outgrown it, the exchange list follows the new numbers.</P>
        <Field testID="edit-months" label="Age (months)" keyboardType="number-pad" value={months} onChangeText={(t) => setMonths(t.replace(/[^0-9]/g, ''))} />
        <Field testID="edit-kg" label="Weight (kg)" keyboardType="decimal-pad" value={kg} onChangeText={(t) => setKg(t.replace(/[^0-9.]/g, ''))} />
        <ErrorNote text={err} />
        <Btn testID="save-child" label="Save on this device" disabled={busy} onPress={saveChild} />
      </Sheet>

      <Sheet visible={sheet === 'acc'} onClose={() => setSheet(null)} title="Request an accessory" testID="sheet-acc">
        <P>{prem ? `Premium applies the monthly accessory credit before anything is listed as due. Nothing is billed.` : 'Each accessory is added to the illustrative total. Nothing is billed in this pilot.'}</P>
        <ErrorNote text={err} />
        {compatAcc.map((a) => {
          const had = b.accessoryIds.includes(a.id) || b.accessoryRequests.some((r) => r.accessoryId === a.id);
          return (
            <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={{ fontFamily: F.bold, color: c.foreground }}>{a.name}</Text><P size={12}>Catalog {eur(a.price)}</P></View>
              {had ? <Pill label="Already added" /> : <Btn small testID={`req-acc-${a.id}`} label="Request" disabled={busy} onPress={() => reqAcc(a.id)} />}
            </Card>
          );
        })}
      </Sheet>

      <Sheet visible={sheet === 'exchange'} onClose={() => setSheet(null)} title="Request an exchange" testID="sheet-exchange">
        <P>{exInfo.detail} The exchange updates the active model on this device and drops accessories that do not fit. Nothing is shipped.</P>
        {grown ? <P color={c.destructive}>The current model is past its illustrative limits.</P> : null}
        <ErrorNote text={err} />
        {exchangeTargets(b).map(({ stroller, suitability: su }) => (
          <Card key={stroller.id} style={{ gap: 6 }}>
            <Text style={{ fontFamily: F.bold, color: c.foreground }}>{stroller.name}</Text>
            <P size={12} color={su.ok ? c.mutedForeground : c.destructive}>{su.reason}</P>
            <Btn small testID={`req-ex-${stroller.id}`} disabled={!su.ok || busy} label={exInfo.free ? 'Request free exchange' : `Request, ${eur(exInfo.fee)}`} onPress={() => reqEx(stroller.id)} />
          </Card>
        ))}
      </Sheet>

      <Sheet visible={sheet === 'return'} onClose={() => setSheet(null)} title="Schedule a return" testID="sheet-return">
        <P>{retDate ? `Return on ${fmtDate(retDate)}` : 'Choose a return date'}</P>
        <DatePicker testID="return-date" value={retDate} min={todayISO() > b.startDate ? todayISO() : b.startDate} onChange={(d) => { setErr(null); setRetDate(d); }} />
        <Field testID="input-return-location" label="Return location" value={retLoc} onChangeText={setRetLoc} placeholder="Home, airport desk, or address" />
        <P size={12}>Note what is with the stroller. This is a record on the device, not an inspection and not a safety certification.</P>
        {checks.map((item) => (
          <Press key={item.key} testID={`check-${item.key}`} selected={check[item.key]} accessibilityLabel={item.label} onPress={() => setCheck({ ...check, [item.key]: !check[item.key] })}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }}>
              <Feather name={check[item.key] ? 'check-square' : 'square'} size={22} color={check[item.key] ? c.primary : c.mutedForeground} />
              <Text style={{ fontFamily: F.medium, color: c.foreground }}>{item.label}</Text>
            </View>
          </Press>
        ))}
        {retDate && b.kind === 'travel' && retDate < b.endDate ? <P size={12}>The illustrative total will be recalculated through this return date.</P> : null}
        {retDate && b.kind === 'travel' && retDate > b.endDate ? <P size={12}>That is after the booked end. An illustrative late fee of {DAILY_RATE} EUR a day will be added.</P> : null}
        <ErrorNote testID="return-error" text={err} />
        <Btn testID="confirm-return" label="Record return request" disabled={busy} onPress={sendReturn} />
      </Sheet>

      <Sheet visible={sheet === 'returned'} onClose={() => setSheet(null)} title="Record as returned" testID="sheet-returned">
        <P>This marks the local demo as returned. It cannot be undone from this screen, and nothing is collected in the real world.</P>
        <ErrorNote text={err} />
        <Btn testID="confirm-returned" label="Yes, mark returned" disabled={busy} onPress={() => map((x) => markReturned(x), 'Marked as returned in this demo.')} />
        <Btn kind="ghost" label="Keep it open" onPress={() => setSheet(null)} />
      </Sheet>

      <Sheet visible={sheet === 'cancel'} onClose={() => setSheet(null)} title="Cancel demo booking" testID="sheet-cancel">
        <P>This only changes the status of the local demo record. Nothing was paid, so nothing is refunded. Cancelling frees the one-stroller slot.</P>
        <ErrorNote text={err} />
        <Btn testID="confirm-cancel" kind="danger" label="Yes, cancel booking" disabled={busy} onPress={() => map((x) => cancelBooking(x), 'Demo booking cancelled.')} />
        <Btn kind="ghost" label="Keep it" onPress={() => setSheet(null)} />
      </Sheet>
    </View>
  );
}
