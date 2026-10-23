import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { F } from '@/constants/theme';
import { ABOUT, PILOT_SHORT, eur, parseISO, toISO, type Line } from '@/lib/roam';

export function useTop() {
  const i = useSafeAreaInsets();
  return Platform.OS === 'web' ? 67 : i.top + 8;
}
export const TAB_PAD = Platform.OS === 'web' ? 110 : 120;
const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
const AP = Animated.createAnimatedComponent(Pressable);

export function Press({ children, style, onPress, disabled, testID, accessibilityLabel, selected }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; disabled?: boolean; testID?: string; accessibilityLabel?: string; selected?: boolean }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AP testID={testID} disabled={disabled} onPress={() => { tap(); onPress?.(); }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      onPressIn={() => { s.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 12 }); }}
      style={[a, style as ViewStyle, disabled ? { opacity: 0.45 } : null]}>{children}</AP>
  );
}

export function Btn({ label, onPress, kind = 'primary', icon, disabled, testID, small }: { label: string; onPress: () => void; kind?: 'primary' | 'pine' | 'ghost' | 'danger'; icon?: keyof typeof Feather.glyphMap; disabled?: boolean; testID?: string; small?: boolean }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.primary : kind === 'pine' ? c.pine : kind === 'danger' ? c.destructive : 'transparent';
  const fg = kind === 'ghost' ? c.pine : c.primaryForeground;
  return (
    <Press testID={testID} onPress={onPress} disabled={disabled} accessibilityLabel={label}
      style={{ backgroundColor: bg, borderRadius: 999, paddingVertical: small ? 10 : 15, paddingHorizontal: small ? 16 : 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: kind === 'ghost' ? 1.5 : 0, borderColor: c.pine, minHeight: small ? 44 : 48 }}>
      {icon ? <Feather name={icon} size={16} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: F.bold, fontSize: small ? 13 : 15 }}>{label}</Text>
    </Press>
  );
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: ViewStyle; tone?: 'pine' | 'sage' | 'sky' | 'marigold' }) {
  const c = useColors();
  const bg = tone === 'pine' ? c.pine : tone === 'sage' ? c.secondary : tone === 'sky' ? c.sky : tone === 'marigold' ? c.accent : c.card;
  return <View style={[{ backgroundColor: bg, borderRadius: c.radius, padding: 18, borderWidth: tone ? 0 : 1, borderColor: c.border }, style]}>{children}</View>;
}

export function H1({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ fontFamily: F.display, fontSize: 32, lineHeight: 38, color: color ?? c.foreground, letterSpacing: -0.5 }}>{children}</Text>;
}
export function H2({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ fontFamily: F.display, fontSize: 21, lineHeight: 27, color: color ?? c.foreground }}>{children}</Text>;
}
export function P({ children, color, size = 14, style }: { children: React.ReactNode; color?: string; size?: number; style?: object }) {
  const c = useColors();
  return <Text style={[{ fontFamily: F.body, fontSize: size, lineHeight: size * 1.45, color: color ?? c.mutedForeground }, style]}>{children}</Text>;
}
export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: color ?? c.pine }}>{children}</Text>;
}

export function Chip({ label, active, onPress, testID, disabled }: { label: string; active?: boolean; onPress?: () => void; testID?: string; disabled?: boolean }) {
  const c = useColors();
  const body = (
    <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: active ? c.pine : c.muted }}>
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: active ? c.pineForeground : c.foreground }}>{label}</Text>
    </View>
  );
  return onPress ? <Press testID={testID} onPress={onPress} disabled={disabled} selected={!!active} accessibilityLabel={label}>{body}</Press> : body;
}

export function Pill({ label, tone = 'sage' }: { label: string; tone?: 'sage' | 'marigold' | 'sky' | 'danger' | 'muted' }) {
  const c = useColors();
  const bg = tone === 'marigold' ? c.accent : tone === 'sky' ? c.sky : tone === 'danger' ? c.destructive : tone === 'muted' ? c.muted : c.secondary;
  const fg = tone === 'danger' ? c.destructiveForeground : tone === 'muted' ? c.foreground : c.pine;
  return <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ fontFamily: F.bold, fontSize: 11, color: fg }}>{label}</Text></View>;
}

export function DemoBanner() {
  const c = useColors();
  return (
    <View testID="pilot-banner" style={{ flexDirection: 'row', gap: 10, backgroundColor: c.accent, borderRadius: 14, padding: 12, alignItems: 'flex-start' }}>
      <Feather name="info" size={16} color={c.accentForeground} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: c.accentForeground }}>{PILOT_SHORT}</Text>
    </View>
  );
}

export function Footer() {
  const c = useColors();
  return <Text testID="about-footer" style={{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: c.mutedForeground, textAlign: 'center', paddingHorizontal: 12, marginTop: 8 }}>{ABOUT}</Text>;
}

export function Screen({ children, padBottom = TAB_PAD, testID }: { children: React.ReactNode; padBottom?: number; testID?: string }) {
  const c = useColors();
  const top = useTop();
  return (
    <ScrollView testID={testID} style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ paddingTop: top + 8, paddingBottom: padBottom, paddingHorizontal: 20, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Field({ label, error, ...rest }: TextInputProps & { label: string; error?: boolean }) {
  const c = useColors();
  const [f, setF] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: c.foreground }}>{label}</Text>
      <TextInput {...rest} accessibilityLabel={rest.accessibilityLabel ?? label} onFocus={() => setF(true)} onBlur={() => setF(false)} placeholderTextColor={c.mutedForeground}
        style={{ fontFamily: F.body, fontSize: 15, color: c.foreground, backgroundColor: c.card, borderRadius: 14, borderWidth: 1.5, borderColor: error ? c.destructive : f ? c.primary : c.border, paddingHorizontal: 14, paddingVertical: 12 }} />
    </View>
  );
}

