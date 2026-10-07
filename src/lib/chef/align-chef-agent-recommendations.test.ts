import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import { alignChefRecommendationsWithUserQuery } from "./align-chef-agent-recommendations";
import type { ChefProductItem } from "./chef-product-item";

describe("alignChefRecommendationsWithUserQuery", () => {
  const catalog = [
    {
      productId: 10,
      menuId: 1,
      name: "Tavuk Pirzola",
      price: 100,
      currency: "TRY",
      mainCategoryName: "Et",
    },
  ] as MenuProductApiItem[];

  it("keeps agent picks when present", () => {
    const agent: ChefProductItem[] = [
      { productId: 10, menuId: 1, name: "Tavuk Pirzola", price: 100, currency: "TRY", description: null, subCategoryId: null, imageUrl: null, available: true },
    ];
    const result = alignChefRecommendationsWithUserQuery({
      agentProducts: agent,
      catalog,
      userQuery: "tavuk",
      cartProductIds: [],
    });
    expect(result[0].productId).toBe(10);
  });

  it("falls back to raw userQuery when agent is empty", () => {
    const result = alignChefRecommendationsWithUserQuery({
      agentProducts: [],
      catalog,
      userQuery: "Tavuk Pirzola",
      cartProductIds: [],
    });
    expect(result[0]?.productId).toBe(10);
  });
});
