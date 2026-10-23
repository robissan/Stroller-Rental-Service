import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DemoBanner, ErrorNote, Footer, H1, H2, Label, P, Press, Screen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { BASIC_PRICE, DAILY_RATE, EXCHANGE_FEE, MIN_TRAVEL_DAYS, PREMIUM_ACCESSORY_CREDIT, PREMIUM_PRICE, STORAGE_KEY } from '@/lib/roam';

const SECTIONS = [
  { id: 'pilot', title: 'What this local pilot is', body: ['Little Roam is a prototype. There is no live inventory, no payment, no account and no fulfillment.', 'A confirmation saves a clearly labeled DEMO record on this device. Nobody is notified and nothing is shipped.', `Stored under ${STORAGE_KEY}: destination or coverage city, dates, plan, concept stroller, accessories, requests, child age in months, child weight in kg, and a handoff address when you enter one.`] },
  { id: 'coverage', title: 'Coverage', body: ['Two sample destinations: Barcelona and Lisbon. On a trip, the place changes which model is called out as a good or poor match. Age and weight remain the hard limits.', 'Trip handoff is a sample airport desk or a hotel address. A monthly plan asks for a home address instead, and does not offer an airport desk.', 'Prices, coverage and policies are illustrative, not commercial offers.'] },
  { id: 'models', title: 'Concept models and limits', body: ['Strollers are concept models, not a branded product. Age and weight limits are illustrative and the app checks your entries against them.', 'You can update age and weight later. If the child passes the current model’s limit, that model is marked outgrown and the exchange list follows the new numbers.', 'Accessories are checked for compatibility. An exchange drops ones the new model cannot take.'] },
  { id: 'care', title: 'Care, return and reuse pathway', body: ['The intended pathway, outside this pilot, is manufacturer return, inspection, cleaning, then a decision about reuse. This app does not perform that work and claims no environmental benefit.', 'Scheduling a return asks you to note the frame, wheels, harness and accessories. That checklist is stored on the return request. It is not an inspection and it is not a safety certification.'] },
  { id: 'returns', title: 'Returns and exchanges', body: [`Basic: one free exchange request per 6 months, then ${EXCHANGE_FEE} EUR (hypothesis). Premium: one free exchange per paid month, then the same fee. A cancelled booking does not use up the Basic allowance.`, 'An exchange changes the active stroller on this device. After the paid month ends, renew for another illustrative month or schedule a return. One open booking at a time.'] },
  { id: 'terms', title: 'Terms (illustrative)', body: [`Travel pilot rate is ${DAILY_RATE} EUR a day, ${MIN_TRAVEL_DAYS}-day minimum, plus any model supplement. Accessories on a trip are a flat per-trip amount. Monthly plans are ${BASIC_PRICE} EUR (Basic) and ${PREMIUM_PRICE} EUR (Premium), with a ${PREMIUM_ACCESSORY_CREDIT} EUR accessory credit on Premium.`, 'None of these amounts are charged. An early travel return recalculates the total. A late travel return adds the daily rate for the extra days, as a hypothesis. Cancelling a demo booking only changes its local status.'] },
];

export default function Guide() {
  const c = useColors();
  const { clear, bookings } = useRoam();
  const [open, setOpen] = useState<string | null>('pilot');
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const erase = async () => {
    setBusy(true);
    setErr(null);
    try {
      await clear();
      setConfirm(false);
    } catch {
      setErr('Could not erase the saved demo data. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="guide-screen">
      <View><Label>Guide and settings</Label><H1>How the pilot works</H1></View>
      <DemoBanner />
      {SECTIONS.map((s) => {
        const o = open === s.id;
        return (
          <Press key={s.id} testID={`guide-${s.id}`} accessibilityLabel={s.title} onPress={() => setOpen(o ? null : s.id)}>
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}><H2>{s.title}</H2></View>
                <Feather name={o ? 'minus' : 'plus'} size={18} color={c.primary} />
              </View>
              {o ? s.body.map((b) => <P key={b} size={14}>{b}</P>) : null}
            </Card>
          </Press>
        );
      })}
      <Card style={{ gap: 10 }}>
        <H2>Demo data on this device</H2>
        <P>{bookings.length === 0 ? 'No demo bookings are loaded.' : `${bookings.length} demo booking${bookings.length === 1 ? '' : 's'} loaded.`}</P>
        {confirm ? (
          <>
            <P>This removes every booking stored under {STORAGE_KEY}. It does not touch anything outside this app.</P>
            <Btn testID="confirm-erase" kind="danger" label={busy ? 'Erasing...' : 'Erase demo data'} disabled={busy} onPress={erase} />
            <Btn testID="cancel-erase" kind="ghost" label="Keep data" onPress={() => setConfirm(false)} />
          </>
        ) : (
          <Btn testID="erase-demo" kind="danger" label="Erase demo data on this device" onPress={() => setConfirm(true)} />
        )}
        <ErrorNote testID="erase-error" text={err} />
      </Card>
      <Footer />
    </Screen>
  );
}
