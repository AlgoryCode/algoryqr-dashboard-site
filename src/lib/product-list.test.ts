import { describe, expect, it } from "vitest";

import type { ActiveMenuSummaryApiItem, MenuProductApiItem } from "@/lib/api";
import {
  EMPTY_PRODUCT_FILTERS,
  enrichProducts,
  filterProducts,
  foldSearchText,
  formatProductPrice,
  parseProductFilters,
  productFilterOptions,
  productPageItems,
  productPlacement,
  productStatusCounts,
  serializeProductFilters,
} from "@/lib/product-list";

function product(productId: number, patch: Partial<MenuProductApiItem> = {}): MenuProductApiItem {
  return {
    productId,
    name: `Ürün ${productId}`,
    currency: "TRY",
    subCategoryId: 1,
    sortOrder: 0,
    available: true,
    menuId: 8,
    mainCategoryName: "Tatlılar",
    imageUrl: "https://example.test/a.jpg",
    ...patch,
  };
}

const menus: ActiveMenuSummaryApiItem[] = [
  { menuId: 8, qrId: 1, branchId: 5, businessName: "İPEK KAFE", active: true },
  { menuId: 16, qrId: 2, branchId: 24, businessName: "AYA", active: true },
  { menuId: 19, qrId: 3, branchId: null, businessName: "Şubesiz", active: true },
];
const branches = [
  { id: 5, name: "Sefaköy" },
  { id: 24, name: "AYA" },
];

const rows = enrichProducts(
  [
    product(1, { name: "Köfte", mainCategoryName: "Izgara" }),
    product(2, { imageUrl: undefined }),
    product(3, { menuId: 16 }),
    product(4, { menuId: 19, available: false }),
    product(5, { menuId: null }),
    product(6, { menuId: 12 }),
  ],
  menus,
  branches,
);

describe("foldSearchText", () => {
  it("ignores Turkish letters and case", () => {
    expect(foldSearchText("İPEK Köfte Şiş")).toBe("ipek kofte sis");
  });
});

describe("formatProductPrice", () => {
  it("formats lira without empty decimals", () => {
    expect(formatProductPrice(1850, "TRY")).toBe("₺1.850");
    expect(formatProductPrice("12.5", "TRY")).toBe("₺12,5");
  });

  it("treats a missing or zero price as no price", () => {
    expect(formatProductPrice(undefined, "TRY")).toBeNull();
    expect(formatProductPrice(0, "TRY")).toBeNull();
  });

  it("survives an unknown currency code", () => {
    expect(formatProductPrice(10, "lira")).toBe("10 lira");
  });
});

describe("placement", () => {
  it("resolves menu and branch names", () => {
    expect(productPlacement(rows[0])).toEqual({ menu: "İPEK KAFE", branch: "Sefaköy" });
  });

  it("does not repeat a branch named like its menu", () => {
    expect(productPlacement(rows[2])).toEqual({ menu: "AYA", branch: null });
  });

  it("falls back for menus the session cannot name, and for unassigned products", () => {
    expect(productPlacement(rows[5]).menu).toBe("Menü #12");
    expect(productPlacement(rows[4]).menu).toBe("Menüye atanmadı");
  });
});

describe("filterProducts", () => {
  const ids = (patch: Partial<typeof EMPTY_PRODUCT_FILTERS>) =>
    filterProducts(rows, { ...EMPTY_PRODUCT_FILTERS, ...patch }).map((row) => row.productId);

  it("searches names and categories regardless of Turkish letters", () => {
    expect(ids({ query: "kofte" })).toEqual([1]);
    expect(ids({ query: "izgara" })).toEqual([1]);
  });

  it("filters by branch, menu, category and status", () => {
    expect(ids({ branch: "5" })).toEqual([1, 2]);
    expect(ids({ menu: "16" })).toEqual([3]);
    expect(ids({ category: "Izgara" })).toEqual([1]);
    expect(ids({ status: "no-photo" })).toEqual([2]);
    expect(ids({ status: "unavailable" })).toEqual([4]);
    expect(ids({ status: "unassigned" })).toEqual([5]);
  });

  it("counts statuses inside the current scope", () => {
    const counts = productStatusCounts(rows, { ...EMPTY_PRODUCT_FILTERS, branch: "5", status: "no-photo" });
    expect(counts).toMatchObject({ all: 2, "no-photo": 1, unavailable: 0 });
  });
});

describe("productFilterOptions", () => {
  it("narrows menus by branch and categories by menu", () => {
    const options = productFilterOptions(rows, { ...EMPTY_PRODUCT_FILTERS, branch: "5" });
    expect(options.menus).toEqual([
      { value: "all", label: "Tüm menüler" },
      { value: "8", label: "İPEK KAFE (2)" },
    ]);
    expect(options.categories.map((option) => option.value)).toEqual(["all", "Izgara", "Tatlılar"]);
  });

  it("offers a bucket for menus without a branch", () => {
    const { branches: options } = productFilterOptions(rows, EMPTY_PRODUCT_FILTERS);
    expect(options.some((option) => option.value === "none" && option.label.startsWith("Şubesiz menüler"))).toBe(true);
  });
});

describe("address round trip", () => {
  it("keeps only what differs from the defaults", () => {
    expect(serializeProductFilters(EMPTY_PRODUCT_FILTERS).toString()).toBe("");
  });

  it("restores the same filters after leaving the page", () => {
    const filters = { query: "çay", branch: "5", menu: "8", category: "İçecek", status: "no-photo" as const, page: 3 };
    expect(parseProductFilters(serializeProductFilters(filters))).toEqual(filters);
  });

  it("ignores values it does not know", () => {
    expect(parseProductFilters(new URLSearchParams("durum=x&sayfa=-2"))).toEqual(EMPTY_PRODUCT_FILTERS);
  });
});

describe("productPageItems", () => {
  it("shows every page when there are few", () => {
    expect(productPageItems(2, 3)).toEqual([1, 2, 3]);
  });

  it("collapses distant pages", () => {
    expect(productPageItems(9, 18)).toEqual([1, "gap", 8, 9, 10, "gap", 18]);
    expect(productPageItems(1, 18)).toEqual([1, 2, "gap", 18]);
  });
});
