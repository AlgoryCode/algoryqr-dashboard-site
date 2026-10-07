import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import {
  findAnchorProductInUserQuery,
  resolveChefPairingRecommendations,
  sanitizeChefAgentReply,
} from "./chef-pairing-recommendations";
import type { ChefProductItem } from "./chef-product-item";

function item(id: number, name: string, role?: "drink" | "dessert"): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryName: role === "drink" ? "Kokteyller" : "Tatlılar",
  } as MenuProductApiItem;
}

describe("chef pairing", () => {
  const catalog = [
    item(1, "Ayva Tatlısı", "dessert"),
    item(2, "Karışık Meyve", "dessert"),
    item(3, "Aperol Spritz", "drink"),
    item(4, "Espresso Martini", "drink"),
  ];

  it("finds anchor by product name in query", () => {
    const anchor = findAnchorProductInUserQuery(catalog, "Ayva Tatlısı yanında ne önerirsin");
    expect(anchor?.productId).toBe(1);
  });

  it("does not include anchor in pairing picks", () => {
    const agent: ChefProductItem[] = [
      { productId: 1, menuId: 1, name: "Ayva Tatlısı", price: 100, currency: "TRY", description: null, subCategoryId: null, imageUrl: null, available: true },
    ];
    const { products } = resolveChefPairingRecommendations(
      agent,
      catalog,
      "Ayva Tatlısı yanında ne önerirsin",
      [],
    );
    expect(products.every((p) => p.productId !== 1)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  it("drops agent reply that only repeats the user query", () => {
    expect(sanitizeChefAgentReply("Tatlı var mı?", "Ayva Tatlısı yanında ne önerirsin")).toBe(
      "Tatlı var mı?",
    );
    expect(sanitizeChefAgentReply("Tatlı var mı?", "Tatlı var mı?")).toBe("");
  });
});
