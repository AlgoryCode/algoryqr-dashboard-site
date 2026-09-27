import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import { buildChefMenuSuggestions, classifyMenuProductRole } from "./build-chef-menu-suggestions";
import { mapMenuProductToChefItem } from "./map-menu-product-to-chef-item";

function product(partial: Partial<MenuProductApiItem> & Pick<MenuProductApiItem, "productId" | "name">): MenuProductApiItem {
  return {
    menuId: 1,
    currency: "TRY",
    subCategoryId: 1,
    sortOrder: 0,
    available: true,
    price: 100,
    ...partial,
  };
}

describe("classifyMenuProductRole", () => {
  it("detects drinks and desserts from category names", () => {
    expect(classifyMenuProductRole(product({ productId: 1, name: "Kola", mainCategoryName: "İçecekler" }))).toBe(
      "drink",
    );
    expect(classifyMenuProductRole(product({ productId: 2, name: "Sütlaç", subCategoryName: "Tatlılar" }))).toBe(
      "dessert",
    );
    expect(classifyMenuProductRole(product({ productId: 3, name: "Izgara Köfte" }))).toBe("food");
  });
});

describe("buildChefMenuSuggestions", () => {
  it("builds a three-course menu with total price", () => {
    const catalog: MenuProductApiItem[] = [
      product({ productId: 10, name: "Adana", mainCategoryName: "Ana Yemek", price: 250 }),
      product({ productId: 20, name: "Ayran", mainCategoryName: "İçecekler", price: 40 }),
      product({ productId: 30, name: "Künefe", mainCategoryName: "Tatlılar", price: 120 }),
    ];
    const search = [mapMenuProductToChefItem(catalog[0])];
    const menus = buildChefMenuSuggestions(search, catalog, { maxSuggestions: 1 });

    expect(menus).toHaveLength(1);
    expect(menus[0].lines.map((line) => line.role)).toEqual(["food", "drink", "dessert"]);
    expect(menus[0].totalPrice).toBe(410);
  });

  it("prefers pairing product ids for drink and dessert", () => {
    const catalog: MenuProductApiItem[] = [
      product({
        productId: 1,
        name: "Bonfile",
        price: 500,
        pairings: { productIds: [2, 3] },
      }),
      product({ productId: 2, name: "Şarap", mainCategoryName: "İçecekler", price: 200 }),
      product({ productId: 3, name: "Cheesecake", mainCategoryName: "Tatlılar", price: 150 }),
      product({ productId: 4, name: "Kola", mainCategoryName: "İçecekler", price: 50 }),
    ];
    const menus = buildChefMenuSuggestions([mapMenuProductToChefItem(catalog[0])], catalog);
    expect(menus[0].lines.find((line) => line.role === "drink")?.product.productId).toBe(2);
    expect(menus[0].lines.find((line) => line.role === "dessert")?.product.productId).toBe(3);
  });
});
