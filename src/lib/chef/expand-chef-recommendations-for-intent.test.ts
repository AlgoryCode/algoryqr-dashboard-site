import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";
import { expandChefRecommendationsForUserQuery } from "./expand-chef-recommendations-for-intent";

function dessert(id: number, name: string): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryName: "Tatlılar",
  } as MenuProductApiItem;
}

describe("expandChefRecommendationsForUserQuery", () => {
  const catalog = [
    dessert(1, "Kavrulmuş Susamlı Katmer"),
    dessert(2, "Karışık Meyve"),
    dessert(3, "Dondurma"),
    dessert(4, "Sufle"),
    dessert(5, "Ayva Tatlısı"),
  ];

  const agentPicks: ChefProductItem[] = [
    { productId: 1, menuId: 1, name: "Kavrulmuş Susamlı Katmer", price: 790, currency: "TRY" },
    { productId: 2, menuId: 1, name: "Karışık Meyve", price: 550, currency: "TRY" },
  ];

  it("fills all desserts when user asks about tatlılar", () => {
    const result = expandChefRecommendationsForUserQuery(
      agentPicks,
      catalog,
      "başka tatlı yok mu",
      [],
    );
    expect(result.length).toBe(5);
    expect(result.map((item) => item.productId).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("fills desserts for Dessert query", () => {
    const result = expandChefRecommendationsForUserQuery(agentPicks, catalog, "Dessert", []);
    expect(result.length).toBe(5);
  });

  it("does not treat pairing query as full dessert browse", () => {
    const result = expandChefRecommendationsForUserQuery(
      agentPicks,
      catalog,
      "Ayva Tatlısı yanında ne önerirsin",
      [],
    );
    expect(result.length).toBe(2);
  });
});
