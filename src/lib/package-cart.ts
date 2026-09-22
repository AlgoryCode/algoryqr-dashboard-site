"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { PlanPackageApiItem, PlanPackageModuleApi, ProductBillingType } from "@/lib/api";
import type { BillingPeriod } from "@/lib/commerce";
import { resolvePackagePricing } from "@/lib/package-display";

export type PackageCartModule = {
  productCode: string;
  quantity: number;
};

/** ADDON: mevcut aboneliğe modül ekleme. NEW_PACKAGE: yeni paket + modül satın alma. */
export type PackageCartIntent = "NEW_PACKAGE" | "ADDON";

export type PackageCart = {
  packageId: number | null;
  billingPeriod: BillingPeriod;
  modules: PackageCartModule[];
  intent: PackageCartIntent;
};

const STORAGE_KEY = "algoryqr.package.cart";
const CART_EVENT = "algoryqr-package-cart";

export const YEARLY_MULTIPLIER = 12;

export const MAX_MODULE_QUANTITY = 20;

export const EMPTY_CART: PackageCart = {
  packageId: null,
  billingPeriod: "MONTHLY",
  modules: [],
  intent: "NEW_PACKAGE",
};

let snapshotCache: { raw: string | null; cart: PackageCart } = { raw: null, cart: EMPTY_CART };

function normalizeCart(parsed: unknown): PackageCart {
  if (!parsed || typeof parsed !== "object") return EMPTY_CART;
  const candidate = parsed as Partial<PackageCart>;
  const packageId = Number(candidate.packageId);
  const billingPeriod: BillingPeriod = candidate.billingPeriod === "YEARLY" ? "YEARLY" : "MONTHLY";
  const intent: PackageCartIntent = candidate.intent === "ADDON" ? "ADDON" : "NEW_PACKAGE";
  const modules = Array.isArray(candidate.modules)
    ? candidate.modules
        .map((line) => ({
          productCode: String((line as PackageCartModule)?.productCode ?? "").trim().toUpperCase(),
          quantity: clampQuantity(Number((line as PackageCartModule)?.quantity ?? 0)),
        }))
        .filter((line) => line.productCode.length > 0 && line.quantity > 0)
    : [];
  return {
    packageId: Number.isFinite(packageId) && packageId > 0 ? packageId : null,
    billingPeriod,
    modules,
    intent,
  };
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(Math.max(Math.trunc(quantity), 0), MAX_MODULE_QUANTITY);
}

function parseCart(raw: string | null): PackageCart {
  if (!raw) return EMPTY_CART;
  try {
    return normalizeCart(JSON.parse(raw));
  } catch {
    return EMPTY_CART;
  }
}

export function readCart(): PackageCart {
  if (typeof window === "undefined") return EMPTY_CART;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (snapshotCache.raw === raw) return snapshotCache.cart;
  const cart = parseCart(raw);
  snapshotCache = { raw, cart };
  return cart;
}

function writeCart(cart: PackageCart) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function clearCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

