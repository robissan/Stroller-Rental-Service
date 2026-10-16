import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking } from '@/lib/roam';

const KEY = 'little-roam:bookings:v1';
type Ctx = {
  bookings: Booking[]; ready: boolean; loadError: string | null; reload: () => Promise<void>;
  commit: (fn: (prev: Booking[]) => Booking[]) => Promise<void>;
};
const RoamContext = createContext<Ctx | null>(null);

export function RoamProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ref = useRef<Booking[]>([]);

  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error('bad shape');
      ref.current = parsed; setBookings(parsed); setLoadError(null);
    } catch {
      setLoadError('Saved demo bookings could not be read from this device.');
    } finally { setReady(true); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const commit = useCallback(async (fn: (prev: Booking[]) => Booking[]) => {
    const next = fn(ref.current);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error('Could not save to this device. Nothing was changed. Please try again.'); }
    ref.current = next; setBookings(next);
  }, []);

  return <RoamContext.Provider value={{ bookings, ready, loadError, reload, commit }}>{children}</RoamContext.Provider>;
}
export function useRoam() {
  const c = useContext(RoamContext);
  if (!c) throw new Error('useRoam must be used inside RoamProvider');
  return c;
}
