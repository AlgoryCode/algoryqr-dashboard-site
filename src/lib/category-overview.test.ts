import { describe, expect, it } from "vitest";

import type { ActiveMenuSummaryApiItem, MainCategoryApiItem } from "@/lib/api";
import {
  categoryMenuOptions,
  EMPTY_CATEGORY_FILTERS,
  groupCategoriesByMenu,
  isCategoryListNarrowed,
  matchesCategoryQuery,
  parseCategoryFilters,
  serializeCategoryFilters,
  showsAllCategories,
  visibleCategories,
} from "@/lib/category-overview";

const menus: ActiveMenuSummaryApiItem[] = [
  { menuId: 16, qrId: 2, branchId: 24, businessName: "AYA Roof Lounge", active: true },
  { menuId: 8, qrId: 1, branchId: 5, businessName: " ", active: false },
];

function category(id: number, name: string, subs: string[] = []): MainCategoryApiItem {
  return {
    id,
    slug: name,
    name,
    sortOrder: id,
    subs: subs.map((sub, index) => ({ id: id * 100 + index, mainCategoryId: id, slug: sub, name: sub, sortOrder: index })),
  };
}

const byMenu = new Map<number, MainCategoryApiItem[] | null>([
  [16, [category(1, "Soğuk Mezeler", ["Humus"]), category(2, "Tatlılar", ["Sütlü", "Şerbetli"])]],
  [8, [category(3, "Içecekler", ["Çay"])]],
]);
const branches = new Map([[24, "AYA Sultanahmet"]]);

describe("search", () => {
  it("matches a category or one of its sub categories, ignoring Turkish letters", () => {
    expect(matchesCategoryQuery(category(1, "Soğuk Mezeler"), "soguk")).toBe(true);
    expect(matchesCategoryQuery(category(2, "Tatlılar", ["Şerbetli"]), "serbet")).toBe(true);
    expect(matchesCategoryQuery(category(2, "Tatlılar", ["Şerbetli"]), "kahve")).toBe(false);
    expect(matchesCategoryQuery(category(2, "Tatlılar"), "")).toBe(true);
  });
});

describe("groupCategoriesByMenu", () => {
  it("makes one group per menu with its names and counts", () => {
    const groups = groupCategoriesByMenu(menus, byMenu, branches, EMPTY_CATEGORY_FILTERS);
    expect(groups.map((group) => group.name)).toEqual(["AYA Roof Lounge", "Menü #8"]);
    expect(groups[0]).toMatchObject({ branchName: "AYA Sultanahmet", total: 2, active: true, qrId: 2 });
    expect(groups[1]).toMatchObject({ branchName: null, active: false, total: 1 });
  });

  it("limits to one menu", () => {
    const groups = groupCategoriesByMenu(menus, byMenu, branches, { query: "", menus: ["8"] });
    expect(groups.map((group) => group.menuId)).toEqual([8]);
  });

  it("keeps only the matching categories and drops menus without a match", () => {
    const groups = groupCategoriesByMenu(menus, byMenu, branches, { query: "çay", menus: [] });
    expect(groups.map((group) => group.menuId)).toEqual([8]);
    expect(groups[0].categories.map((item) => item.name)).toEqual(["Içecekler"]);
    expect(groups[0].total).toBe(1);
  });

  it("keeps a menu whose categories failed to load", () => {
    const failed = new Map(byMenu).set(8, null);
    const groups = groupCategoriesByMenu(menus, failed, branches, { query: "tatlı", menus: [] });
    expect(groups.map((group) => [group.menuId, group.failed])).toEqual([
      [16, false],
      [8, true],
    ]);
  });
});

describe("options and address", () => {
  it("counts categories in the menu select", () => {
    expect(categoryMenuOptions(menus, byMenu).map((option) => option.label)).toEqual([
      "AYA Roof Lounge",
      "Menü #8",
    ]);
    expect(categoryMenuOptions(menus, byMenu).map((option) => option.count)).toEqual([2, 1]);
  });

  it("round-trips the filters", () => {
    expect(serializeCategoryFilters(EMPTY_CATEGORY_FILTERS).toString()).toBe("");
    const filters = { query: "çay", menus: ["8", "16"] };
    expect(parseCategoryFilters(serializeCategoryFilters(filters))).toEqual(filters);
    expect(isCategoryListNarrowed(EMPTY_CATEGORY_FILTERS)).toBe(false);
    expect(isCategoryListNarrowed(filters)).toBe(true);
  });
});

describe("preview", () => {
  const rows = Array.from({ length: 12 }, (_, index) => index);

  it("cuts a long group to the preview", () => {
    expect(visibleCategories(rows, false)).toHaveLength(6);
    expect(visibleCategories(rows, true)).toHaveLength(12);
  });

  it("never hides a single row behind the button", () => {
    expect(visibleCategories([1, 2, 3, 4, 5, 6, 7], false)).toHaveLength(7);
    expect(visibleCategories([1, 2, 3, 4, 5, 6, 7, 8], false)).toHaveLength(6);
  });

  it("shows everything when searching, focused on one menu or expanded", () => {
    expect(showsAllCategories(EMPTY_CATEGORY_FILTERS, false)).toBe(false);
    expect(showsAllCategories({ query: "çay", menus: [] }, false)).toBe(true);
    expect(showsAllCategories({ query: "", menus: ["8"] }, false)).toBe(true);
    expect(showsAllCategories(EMPTY_CATEGORY_FILTERS, true)).toBe(true);
  });
});
