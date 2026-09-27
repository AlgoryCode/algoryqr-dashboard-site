import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import { pickCrossSellProducts } from "./pick-cross-sell-products";

function product(id: number, name: string, mainCategoryId = 1): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryId,
    available: true,
  } as MenuProductApiItem;
}

describe("pickCrossSellProducts", () => {
  it("suggests drink when anchor is food and cart empty", () => {
    const catalog = [
      product(1, "Izgara Levrek", 10),
      product(2, "Küçük Su", 20),
      product(3, "Tatlı", 30),
    ];
    const suggestions = pickCrossSellProducts({
      anchorProductId: 1,
      catalog,
      cartProductIds: [],
      maxItems: 2,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((item) => item.productId !== 1)).toBe(true);
  });
});
