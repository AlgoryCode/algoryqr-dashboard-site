import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import { pickCatalogProductsForRawUserQuery } from "./pick-catalog-for-raw-user-query";

function catalogItem(id: number, name: string, mainCategoryName: string): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryName,
  } as MenuProductApiItem;
}

describe("pickCatalogProductsForRawUserQuery", () => {
  const catalog = [
    catalogItem(1, "Cheese Burger", "Burgerler"),
    catalogItem(2, "Margarita 5 CL", "Kokteyller"),
    catalogItem(3, "Izgara Köfte", "Et Yemekleri"),
  ];

  it("matches product name substring from raw query", () => {
    const result = pickCatalogProductsForRawUserQuery(catalog, "burger", []);
    expect(result.some((item) => item.productId === 1)).toBe(true);
    expect(result.every((item) => item.productId !== 2)).toBe(true);
  });

  it("matches when a query word appears in product name", () => {
    const result = pickCatalogProductsForRawUserQuery(catalog, "köfte", []);
    expect(result.some((item) => item.productId === 3)).toBe(true);
  });
});
