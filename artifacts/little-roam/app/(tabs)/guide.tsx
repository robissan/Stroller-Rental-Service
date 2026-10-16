import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, DemoBanner, Footer, H1, H2, Label, P, Press, Screen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { EXCHANGE_FEE } from '@/lib/roam';

const SECTIONS = [
  { id: 'pilot', title: 'What this local pilot is', body: ['Little Roam is a prototype. There is no live inventory, no payment, no account and no fulfillment.', 'A confirmation saves a clearly labeled DEMO record on this device. Nobody is notified and nothing is shipped.', 'Data stays on this device. The only optional personal detail is a hotel address for handoff, and you can leave the app without entering it by choosing an airport desk.'] },
  { id: 'coverage', title: 'Coverage', body: ['Two sample destinations: Barcelona and Lisbon.', 'Handoff is via a sample airport desk or a hotel. A hotel address is required for hotel handoff.', 'Prices, coverage and policies are illustrative, not commercial offers.'] },
  { id: 'models', title: 'Concept models and limits', body: ['Strollers are concept models, not a branded product. Age and weight limits are illustrative and the app validates your entries against them.', 'Accessories are checked for compatibility with the chosen model.'] },
  { id: 'care', title: 'Care, return and reuse pathway', body: ['Concept pathway: returned equipment goes back to the manufacturer, is inspected, cleaned and then considered for reuse.', 'Any inspection in this app is simulated. It is not an actual safety certification.', 'No environmental benefit is claimed.'] },
  { id: 'returns', title: 'Returns and exchanges', body: ['Schedule a return with a date and location. The app records the request and updates a local status.', `Monthly plans: one free exchange request per 6 months, then ${EXCHANGE_FEE} EUR (hypothesis), target under 7 days. A request shows as documented only.`] },
  { id: 'terms', title: 'Terms (illustrative)', body: ['Travel pilot rate is 12 EUR a day plus any sample model supplement. Monthly plans are 45 EUR (Basic) and 79 EUR (Premium).', 'None of these amounts are charged. Cancelling a demo booking only changes its local status.'] },
];

export default function Guide() {
  const c = useColors();
  const [open, setOpen] = useState<string | null>('pilot');
  return (
    <Screen testID="guide-screen">
      <View><Label>Guide and settings</Label><H1>How the pilot works</H1></View>
      <DemoBanner />
      {SECTIONS.map((s) => {
        const o = open === s.id;
        return (
          <Press key={s.id} testID={`guide-${s.id}`} onPress={() => setOpen(o ? null : s.id)}>
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
      <Footer />
    </Screen>
  );
}
