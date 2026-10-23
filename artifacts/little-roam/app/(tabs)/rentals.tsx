import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DemoBanner, Empty, ErrorNote, Footer, H1, H2, Label, P, Pill, Press, Screen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { F } from '@/constants/theme';
import { PHASE_LABEL, PHASE_TONE, eur, fmtDate, groupBookings, strollerById } from '@/lib/roam';

export default function Rentals() {
  const c = useColors();
  const { bookings, ready, loadError, reload, clear } = useRoam();
  const groups = groupBookings(bookings);
  return (
    <Screen testID="rentals-screen">
      <View><Label>My rentals</Label><H1>Saved demo bookings</H1></View>
      <DemoBanner />
      {!ready ? [0, 1].map((k) => <View key={k} style={{ height: 110, borderRadius: c.radius, backgroundColor: c.muted }} />) : null}
      {loadError ? (
        <View style={{ gap: 10 }}>
          <ErrorNote testID="load-error" text={loadError} />
          <Btn testID="retry-load" kind="ghost" label="Try again" icon="refresh-cw" onPress={reload} />
          <Btn testID="erase-unreadable" kind="danger" label="Erase demo data on this device" onPress={() => { void clear(); }} />
        </View>
      ) : null}
      {ready && !loadError && bookings.length === 0 ? (
        <Empty icon="briefcase" title="Nothing saved yet" body="Plan a trip or start a monthly plan. Your demo bookings will appear here, on this device only." action={
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            <Btn testID="empty-start" label="Plan a trip" onPress={() => router.push({ pathname: '/book', params: { mode: 'travel' } })} />
            <Btn testID="empty-monthly" kind="pine" label="Start a monthly plan" onPress={() => router.push('/plans')} />
          </View>
        } />
      ) : null}
      {groups.map((group) => (
        <View key={group.phase} style={{ gap: 10 }}>
          <H2>{group.label}</H2>
          {group.items.map((b) => {
            const s = strollerById(b.strollerId);
            return (
              <Press key={b.id} testID={`rental-${b.id}`} accessibilityLabel={`${s?.name ?? 'Stroller'} in ${b.destination}`} onPress={() => router.push({ pathname: '/rental/[id]', params: { id: b.id } })}>
                <Card style={{ gap: 8, opacity: b.status === 'cancelled' ? 0.65 : 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Pill label={b.kind === 'travel' ? 'Flying Solutions' : 'Pop-up Solutions'} tone={b.kind === 'travel' ? 'sky' : 'marigold'} />
                    <Pill label={PHASE_LABEL[group.phase]} tone={PHASE_TONE[group.phase]} />
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 20, color: c.foreground }}>{s?.name ?? 'Stroller'} in {b.destination}</Text>
                  <P>{fmtDate(b.startDate)} to {fmtDate(b.endDate)}{b.plan ? `, ${b.plan === 'premium' ? 'Premium' : 'Basic'}` : ''}</P>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <P color={c.foreground}>Demo total {eur(b.total)}</P>
                    <Feather name="chevron-right" size={18} color={c.mutedForeground} />
                  </View>
                </Card>
              </Press>
            );
          })}
        </View>
      ))}
      <Footer />
    </Screen>
  );
}
