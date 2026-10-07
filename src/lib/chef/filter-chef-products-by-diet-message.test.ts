import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";
import { filterChefProductsByDietMessage } from "./filter-chef-products-by-diet-message";

function chefItem(id: number): ChefProductItem {
  return {
    productId: id,
    menuId: 1,
    name: `P${id}`,
    price: 10,
    currency: "TRY",
    description: null,
    subCategoryId: null,
    imageUrl: null,
    available: true,
  };
}

function catalogItem(
  id: number,
  name: string,
  allergens: { slug: string; name: string }[] = [],
): MenuProductApiItem {
  return {
    productId: id,
    menuId: 1,
    name,
    price: 10,
    currency: "TRY",
    allergens: allergens.map((a, index) => ({
      id: index + 1,
      slug: a.slug,
      name: a.name,
      sortOrder: index,
    })),
  } as MenuProductApiItem;
}

describe("filterChefProductsByDietMessage", () => {
  it("filters milk allergens when user asks for vegan", () => {
    const products = [chefItem(1), chefItem(2)];
    const catalog = [
      catalogItem(1, "Vegan salata"),
      catalogItem(2, "Sütlaç", [{ slug: "milk", name: "Süt" }]),
    ];
    const filtered = filterChefProductsByDietMessage(products, catalog, "vegan bir şey öner");
    expect(filtered.map((p) => p.productId)).toEqual([1]);
  });
});
