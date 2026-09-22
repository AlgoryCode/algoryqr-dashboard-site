"use client";

import { useEffect, useRef } from "react";

const CHIME_FREQUENCIES = [880, 1174];
const TONE_SECONDS = 0.18;

/** Plays a short chime and mirrors the pending count in the tab title whenever a new order lands. */
export function useNewOrderChime(pendingCount: number | undefined) {
  const previousCountRef = useRef<number | null>(null);
  const baseTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingCount == null) return;
    const previous = previousCountRef.current;
    previousCountRef.current = pendingCount;
    if (previous == null || pendingCount <= previous) return;
    playChime();
  }, [pendingCount]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (baseTitleRef.current == null) {
      baseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, "");
    }
    const base = baseTitleRef.current;
    document.title = pendingCount && pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [pendingCount]);
}

function playChime() {
  const AudioContextCtor =
    typeof window === "undefined"
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    CHIME_FREQUENCIES.forEach((frequency, index) => {
      const startAt = context.currentTime + index * TONE_SECONDS;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + TONE_SECONDS);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + TONE_SECONDS);
    });
    window.setTimeout(() => void context.close(), CHIME_FREQUENCIES.length * TONE_SECONDS * 1000 + 200);
  } catch {
    // autoplay policy blocks audio until the user interacts with the page
  }
}
