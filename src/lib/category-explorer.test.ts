import { describe, expect, it } from "vitest";

import type { ActiveMenuSummaryApiItem, MainCategoryApiItem, MenuProductApiItem } from "@/lib/api";
import {
  menusForBranch,
  parseExplorerBranch,
  pickExplorerMenu,
  productCountBySubCategory,
  productsForMainCategory,
  productsForSubCategory,
  serializeExplorerBranch,
  sortExplorerCategories,
} from "@/lib/category-explorer";

const menus: ActiveMenuSummaryApiItem[] = [
  { menuId: 1, qrId: 10, branchId: 5, businessName: "Kadıköy", active: true },
  { menuId: 2, qrId: 20, branchId: 5, businessName: "Kahvaltı", active: false },
  { menuId: 3, qrId: 30, branchId: null, businessName: "Paket", active: true },
];

function product(productId: number, subCategoryId: number, extra: Partial<MenuProductApiItem> = {}): MenuProductApiItem {
  return { productId, name: `Ürün ${productId}`, currency: "TRY", subCategoryId, sortOrder: productId, available: true, ...extra };
}

describe("explorer branch", () => {
  it("parsesAndSerializesBranch", () => {
    expect(parseExplorerBranch(null)).toBe("all");
    expect(parseExplorerBranch("none")).toBe("none");
    expect(parseExplorerBranch("5")).toBe(5);
    expect(parseExplorerBranch("x")).toBe("all");
    expect(serializeExplorerBranch("all")).toBeNull();
    expect(serializeExplorerBranch(5)).toBe("5");
  });

  it("filtersMenusByBranch", () => {
    expect(menusForBranch(menus, "all").map((menu) => menu.menuId)).toEqual([1, 2, 3]);
    expect(menusForBranch(menus, 5).map((menu) => menu.menuId)).toEqual([1, 2]);
    expect(menusForBranch(menus, "none").map((menu) => menu.menuId)).toEqual([3]);
  });
});

describe("pickExplorerMenu", () => {
  it("prefersMenuIdThenQrIdThenFirst", () => {
    expect(pickExplorerMenu(menus, { menuId: 2, qrId: 30 })?.menuId).toBe(2);
    expect(pickExplorerMenu(menus, { menuId: null, qrId: 30 })?.menuId).toBe(3);
    expect(pickExplorerMenu(menus, { menuId: 99, qrId: null })?.menuId).toBe(1);
    expect(pickExplorerMenu([], { menuId: 1, qrId: null })).toBeNull();
  });
});

describe("category products", () => {
  const category: MainCategoryApiItem = {
    id: 7,
    slug: "tatli",
    name: "Tatlılar",
    sortOrder: 0,
    subs: [
      { id: 71, mainCategoryId: 7, slug: "a", name: "Sütlü", sortOrder: 1 },
      { id: 70, mainCategoryId: 7, slug: "b", name: "Şerbetli", sortOrder: 0 },
    ],
  };
  const products = [product(3, 71), product(1, 70), product(2, 99, { mainCategoryId: 7 }), product(4, 55)];

  it("findsProductsOfMainAndSubCategories", () => {
    expect(productsForMainCategory(products, category).map((item) => item.productId)).toEqual([1, 2, 3]);
    expect(productsForMainCategory(products, { id: 8, subs: [] })).toEqual([]);
    expect(productsForSubCategory(products, 71).map((item) => item.productId)).toEqual([3]);
  });

  it("countsProductsPerSubCategory", () => {
    const counts = productCountBySubCategory(products);
    expect(counts.get(70)).toBe(1);
    expect(counts.get(71)).toBe(1);
    expect(counts.get(12)).toBeUndefined();
  });

  it("sortsCategoriesAndSubs", () => {
    const sorted = sortExplorerCategories([{ ...category, sortOrder: 2 }, { ...category, id: 1, sortOrder: 1, subs: [] }]);
    expect(sorted.map((item) => item.id)).toEqual([1, 7]);
    expect(sorted[1]?.subs.map((sub) => sub.id)).toEqual([70, 71]);
  });
});