export function ErrorNote({ text, testID }: { text: string | null; testID?: string }) {
  const c = useColors();
  if (!text) return null;
  return (
    <View testID={testID} accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, backgroundColor: c.dangerMuted, padding: 12, borderRadius: 12 }}>
      <Feather name="alert-circle" size={16} color={c.destructive} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: c.destructive }}>{text}</Text>
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 10, padding: 28, borderRadius: c.radius, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center' }}><Feather name={icon} size={22} color={c.pine} /></View>
      <H2>{title}</H2>
      <P style={{ textAlign: 'center' }}>{body}</P>
      {action}
    </View>
  );
}

export function PriceLines({ lines, total, caption }: { lines: Line[]; total: number; caption?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      {caption ? <H2>{caption}</H2> : null}
      {lines.map((line, i) => (
        <View key={`${line.label}-${i}`} style={{ gap: 2 }}>
          <Row a={line.label} b={eur(line.amount)} />
          {line.note ? <P size={12}>{line.note}</P> : null}
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: c.border }} />
      <Row bold a="Total, not charged" b={eur(total)} />
    </View>
  );
}

export function Row({ a, b, bold }: { a: string; b: string; bold?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, fontFamily: bold ? F.bold : F.body, fontSize: 14, color: bold ? c.foreground : c.mutedForeground }}>{a}</Text>
      <Text style={{ fontFamily: bold ? F.bold : F.medium, fontSize: 14, color: c.foreground, textAlign: 'right', flexShrink: 1 }}>{b}</Text>
    </View>
  );
}

export function StrollerArt({ size = 120, color, accent, model = 'wren' }: { size?: number; color: string; accent: string; model?: string }) {
  const wheel = model === 'ridge' ? 13 : model === 'cradle' ? 9 : 6;
  const seat = model === 'cradle'
    ? 'M34 18 L40 62 H98 C98 28 78 18 52 22 Z'
    : model === 'ridge'
      ? 'M34 16 L46 58 H100 C100 30 82 18 56 20 Z'
      : 'M34 20 L50 56 H88 C88 36 74 28 56 30 Z';
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 120 96">
      <Path d="M18 14 H34" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Path d={seat} fill={accent} />
      <Path d="M34 14 L52 70" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Path d="M44 58 H96" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <Path d="M52 70 L30 84 M52 70 L90 84" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={28} cy={82} r={wheel} fill={color} />
      <Circle cx={92} cy={82} r={wheel} fill={color} />
      <Circle cx={28} cy={82} r={Math.max(2, wheel / 3)} fill={accent} />
      <Circle cx={92} cy={82} r={Math.max(2, wheel / 3)} fill={accent} />
      <Rect x={model === 'wren' ? 62 : 58} y={model === 'ridge' ? 44 : 40} width={model === 'wren' ? 12 : 18} height={9} rx={4} fill={color} opacity={0.25} />
    </Svg>
  );
}

export function Sheet({ visible, onClose, title, children, testID }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; testID?: string }) {
  const c = useColors();
  const i = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(42,36,51,0.5)' }} onPress={onClose} />
      <View testID={testID} style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Math.max(i.bottom, 20) + 8, maxHeight: '88%' }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <H2>{title}</H2>
          <Press onPress={onClose} testID="sheet-close" accessibilityLabel="Close" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Feather name="x" size={22} color={c.foreground} /></Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export function DatePicker({ value, min, onChange, testID, rangeStart, rangeEnd }: { value: string; min: string; onChange: (s: string) => void; testID?: string; rangeStart?: string; rangeEnd?: string }) {
  const c = useColors();
  const base = parseISO(value || min);
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: base.getFullYear(), m: base.getMonth() });
  const first = new Date(cur.y, cur.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, k) => k + 1)];
  const shift = (d: number) => { const n = new Date(cur.y, cur.m + d, 1); setCur({ y: n.getFullYear(), m: n.getMonth() }); };
  return (
    <View testID={testID} style={{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Press onPress={() => shift(-1)} testID={`${testID}-prev`} accessibilityLabel="Previous month" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Feather name="chevron-left" size={22} color={c.pine} /></Press>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: c.foreground }}>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
        <Press onPress={() => shift(1)} testID={`${testID}-next`} accessibilityLabel="Next month" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Feather name="chevron-right" size={22} color={c.pine} /></Press>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {DOW.map((d, k) => <Text key={k} style={{ width: '14.285%', textAlign: 'center', fontFamily: F.bold, fontSize: 11, color: c.mutedForeground, marginBottom: 4 }}>{d}</Text>)}
        {cells.map((d, k) => {
          if (!d) return <View key={k} style={{ width: '14.285%', height: 44 }} />;
          const iso = toISO(new Date(cur.y, cur.m, d));
          const off = iso < min;
          const endpoint = iso === rangeStart || iso === rangeEnd || iso === value;
          const inRange = !!(rangeStart && rangeEnd && rangeEnd > rangeStart && iso > rangeStart && iso < rangeEnd);
          return (
            <View key={k} style={{ width: '14.285%', height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Press testID={`${testID}-${iso}`} disabled={off} selected={endpoint} accessibilityLabel={iso} onPress={() => onChange(iso)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: endpoint ? c.primary : inRange ? c.secondary : 'transparent' }}>
                <Text style={{ fontFamily: endpoint ? F.bold : F.medium, fontSize: 13, color: endpoint ? c.primaryForeground : c.foreground }}>{d}</Text>
              </Press>
            </View>
          );
        })}
      </View>
    </View>
  );
}
