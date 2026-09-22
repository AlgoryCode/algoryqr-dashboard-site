"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { StorePublicProduct } from "@/lib/store-public";

export type StoreCartOption = {
  groupId: number;
  groupName: string;
  optionId: number;
  optionName: string;
  priceDelta: number;
};

export type StoreCartLine = {
  lineId: string;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
  options: StoreCartOption[];
};

const STORAGE_PREFIX = "algoryqr.store.cart.";
const CART_EVENT = "algoryqr-store-cart";

function storageKey(handle: string): string {
  return `${STORAGE_PREFIX}${handle}`;
}

const EMPTY_LINES: StoreCartLine[] = [];

/** useSyncExternalStore requires a stable snapshot, so parsed carts are memoised per raw payload. */
const snapshotCache = new Map<string, { raw: string | null; lines: StoreCartLine[] }>();

function parseCart(raw: string | null): StoreCartLine[] {
  if (!raw) return EMPTY_LINES;
  try {
    const parsed = JSON.parse(raw) as StoreCartLine[];
    return Array.isArray(parsed) ? parsed : EMPTY_LINES;
  } catch {
    return EMPTY_LINES;
  }
}

function readCart(handle: string): StoreCartLine[] {
  if (typeof window === "undefined") return EMPTY_LINES;
  const raw = window.localStorage.getItem(storageKey(handle));
  const cached = snapshotCache.get(handle);
  if (cached && cached.raw === raw) return cached.lines;
  const lines = parseCart(raw);
  snapshotCache.set(handle, { raw, lines });
  return lines;
}

function subscribeToCart(handle: string, onChange: () => void): () => void {
  const listener = (event: Event) => {
    if (event instanceof CustomEvent && event.detail !== handle) return;
    onChange();
  };
  window.addEventListener(CART_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CART_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function writeCart(handle: string, lines: StoreCartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(handle), JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: handle }));
}

export function lineTotal(line: StoreCartLine): number {
  const optionsTotal = line.options.reduce((sum, option) => sum + option.priceDelta, 0);
  return (line.unitPrice + optionsTotal) * line.quantity;
}

export function cartSubtotal(lines: StoreCartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function useStoreCart(handle: string) {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToCart(handle, onChange),
    [handle],
  );
  const lines = useSyncExternalStore(
    subscribe,
    () => readCart(handle),
    () => EMPTY_LINES,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const addLine = useCallback(
    (product: StorePublicProduct, options: StoreCartOption[], note: string | null, quantity = 1) => {
      const current = readCart(handle);
      const signature = optionSignature(product.productId, options, note);
      const existing = current.find(
        (line) => optionSignature(line.productId, line.options, line.note) === signature,
      );
      const next = existing
        ? current.map((line) =>
            line.lineId === existing.lineId ? { ...line, quantity: line.quantity + quantity } : line,
          )
        : [
            ...current,
            {
              lineId: `${product.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              productId: product.productId,
              productName: product.name,
              unitPrice: product.price ?? 0,
              quantity,
              note,
              options,
            },
          ];
      writeCart(handle, next);
    },
    [handle],
  );

  const setQuantity = useCallback(
    (lineId: string, quantity: number) => {
      const next = readCart(handle)
        .map((line) => (line.lineId === lineId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0);
      writeCart(handle, next);
    },
    [handle],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      writeCart(handle, readCart(handle).filter((line) => line.lineId !== lineId));
    },
    [handle],
  );

  const clear = useCallback(() => writeCart(handle, []), [handle]);

  return {
    lines,
    hydrated,
    subtotal: cartSubtotal(lines),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    addLine,
    setQuantity,
    removeLine,
    clear,
  };
}

function optionSignature(productId: number, options: StoreCartOption[], note: string | null): string {
  const optionIds = options
    .map((option) => option.optionId)
    .sort((a, b) => a - b)
    .join(".");
  return `${productId}|${optionIds}|${note ?? ""}`;
}
