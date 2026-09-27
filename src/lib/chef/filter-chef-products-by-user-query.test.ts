import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";
import { applyUserQueryToChefRecommendations } from "./filter-chef-products-by-user-query";

function catalogItem(
  id: number,
  name: string,
  mainCategoryId: number,
  mainCategoryName: string,
): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryId,
    mainCategoryName,
  } as MenuProductApiItem;
}

function chefItem(id: number, name: string, mainCategoryName: string): ChefProductItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 100,
    currency: "TRY",
    mainCategoryName,
  };
}

describe("applyUserQueryToChefRecommendations", () => {
  const catalog = [
    catalogItem(1, "Cheese Burger", 10, "Burgerler"),
    catalogItem(2, "Smash Hamburger", 10, "Burgerler"),
    catalogItem(3, "Margarita 5 CL", 20, "Kokteyller"),
    catalogItem(4, "Acılı Ezme", 30, "Soğuk Mezeler"),
  ];

  it("replaces irrelevant agent picks when user asks for hamburger", () => {
    const agentPicks = [
      chefItem(3, "Margarita 5 CL", "Kokteyller"),
      chefItem(4, "Acılı Ezme", "Soğuk Mezeler"),
    ];

    const result = applyUserQueryToChefRecommendations(
      agentPicks,
      catalog,
      "Ben hamburger istiyorum",
      [],
      "Ben hamburger istiyorum",
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.mainCategoryName === "Burgerler")).toBe(true);
    expect(result.some((item) => /burger|hamburger/i.test(item.name))).toBe(true);
  });

  it("keeps agent picks when they already match the query", () => {
    const agentPicks = [chefItem(1, "Cheese Burger", "Burgerler")];
    const result = applyUserQueryToChefRecommendations(
      agentPicks,
      catalog,
      "burger",
      [],
      "burger",
    );
    expect(result[0].productId).toBe(1);
  });

  it("returns empty when kola is requested but menu has no match", () => {
    const agentPicks = [chefItem(3, "Margarita 5 CL", "Kokteyller")];
    const result = applyUserQueryToChefRecommendations(
      agentPicks,
      catalog,
      "Kola öner",
      [],
      "Kola öner",
    );
    expect(result).toHaveLength(0);
  });

  it("finds cola by synonym when product name uses Coca-Cola", () => {
    const colaCatalog = [
      ...catalog,
      catalogItem(5, "Coca-Cola 330ml", 40, "Meşrubatlar"),
    ];
    const agentPicks = [chefItem(3, "Margarita 5 CL", "Kokteyller")];
    const result = applyUserQueryToChefRecommendations(
      agentPicks,
      colaCatalog,
      "kola",
      [],
      "kola",
    );
    expect(result.some((item) => item.productId === 5)).toBe(true);
  });

  it("filters cocktails for serin içecek badge intent", () => {
    const drinkCatalog = [
      catalogItem(10, "Coca-Cola", 40, "Meşrubatlar"),
      catalogItem(11, "Margarita 5 CL", 20, "Kokteyller"),
      catalogItem(12, "Fanta", 40, "Meşrubatlar"),
    ];
    const agentPicks = [
      chefItem(11, "Margarita 5 CL", "Kokteyller"),
      chefItem(10, "Coca-Cola", "Meşrubatlar"),
    ];
    const result = applyUserQueryToChefRecommendations(
      agentPicks,
      drinkCatalog,
      "Serin içecek öner",
      [],
      "Serin içecek öner",
    );
    expect(result.every((item) => !/margarita/i.test(item.name))).toBe(true);
    expect(result.some((item) => item.productId === 10)).toBe(true);
  });
});
