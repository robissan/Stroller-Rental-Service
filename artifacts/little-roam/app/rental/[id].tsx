import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DatePicker, DemoBanner, Empty, ErrorNote, Field, Footer, H1, H2, Label, P, Pill, Press, Row, Screen, Sheet, useTop } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { F } from '@/constants/theme';
import { ACCESSORIES, Booking, EXCHANGE_FEE, STATUS_LABEL, STROLLERS, accById, eur, exchangeFeeFor, fmtDate, newId, strollerById, suitability, todayISO } from '@/lib/roam';

type Sh = null | 'acc' | 'exchange' | 'return' | 'cancel';

export default function RentalDetail() {
  const c = useColors();
  const top = useTop();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, ready, commit } = useRoam();
  const b = bookings.find((x) => x.id === id);
  const [sheet, setSheet] = useState<Sh>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [retDate, setRetDate] = useState<string>('');
  const [retLoc, setRetLoc] = useState<string>('');

  const back = (
    <Press testID="rental-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rentals'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Feather name="arrow-left" size={20} color={c.pine} /><Text style={{ fontFamily: F.bold, color: c.pine }}>My rentals</Text>
    </Press>
  );

  if (!ready) return <Screen padBottom={40}>{back}<View style={{ height: 160, borderRadius: c.radius, backgroundColor: c.muted }} /></Screen>;
  if (!b) return <Screen padBottom={40}>{back}<Empty icon="search" title="Rental not found" body="This demo booking is not on this device. It may have been removed." action={<Btn testID="not-found-back" label="Back to My rentals" onPress={() => router.replace('/rentals')} />} /></Screen>;

  const s = strollerById(b.strollerId);
  const active = b.status === 'saved' || b.status === 'return_requested';
  const prem = b.plan === 'premium';
  const update = async (fn: (x: Booking) => Booking, msg: string) => {
    setErr(null);
    try { await commit((prev) => prev.map((x) => (x.id === b.id ? fn(x) : x))); setSheet(null); setNote(msg); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); }
  };
  const open = (k: Sh) => { setErr(null); setNote(null); if (k === 'return') { setRetDate(''); setRetLoc(b.handoff.type === 'hotel' ? b.handoff.address : b.handoff.address); } setSheet(k); };

  const reqAcc = (accId: string) => {
    const a = accById(accId)!;
    const charge = prem ? 0 : a.price;
    update((x) => ({ ...x, accessoryRequests: [...x.accessoryRequests, { id: newId(), accessoryId: accId, charge, status: 'Request documented', at: new Date().toISOString() }] }), `${a.name} request documented. Nothing is fulfilled in this pilot.`);
  };
  const reqEx = (toId: string) => {
    const { fee } = exchangeFeeFor(bookings);
    update((x) => ({ ...x, exchangeRequests: [...x.exchangeRequests, { id: newId(), toStrollerId: toId, fee, status: 'Request documented, target under 7 days (not fulfilled in pilot)', at: new Date().toISOString() }] }), 'Exchange request documented.');
  };
  const sendReturn = () => {
    if (!retDate) return setErr('Choose a return date.');
    if (retDate < todayISO()) return setErr('Return date cannot be in the past.');
    if (retDate < b.startDate) return setErr('Return date cannot be before the rental start.');
    if (retLoc.trim().length < 3) return setErr('Enter a return location.');
    update((x) => ({ ...x, status: 'return_requested', returnRequest: { date: retDate, location: retLoc.trim(), requestedAt: new Date().toISOString() } }), 'Return request recorded locally.');
  };

  const exInfo = exchangeFeeFor(bookings);
  const compatAcc = ACCESSORIES.filter((a) => a.compat.includes(b.strollerId));

  return (
    <View style={{ flex: 1 }} testID="rental-detail">
      <Screen padBottom={40}>
        {back}
        <View style={{ gap: 6 }}>
          <Label>{b.kind === 'travel' ? 'Flying Solutions' : 'Pop-up Solutions'}</Label>
          <H1>{s?.name} in {b.destination}</H1>
          <View style={{ flexDirection: 'row', gap: 6 }}><Pill label={STATUS_LABEL[b.status]} tone={b.status === 'cancelled' ? 'danger' : 'sage'} /><Pill label="DEMO record" tone="marigold" /></View>
        </View>
        <DemoBanner />
        {note ? <Card tone="sage"><Text testID="rental-note" style={{ fontFamily: F.medium, color: c.pine }}>{note}</Text></Card> : null}

        <Card style={{ gap: 8 }}>
          <Row a={b.kind === 'travel' ? 'Dates' : 'First month'} b={`${fmtDate(b.startDate)} to ${fmtDate(b.endDate)}`} />
          {b.plan ? <Row a="Plan" b={prem ? 'Premium' : 'Basic'} /> : null}
          <Row a="Child" b={`${b.childMonths} months, ${b.childKg} kg`} />
          <Row a={b.handoff.type === 'airport' ? 'Airport desk' : 'Hotel'} b={b.handoff.address} />
          <Row a="Accessories" b={b.accessoryIds.length ? b.accessoryIds.map((a) => accById(a)?.name).join(', ') : 'None'} />
          <Row bold a="Demo total, not charged" b={eur(b.total)} />
          <P size={12}>Saved {fmtDate(b.createdAt.slice(0, 10))}. Simulated check only, not a safety certification.</P>
        </Card>

        {b.returnRequest ? (
          <Card tone="sky" style={{ gap: 6 }}>
            <H2>Return request</H2>
            <Row a="Requested for" b={fmtDate(b.returnRequest.date)} />
            <Row a="Location" b={b.returnRequest.location} />
            <P size={12} color="#35525C">Recorded {fmtDate(b.returnRequest.requestedAt.slice(0, 10))}. Concept pathway: manufacturer return, inspection, cleaning, reuse.</P>
          </Card>
        ) : null}

        {b.accessoryRequests.length > 0 ? (
          <Card style={{ gap: 8 }}>
            <H2>Accessory requests</H2>
            {b.accessoryRequests.map((r) => <Row key={r.id} a={`${accById(r.accessoryId)?.name}, ${r.status}`} b={r.charge === 0 ? 'Included' : eur(r.charge)} />)}
          </Card>
        ) : null}
        {b.exchangeRequests.length > 0 ? (
          <Card style={{ gap: 8 }}>
            <H2>Exchange requests</H2>
            {b.exchangeRequests.map((r) => <View key={r.id} style={{ gap: 2 }}><Row a={`To ${strollerById(r.toStrollerId)?.name}`} b={r.fee === 0 ? 'Free' : eur(r.fee)} /><P size={12}>{r.status}</P></View>)}
          </Card>
        ) : null}

        {active ? (
          <View style={{ gap: 10 }}>
            <H2>Manage</H2>
            <Btn testID="open-accessory" kind="pine" icon="plus" label="Request an accessory" onPress={() => open('acc')} />
            {b.kind === 'monthly' ? <Btn testID="open-exchange" kind="pine" icon="repeat" label="Request an exchange" onPress={() => open('exchange')} /> : null}
            {b.status === 'saved' ? <Btn testID="open-return" icon="corner-down-left" label="Schedule a return" onPress={() => open('return')} /> : null}
            {b.status === 'return_requested' ? (
              <>
                <Btn testID="mark-returned" label="Record as returned (demo)" icon="check" onPress={() => update((x) => ({ ...x, status: 'returned' }), 'Marked as returned in this demo.')} />
                <Btn testID="cancel-return" kind="ghost" label="Cancel return request" onPress={() => update((x) => ({ ...x, status: 'saved', returnRequest: undefined }), 'Return request cancelled.')} />
              </>
            ) : null}
            {b.status === 'saved' ? <Btn testID="open-cancel" kind="danger" label="Cancel demo booking" onPress={() => open('cancel')} /> : null}
          </View>
        ) : <P>This booking is {STATUS_LABEL[b.status].toLowerCase()}, so no further requests can be made.</P>}
        {!sheet ? <ErrorNote testID="rental-error" text={err} /> : null}
        <Footer />
      </Screen>

      <Sheet visible={sheet === 'acc'} onClose={() => setSheet(null)} title="Request an accessory" testID="sheet-acc">
        <P>{prem ? 'Premium includes accessory requests at no extra charge.' : b.kind === 'monthly' ? 'Basic plan: each accessory is charged as shown. Nothing is billed in this pilot.' : 'Travel booking: each accessory is charged as shown. Nothing is billed in this pilot.'}</P>
        <ErrorNote text={err} />
        {compatAcc.map((a) => {
          const had = b.accessoryIds.includes(a.id) || b.accessoryRequests.some((r) => r.accessoryId === a.id);
          return (
            <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={{ fontFamily: F.bold, color: c.foreground }}>{a.name}</Text><P size={12}>{prem ? 'Included' : `Charge ${eur(a.price)}`}</P></View>
              {had ? <Pill label="Already added" /> : <Btn small testID={`req-acc-${a.id}`} label={prem ? 'Request' : `Request, ${eur(a.price)}`} onPress={() => reqAcc(a.id)} />}
            </Card>
          );
        })}
      </Sheet>

      <Sheet visible={sheet === 'exchange'} onClose={() => setSheet(null)} title="Request an exchange" testID="sheet-exchange">
        <P>{exInfo.free ? 'Your free exchange request for this 6-month window is available.' : `Your free exchange was used within 6 months. This request costs ${EXCHANGE_FEE} EUR (hypothesis).`} Target is under 7 days. Pilot only: the request is documented, not fulfilled.</P>
        <ErrorNote text={err} />
        {STROLLERS.filter((x) => x.id !== b.strollerId).map((x) => {
          const su = suitability(x, b.childMonths, b.childKg);
          return (
            <Card key={x.id} style={{ gap: 6 }}>
              <Text style={{ fontFamily: F.bold, color: c.foreground }}>{x.name}</Text>
              <P size={12} color={su.ok ? c.mutedForeground : c.destructive}>{su.reason}</P>
              <Btn small testID={`req-ex-${x.id}`} disabled={!su.ok} label={exInfo.free ? 'Request free exchange' : `Request, ${eur(EXCHANGE_FEE)}`} onPress={() => reqEx(x.id)} />
            </Card>
          );
        })}
      </Sheet>

      <Sheet visible={sheet === 'return'} onClose={() => setSheet(null)} title="Schedule a return" testID="sheet-return">
        <P>{retDate ? `Return on ${fmtDate(retDate)}` : 'Choose a return date'}</P>
        <DatePicker testID="return-date" value={retDate} min={todayISO() > b.startDate ? todayISO() : b.startDate} onChange={(d) => { setErr(null); setRetDate(d); }} />
        <Field testID="input-return-location" label="Return location" value={retLoc} onChangeText={setRetLoc} placeholder="Airport desk or address" />
        <ErrorNote testID="return-error" text={err} />
        <Btn testID="confirm-return" label="Record return request" onPress={sendReturn} />
      </Sheet>

      <Sheet visible={sheet === 'cancel'} onClose={() => setSheet(null)} title="Cancel demo booking" testID="sheet-cancel">
        <P>This only changes the status of the local demo record. Nothing was paid, so nothing is refunded.</P>
        <ErrorNote text={err} />
        <Btn testID="confirm-cancel" kind="danger" label="Yes, cancel booking" onPress={() => update((x) => ({ ...x, status: 'cancelled' }), 'Demo booking cancelled.')} />
        <Btn kind="ghost" label="Keep it" onPress={() => setSheet(null)} />
      </Sheet>
    </View>
  );
}
