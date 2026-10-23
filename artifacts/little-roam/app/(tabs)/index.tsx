import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, Chip, DemoBanner, Footer, H1, H2, Label, P, Pill, Press, Screen, StrollerArt } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { F } from '@/constants/theme';
import { DAILY_RATE, DESTINATIONS, MIN_TRAVEL_DAYS, PLANS, STROLLERS } from '@/lib/roam';

export default function Explore() {
  const c = useColors();
  const [dest, setDest] = useState<string>('Barcelona');
  const [open, setOpen] = useState<string | null>(null);
  const d = DESTINATIONS.find((x) => x.id === dest)!;
  return (
    <Screen testID="explore-screen">
      <View>
        <Label>Little Roam</Label>
        <H1>Travel light. Roam longer.</H1>
      </View>
      <DemoBanner />
      <Card tone="pine" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Label color={c.accent}>Stroller as a service</Label>
            <H2 color={c.pineForeground}>Leave the stroller at home.</H2>
            <P color={c.pineForeground}>Pick a concept model and record a handoff point. This pilot only saves the request on this device.</P>
          </View>
          <View style={{ marginRight: -14 }}><StrollerArt size={110} color={c.pineForeground} accent={c.primary} /></View>
        </View>
      </Card>

      <H2>Two ways to roam</H2>
      <Card>
        <View style={{ gap: 8 }}>
          <Pill label="Flying Solutions" tone="sky" />
          <H2>For a trip</H2>
          <P>Pick up at a sample airport desk or hotel and keep it for your dates. Pilot rate {DAILY_RATE} EUR a day, {MIN_TRAVEL_DAYS}-day minimum, shown as an upfront total.</P>
          <Btn testID="start-travel" label="Plan a trip" icon="send" onPress={() => router.push({ pathname: '/book', params: { mode: 'travel', dest } })} />
        </View>
      </Card>
      <Card tone="sage">
        <View style={{ gap: 8 }}>
          <Pill label="Pop-up Solutions" tone="marigold" />
          <H2>For the month</H2>
          <P color={c.pine}>A monthly stroller at home, from {PLANS[0].price} EUR a month. Update age and weight when your child grows, then exchange to a model that fits.</P>
          <Btn testID="start-monthly" kind="pine" label="Compare plans" icon="repeat" onPress={() => router.push('/plans')} />
        </View>
      </Card>

      <H2>Where it could start</H2>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {DESTINATIONS.map((x) => <Chip key={x.id} testID={`dest-${x.id}`} label={x.id} active={x.id === dest} onPress={() => setDest(x.id)} />)}
      </View>
      <Card>
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: F.display, fontSize: 24, color: c.foreground }}>{d.id}, {d.country}</Text>
          <P>{d.blurb}</P>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{d.tags.map((t) => <Pill key={t} label={t} />)}</View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Feather name="map-pin" size={14} color={c.mutedForeground} /><P size={13}>{d.airport}, or your hotel</P></View>
          <Btn testID="book-destination" kind="ghost" label={`Book for ${d.id}`} onPress={() => router.push({ pathname: '/book', params: { mode: 'travel', dest: d.id } })} />
        </View>
      </Card>

      <H2>Concept strollers</H2>
      <P>Illustrative models and limits. Not a branded product.</P>
      {STROLLERS.map((s) => {
        const o = open === s.id;
        return (
          <Press key={s.id} testID={`stroller-${s.id}`} onPress={() => setOpen(o ? null : s.id)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: c.muted, borderRadius: 14, padding: 6 }}><StrollerArt size={64} color={c.pine} accent={c.accent} model={s.id} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 17, color: c.foreground }}>{s.name}</Text>
                  <P size={13}>{s.minM}-{s.maxM} months, up to {s.maxKg} kg</P>
                </View>
                <Feather name={o ? 'chevron-up' : 'chevron-down'} size={18} color={c.mutedForeground} />
              </View>
              {o ? (
                <View style={{ gap: 6, marginTop: 12 }}>
                  <P color={c.foreground}>{s.tagline}</P>
                  {s.notes.map((n) => <P key={n} size={13}>- {n}</P>)}
                  <P size={13}>Own weight {s.selfKg} kg. Travel supplement {s.extra > 0 ? `${s.extra} EUR/day` : 'none'}.</P>
                </View>
              ) : null}
            </Card>
          </Press>
        );
      })}
      <Footer />
    </Screen>
  );
}
