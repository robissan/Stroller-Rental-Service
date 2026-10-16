import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DemoBanner, Footer, H1, H2, Label, P, Pill, Screen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { F } from '@/constants/theme';
import { PLANS } from '@/lib/roam';

export default function Plans() {
  const c = useColors();
  return (
    <Screen testID="plans-screen">
      <View><Label>Pop-up Solutions</Label><H1>A stroller by the month</H1></View>
      <DemoBanner />
      {PLANS.map((p) => {
        const prem = p.id === 'premium';
        const fg = prem ? c.pineForeground : c.foreground;
        return (
          <Card key={p.id} tone={prem ? 'pine' : undefined} style={{ gap: 12 }}>
            {prem ? <Pill label="Accessories included" tone="marigold" /> : null}
            <H2 color={fg}>{p.name}</H2>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontFamily: F.display, fontSize: 44, color: fg }}>{p.price}</Text>
              <P color={prem ? '#C9D7CF' : undefined} style={{ marginBottom: 8 }}>EUR / month</P>
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
        <P color="#35525C" style={{ marginTop: 6 }}>One free exchange request per 6 months. Each additional request is 15 EUR (a pricing hypothesis). The target is under 7 days. In this pilot a request is only documented with a status, never fulfilled.</P>
      </Card>
      <Footer />
    </Screen>
  );
}
