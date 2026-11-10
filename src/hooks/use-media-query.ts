"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Live result of a CSS media query; false on the server and on the first client render. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones and small tablets, where filters open as a bottom sheet. */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
