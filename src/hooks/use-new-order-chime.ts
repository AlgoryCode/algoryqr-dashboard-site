"use client";

import { useEffect, useRef } from "react";

import { playOrderChime, unlockOrderSound } from "@/lib/order-sound";

/** Plays a short chime and mirrors the pending count in the tab title whenever a new order lands. */
export function useNewOrderChime(pendingCount: number | undefined) {
  const previousCountRef = useRef<number | null>(null);
  const baseTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingCount == null) return;
    const previous = previousCountRef.current;
    previousCountRef.current = pendingCount;
    if (previous == null || pendingCount <= previous) return;
    playOrderChime();
  }, [pendingCount]);

  // Browsers keep audio muted until the page is clicked or typed in.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockOrderSound);
    window.addEventListener("keydown", unlockOrderSound);
    return () => {
      window.removeEventListener("pointerdown", unlockOrderSound);
      window.removeEventListener("keydown", unlockOrderSound);
    };
  }, []);

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