function subscribeToCart(onChange: () => void): () => void {
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function money(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCartMoney(amount: number, currency = "TRY"): string {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";
  return `${symbol}${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export type CartModuleLine = {
  productCode: string;
  productName: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  billingType: ProductBillingType;
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
};

export type CartPricing = {
  basePrice: number;
  modulesSubtotal: number;
  modulesVat: number;
  modulesTotal: number;
  grandTotal: number;
  recurringPrice: number;
  currency: string;
  suffix: string;
  lines: CartModuleLine[];
  unavailableCodes: string[];
};

function resolveBillingType(module: PlanPackageModuleApi): ProductBillingType {
  return module.billingType === "ONE_TIME" ? "ONE_TIME" : "RECURRING";
}

export function selectableModules(pkg: PlanPackageApiItem | null | undefined): PlanPackageModuleApi[] {
  if (!pkg) return [];
  const unlimitedProductIds = new Set(
    (pkg.items ?? []).filter((item) => item.unlimited).map((item) => item.productId),
  );
  return (pkg.availableModules ?? []).filter((module) => !unlimitedProductIds.has(module.productId));
}

/**
 * `includeBasePackage=false` mevcut aboneliğe modül eklerken kullanılır (yalnızca modül tutarı).
 */
export function cartPricing(
  pkg: PlanPackageApiItem | null | undefined,
  modules: PackageCartModule[],
  billingPeriod: BillingPeriod,
  includeBasePackage = true,
): CartPricing {
  const pricing = pkg && includeBasePackage ? resolvePackagePricing(pkg, billingPeriod) : null;
  const basePrice = round2(pricing?.amount ?? 0);
  const available = new Map(selectableModules(pkg).map((module) => [module.productCode, module]));

  const lines: CartModuleLine[] = [];
  const unavailableCodes: string[] = [];
  for (const line of modules) {
    const module = available.get(line.productCode);
    if (!module) {
      unavailableCodes.push(line.productCode);
      continue;
    }
    const quantity = clampQuantity(line.quantity);
    if (quantity <= 0) continue;

    const billingType = resolveBillingType(module);
    const unitPrice = round2(money(module.unitPrice));
    const vatRate = money(module.vatRate);
    const multiplier =
      billingPeriod === "YEARLY" && billingType === "RECURRING" ? YEARLY_MULTIPLIER : 1;
    const lineSubtotal = round2(round2(unitPrice * quantity) * multiplier);
    const lineVat = round2(round2((round2(unitPrice * quantity) * vatRate) / 100) * multiplier);
    lines.push({
      productCode: module.productCode,
      productName: module.productName,
      description: module.description ?? null,
      quantity,
      unitPrice,
      vatRate,
      billingType,
      lineSubtotal,
      lineVat,
      lineTotal: round2(lineSubtotal + lineVat),
    });
  }

  const modulesSubtotal = round2(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
  const modulesVat = round2(lines.reduce((sum, line) => sum + line.lineVat, 0));
  const modulesTotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const recurringModulesTotal = round2(
    lines
      .filter((line) => line.billingType === "RECURRING")
      .reduce((sum, line) => sum + line.lineTotal, 0),
  );

  return {
    basePrice,
    modulesSubtotal,
    modulesVat,
    modulesTotal,
    grandTotal: round2(basePrice + modulesTotal),
    recurringPrice: round2(basePrice + recurringModulesTotal),
    currency: pkg?.currency ?? "TRY",
    suffix: pricing?.suffix ?? (billingPeriod === "YEARLY" ? "/ yıl" : "/ ay"),
    lines,
    unavailableCodes,
  };
}

export function usePackageCart() {
  const cart = useSyncExternalStore(subscribeToCart, readCart, () => EMPTY_CART);
  const hydrated = useSyncExternalStore(
    subscribeToCart,
    () => true,
    () => false,
  );

  const selectPackage = useCallback(
    (packageId: number, billingPeriod?: BillingPeriod, intent: PackageCartIntent = "NEW_PACKAGE") => {
      const current = readCart();
      if (current.packageId === packageId && current.intent === intent) {
        writeCart({
          ...current,
          billingPeriod: billingPeriod ?? current.billingPeriod,
          intent,
        });
        return;
      }
      writeCart({
        packageId,
        billingPeriod: billingPeriod ?? current.billingPeriod,
        modules: current.packageId === packageId ? current.modules : [],
        intent,
      });
    },
    [],
  );

  const setIntent = useCallback((intent: PackageCartIntent) => {
    writeCart({ ...readCart(), intent });
  }, []);

  const setBillingPeriod = useCallback((billingPeriod: BillingPeriod) => {
    writeCart({ ...readCart(), billingPeriod });
  }, []);

  const setModuleQuantity = useCallback((productCode: string, quantity: number) => {
    const current = readCart();
    const code = productCode.trim().toUpperCase();
    const next = clampQuantity(quantity);
    const existing = current.modules.find((line) => line.productCode === code);
    const modules = existing
      ? current.modules
          .map((line) => (line.productCode === code ? { ...line, quantity: next } : line))
          .filter((line) => line.quantity > 0)
      : next > 0
        ? [...current.modules, { productCode: code, quantity: next }]
        : current.modules;
    writeCart({ ...current, modules });
  }, []);

  const addModule = useCallback(
    (productCode: string, quantity = 1) => {
      const current = readCart();
      const code = productCode.trim().toUpperCase();
      const existing = current.modules.find((line) => line.productCode === code);
      setModuleQuantity(code, (existing?.quantity ?? 0) + quantity);
    },
    [setModuleQuantity],
  );

  const removeModule = useCallback(
    (productCode: string) => setModuleQuantity(productCode, 0),
    [setModuleQuantity],
  );

  const clear = useCallback(() => clearCart(), []);

  const moduleQuantity = useCallback(
    (productCode: string) =>
      cart.modules.find((line) => line.productCode === productCode.trim().toUpperCase())?.quantity ?? 0,
    [cart.modules],
  );

  return {
    cart,
    hydrated,
    itemCount: (cart.intent === "NEW_PACKAGE" && cart.packageId ? 1 : 0) + cart.modules.length,
    moduleCount: cart.modules.reduce((sum, line) => sum + line.quantity, 0),
    moduleQuantity,
    selectPackage,
    setIntent,
    setBillingPeriod,
    setModuleQuantity,
    addModule,
    removeModule,
    clear,
  };
}
