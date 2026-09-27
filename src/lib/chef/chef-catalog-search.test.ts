import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import { searchChefCatalogByUserQuery } from "./chef-catalog-search";

function item(id: number, name: string, mainCategoryName: string): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryName,
  } as MenuProductApiItem;
}

describe("searchChefCatalogByUserQuery (this menu’s text only)", () => {
  const catalog = [
    item(1, "House plate", "After dinner"),
    item(2, "Baklava", "After dinner"),
    item(3, "Sütlaç", "Tatlılar"),
    item(4, "Tiramisu", "Tatlılar"),
    item(5, "Mojito", "Bar"),
  ];

  it("matches a category title that exists on this menu", () => {
    const result = searchChefCatalogByUserQuery(catalog, "Tatlılar", []);
    expect(result.kind).toBe("category");
    expect(result.products.map((p) => p.productId).sort()).toEqual([3, 4]);
  });

  it("does not use a global dessert lexicon when the menu category is After dinner", () => {
    const onlyAfterDinner = [item(1, "House plate", "After dinner"), item(5, "Mojito", "Bar")];
    const result = searchChefCatalogByUserQuery(onlyAfterDinner, "Tatlı öner", []);
    expect(result.kind).toBe("none");
  });

  it("matches a product name that exists on this menu", () => {
    const result = searchChefCatalogByUserQuery(catalog, "Baklava", []);
    expect(result.kind).toBe("product");
    expect(result.products.some((p) => p.productId === 2)).toBe(true);
  });
});
