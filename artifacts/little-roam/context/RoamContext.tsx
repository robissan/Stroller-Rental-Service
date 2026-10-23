import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY, STORAGE_READ_ERROR, loadStored, type Booking } from '@/lib/roam';

type Ctx = {
  bookings: Booking[];
  ready: boolean;
  writable: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  commit: (fn: (prev: Booking[]) => Booking[]) => Promise<void>;
  clear: () => Promise<void>;
};
const RoamContext = createContext<Ctx | null>(null);

export function RoamProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);
  const [writable, setWritable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ref = useRef<Booking[]>([]);
  const writableRef = useRef(false);
  const readyRef = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const applyLoad = useCallback((raw: string | null) => {
    const loaded = loadStored(raw);
    ref.current = loaded.bookings;
    writableRef.current = loaded.writable;
    setBookings(loaded.bookings);
    setWritable(loaded.writable);
    setLoadError(loaded.error);
  }, []);

  const reload = useCallback(async () => {
    try {
      applyLoad(await AsyncStorage.getItem(STORAGE_KEY));
    } catch {
      writableRef.current = false;
      setWritable(false);
      setLoadError(STORAGE_READ_ERROR);
    } finally {
      readyRef.current = true;
      setReady(true);
    }
  }, [applyLoad]);

  useEffect(() => { void reload(); }, [reload]);

  const commit = useCallback((fn: (prev: Booking[]) => Booking[]) => {
    const run = queue.current.then(async () => {
      if (!readyRef.current) throw new Error('Saved bookings are still loading.');
      if (!writableRef.current) throw new Error(STORAGE_READ_ERROR);
      const next = fn(ref.current);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      ref.current = next;
      setBookings(next);
    });
    queue.current = run.then(() => undefined, () => undefined);
    return run;
  }, []);

  const clear = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    ref.current = [];
    writableRef.current = true;
    readyRef.current = true;
    setBookings([]);
    setWritable(true);
    setLoadError(null);
    setReady(true);
  }, []);

  return (
    <RoamContext.Provider value={{ bookings, ready, writable, loadError, reload, commit, clear }}>
      {children}
    </RoamContext.Provider>
  );
}

export function useRoam() {
  const c = useContext(RoamContext);
  if (!c) throw new Error('useRoam must be used inside RoamProvider');
  return c;
}
