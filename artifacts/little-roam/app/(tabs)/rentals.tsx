import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Btn, Card, DemoBanner, Empty, ErrorNote, Footer, H1, Label, P, Pill, Press, Screen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useRoam } from '@/context/RoamContext';
import { F } from '@/constants/theme';
import { STATUS_LABEL, eur, fmtDate, strollerById } from '@/lib/roam';

export default function Rentals() {
  const c = useColors();
  const { bookings, ready, loadError, reload } = useRoam();
  const list = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Screen testID="rentals-screen">
      <View><Label>My rentals</Label><H1>Saved demo bookings</H1></View>
      <DemoBanner />
      {!ready ? [0, 1].map((k) => <View key={k} style={{ height: 110, borderRadius: c.radius, backgroundColor: c.muted }} />) : null}
      {loadError ? (
        <View style={{ gap: 10 }}><ErrorNote testID="load-error" text={loadError} /><Btn testID="retry-load" kind="ghost" label="Try again" icon="refresh-cw" onPress={reload} /></View>
      ) : null}
      {ready && !loadError && list.length === 0 ? (
        <Empty icon="briefcase" title="Nothing saved yet" body="Plan a trip or start a monthly plan. Your demo bookings will appear here, on this device only." action={<Btn testID="empty-start" label="Plan a trip" onPress={() => router.push({ pathname: '/book', params: { mode: 'travel' } })} />} />
      ) : null}
      {list.map((b) => {
        const s = strollerById(b.strollerId);
        return (
          <Press key={b.id} testID={`rental-${b.id}`} onPress={() => router.push({ pathname: '/rental/[id]', params: { id: b.id } })}>
            <Card style={{ gap: 8, opacity: b.status === 'cancelled' ? 0.65 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pill label={b.kind === 'travel' ? 'Flying Solutions' : 'Pop-up Solutions'} tone={b.kind === 'travel' ? 'sky' : 'marigold'} />
                <Pill label={STATUS_LABEL[b.status]} tone={b.status === 'cancelled' ? 'danger' : 'sage'} />
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 20, color: c.foreground }}>{s?.name ?? 'Stroller'} in {b.destination}</Text>
              <P>{b.kind === 'travel' ? `${fmtDate(b.startDate)} to ${fmtDate(b.endDate)}` : `From ${fmtDate(b.startDate)}, ${b.plan === 'premium' ? 'Premium' : 'Basic'} plan`}</P>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <P color={c.foreground}>Demo total {eur(b.total)}</P>
                <Feather name="chevron-right" size={18} color={c.mutedForeground} />
              </View>
            </Card>
          </Press>
        );
      })}
      <Footer />
    </Screen>
  );
}
