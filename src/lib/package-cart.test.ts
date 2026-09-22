import { describe, expect, it } from "vitest";

import type { PlanPackageApiItem } from "@/lib/api";
import { YEARLY_MULTIPLIER, cartPricing, formatCartMoney, selectableModules } from "@/lib/package-cart";

function makePackage(overrides: Partial<PlanPackageApiItem> = {}): PlanPackageApiItem {
  return {
    id: 7,
    code: "STARTER_PACKAGE",
    name: "Başlangıç",
    description: "",
    price: 1000,
    yearlyPrice: 10000,
    currency: "TRY",
    active: true,
    validityDays: 30,
    items: [],
    availableModules: [
      {
        productId: 11,
        productCode: "QR_BRANCH",
        productName: "Ek şube",
        unitPrice: 500,
        vatRate: 20,
        billingType: "RECURRING",
      },
      {
        productId: 12,
        productCode: "WAITER_PANEL",
        productName: "Garson paneli",
        unitPrice: 250,
        vatRate: 20,
        billingType: "RECURRING",
      },
    ],
    ...overrides,
  };
}

function oneTimeModule() {
  return {
    productId: 13,
    productCode: "SMART_REPORTING_ADDON",
    productName: "Ek rapor",
    unitPrice: 200,
    vatRate: 20,
    billingType: "ONE_TIME" as const,
  };
}

describe("selectableModules", () => {
  it("drops modules the package already includes as unlimited", () => {
    const pkg = makePackage({
      items: [
        { id: 1, productId: 11, productCode: "QR_BRANCH", productName: "Ek şube", quantity: 0, unlimited: true },
      ],
    });

    expect(selectableModules(pkg).map((module) => module.productCode)).toEqual(["WAITER_PANEL"]);
  });

  it("keeps modules the package includes with a finite quota so they can be topped up", () => {
    const pkg = makePackage({
      items: [
        { id: 1, productId: 11, productCode: "QR_BRANCH", productName: "Ek şube", quantity: 1, unlimited: false },
      ],
    });

    expect(selectableModules(pkg).map((module) => module.productCode)).toEqual([
      "QR_BRANCH",
      "WAITER_PANEL",
    ]);
  });

  it("keeps ONE_TIME modules, which are charged once instead of every renewal", () => {
    const pkg = makePackage({ availableModules: [oneTimeModule()] });

    expect(selectableModules(pkg).map((module) => module.productCode)).toEqual([
      "SMART_REPORTING_ADDON",
    ]);
  });

  it("returns nothing when no package is selected", () => {
    expect(selectableModules(null)).toEqual([]);
  });
});

describe("cartPricing", () => {
  it("adds VAT-inclusive module lines to the monthly base price", () => {
    const pricing = cartPricing(makePackage(), [{ productCode: "QR_BRANCH", quantity: 2 }], "MONTHLY");

    // 500 × 2 = 1000 net, %20 KDV = 200, satır toplamı 1200.
    expect(pricing.basePrice).toBe(1000);
    expect(pricing.modulesSubtotal).toBe(1000);
    expect(pricing.modulesVat).toBe(200);
    expect(pricing.modulesTotal).toBe(1200);
    expect(pricing.grandTotal).toBe(2200);
  });

  it("multiplies module lines by 12 for a yearly cart", () => {
    const pricing = cartPricing(makePackage(), [{ productCode: "QR_BRANCH", quantity: 1 }], "YEARLY");

    expect(pricing.basePrice).toBe(10000);
    expect(pricing.modulesTotal).toBe(600 * YEARLY_MULTIPLIER);
    expect(pricing.grandTotal).toBe(10000 + 600 * YEARLY_MULTIPLIER);
  });

  it("reports the recurring renewal amount as base plus recurring lines", () => {
    const pricing = cartPricing(
      makePackage(),
      [
        { productCode: "QR_BRANCH", quantity: 1 },
        { productCode: "WAITER_PANEL", quantity: 1 },
      ],
      "MONTHLY",
    );

    expect(pricing.grandTotal).toBe(1000 + 600 + 300);
    expect(pricing.recurringPrice).toBe(pricing.grandTotal);
  });

  it("excludes ONE_TIME lines from the renewal amount", () => {
    const pkg = makePackage({
      availableModules: [...makePackage().availableModules!, oneTimeModule()],
    });

    const pricing = cartPricing(
      pkg,
      [
        { productCode: "QR_BRANCH", quantity: 1 },
        { productCode: "SMART_REPORTING_ADDON", quantity: 1 },
      ],
      "MONTHLY",
    );

    expect(pricing.grandTotal).toBe(1000 + 600 + 240);
    expect(pricing.recurringPrice).toBe(1000 + 600);
  });

  it("does not multiply a ONE_TIME line by 12 in a yearly cart", () => {
    const pkg = makePackage({ availableModules: [oneTimeModule()] });

    const pricing = cartPricing(pkg, [{ productCode: "SMART_REPORTING_ADDON", quantity: 1 }], "YEARLY");

    expect(pricing.modulesTotal).toBe(240);
    expect(pricing.grandTotal).toBe(10000 + 240);
    expect(pricing.recurringPrice).toBe(10000);
  });

  it("flags cart lines that are not offered by the selected package", () => {
    const pricing = cartPricing(makePackage(), [{ productCode: "UNKNOWN_MODULE", quantity: 1 }], "MONTHLY");

    expect(pricing.lines).toEqual([]);
    expect(pricing.unavailableCodes).toEqual(["UNKNOWN_MODULE"]);
    expect(pricing.grandTotal).toBe(1000);
  });

  it("clamps quantities above the per-line maximum", () => {
    const pricing = cartPricing(makePackage(), [{ productCode: "WAITER_PANEL", quantity: 99 }], "MONTHLY");

    expect(pricing.lines[0]?.quantity).toBe(20);
    expect(pricing.lines[0]?.lineTotal).toBe(250 * 20 * 1.2);
  });

  it("prices an empty cart as zero without a package", () => {
    const pricing = cartPricing(null, [], "MONTHLY");

    expect(pricing.grandTotal).toBe(0);
    expect(pricing.lines).toEqual([]);
  });
});

describe("formatCartMoney", () => {
  it("keeps kuruş precision so cart totals match the charged amount", () => {
    expect(formatCartMoney(1234.5)).toBe("₺1.234,50");
  });
});
