"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { isFreshOrder, managedOrderKey } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import {
  DEFAULT_ORDER_SOUND_VOLUME,
  playOrderChime,
  readOrderSoundVolume,
  subscribeOrderSoundVolume,
  unlockOrderSound,
  writeOrderSoundVolume,
} from "@/lib/order-sound";

const SOUND_KEY = "algory-orders-sound";
const SOUND_EVENT = "algory-orders-sound-change";
const HIGHLIGHT_MS = 15_000;

function readSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

function subscribeSound(onChange: () => void) {
  window.addEventListener(SOUND_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SOUND_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function pageInView() {
  return document.visibilityState === "visible" && document.hasFocus();
}

/**
 * Notices orders that appear between two refreshes of the same list.
 * The first load of each list only sets the baseline, so changing a filter never rings.
 */
export function useNewOrderAlert() {
  const baselines = useRef(new Map<string, Set<string>>());
  const timers = useRef<number[]>([]);
  const originalTitle = useRef<string | null>(null);
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(() => new Set());
  const [unseen, setUnseen] = useState(0);
  const soundOn = useSyncExternalStore(subscribeSound, readSound, () => true);
  const volume = useSyncExternalStore(
    subscribeOrderSoundVolume,
    readOrderSoundVolume,
    () => DEFAULT_ORDER_SOUND_VOLUME,
  );

  const setVolume = useCallback((next: number) => writeOrderSoundVolume(next), []);

  /** Plays the chime once so the volume can be judged; this is a click, so it may also unlock audio. */
  const previewSound = useCallback((level?: number) => {
    unlockOrderSound();
    playOrderChime(level);
  }, []);

  const setSoundOn = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {
      /* the choice then lasts until the page closes */
    }
    window.dispatchEvent(new Event(SOUND_EVENT));
    if (next) unlockOrderSound();
  }, []);

  /** Call with each freshly fetched list; `listKey` identifies the filter the list was fetched for. */
  const observe = useCallback(
    (listKey: string, orders: OrderResponse[]) => {
      const keys = new Set(orders.map(managedOrderKey));
      const baseline = baselines.current.get(listKey);
      baselines.current.set(listKey, keys);
      if (!baseline) return;
      const added = orders.filter((order) => !baseline.has(managedOrderKey(order)) && isFreshOrder(order));
      if (added.length === 0) return;

      const addedKeys = added.map(managedOrderKey);
      setHighlighted((current) => new Set([...current, ...addedKeys]));
      timers.current.push(
        window.setTimeout(() => {
          setHighlighted((current) => new Set([...current].filter((key) => !addedKeys.includes(key))));
        }, HIGHLIGHT_MS),
      );
      if (!pageInView()) setUnseen((count) => count + added.length);
      if (readSound()) playOrderChime();
    },
    [],
  );

  useEffect(() => {
    const onInteract = () => {
      if (readSound()) unlockOrderSound();
    };
    const onFocus = () => setUnseen(0);
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("focus", onFocus);
    const pending = timers.current;
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("focus", onFocus);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Unread count in the tab title, so new orders show while another tab is open.
  useEffect(() => {
    if (originalTitle.current == null) originalTitle.current = document.title;
    const base = originalTitle.current;
    document.title = unseen > 0 ? `(${unseen}) ${base}` : base;
  }, [unseen]);

  useEffect(
    () => () => {
      if (originalTitle.current != null) document.title = originalTitle.current;
    },
    [],
  );

  return { observe, highlighted, soundOn, setSoundOn, volume, setVolume, previewSound };
}
