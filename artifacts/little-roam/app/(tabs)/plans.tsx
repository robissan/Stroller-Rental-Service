import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DemoBanner, Footer, H1, H2, Label, P, Pill, Screen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { F } from '@/constants/theme';
import { BASIC_PRICE, EXCHANGE_FEE, PLANS, PREMIUM_ACCESSORY_CREDIT, PREMIUM_DELTA, PREMIUM_PRICE } from '@/lib/roam';

export default function Plans() {
  const c = useColors();
  return (
    <Screen testID="plans-screen">
      <View><Label>Pop-up Solutions</Label><H1>A stroller by the month</H1></View>
      <DemoBanner />
      <P>A month in this pilot is 30 days. Premium costs {PREMIUM_DELTA} EUR more than Basic ({PREMIUM_PRICE} instead of {BASIC_PRICE}) because that difference buys a {PREMIUM_ACCESSORY_CREDIT} EUR accessory credit every paid month, plus one free exchange per paid month instead of one per six months.</P>
      {PLANS.map((p) => {
        const prem = p.id === 'premium';
        const fg = prem ? c.pineForeground : c.foreground;
        return (
          <Card key={p.id} tone={prem ? 'pine' : undefined} style={{ gap: 12 }}>
            {prem ? <Pill label={`${PREMIUM_ACCESSORY_CREDIT} EUR credit each month`} tone="marigold" /> : null}
            <H2 color={fg}>{p.name}</H2>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontFamily: F.display, fontSize: 44, color: fg }}>{p.price}</Text>
              <P color={prem ? c.pineForeground : undefined} style={{ marginBottom: 8 }}>EUR / month</P>
            </View>
            {p.items.map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <Feather name="check" size={16} color={prem ? c.accent : c.primary} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 20, color: fg }}>{i}</Text>
              </View>
            ))}
            <Btn testID={`choose-${p.id}`} kind={prem ? 'primary' : 'pine'} label={`Start ${p.name} demo booking`} onPress={() => router.push({ pathname: '/book', params: { mode: 'monthly', plan: p.id } })} />
          </Card>
        );
      })}
      <Card tone="sky">
        <H2>How exchanges work</H2>
        <P color={c.pine} style={{ marginTop: 6 }}>Basic: one free exchange request in a 6-month window, then {EXCHANGE_FEE} EUR (a pricing hypothesis). Premium: one free exchange for each paid month, then the same {EXCHANGE_FEE} EUR. A request swaps the active model on this device. It is not fulfilled.</P>
      </Card>
      <Footer />
    </Screen>
  );
}
