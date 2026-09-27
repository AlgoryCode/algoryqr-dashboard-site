import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";
import { rankChefRecommendations } from "./rank-chef-recommendations";

function item(id: number, mainCategoryId = 1): ChefProductItem {
  return {
    productId: id,
    menuId: 1,
    name: `Product ${id}`,
    price: 100,
    currency: "TRY",
    mainCategoryId,
  };
}

function catalogEntry(id: number, mainCategoryId = 1, chefRecommended = false): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name: `Product ${id}`,
    price: 100,
    currency: "TRY",
    mainCategoryId,
    chefRecommended,
    available: true,
  } as MenuProductApiItem;
}

describe("rankChefRecommendations", () => {
  it("removes items already in cart", () => {
    const products = [item(1), item(2)];
    const catalog = [catalogEntry(1), catalogEntry(2)];
    expect(rankChefRecommendations(products, catalog, [1])).toHaveLength(1);
    expect(rankChefRecommendations(products, catalog, [1])[0].productId).toBe(2);
  });

  it("deprioritizes recently shown products when alternatives exist", () => {
    const products = [item(1), item(2), item(3)];
    const catalog = [catalogEntry(1), catalogEntry(2), catalogEntry(3)];
    const ranked = rankChefRecommendations(products, catalog, [], [1]);
    expect(ranked.some((p) => p.productId === 1)).toBe(false);
    expect(ranked.length).toBeGreaterThan(0);
  });

  it("limits duplicate main categories", () => {
    const products = [item(1, 10), item(2, 10), item(3, 20)];
    const catalog = [catalogEntry(1, 10), catalogEntry(2, 10), catalogEntry(3, 20)];
    const ranked = rankChefRecommendations(products, catalog);
    const fromCat10 = ranked.filter((p) => p.productId === 1 || p.productId === 2);
    expect(fromCat10.length).toBeLessThanOrEqual(2);
    expect(ranked.some((p) => p.productId === 3)).toBe(true);
  });
});
