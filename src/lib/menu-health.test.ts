import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";
import { summarizeMenuProducts } from "@/lib/menu-health";

function product(overrides: Partial<MenuProductApiItem>): MenuProductApiItem {
  return {
    productId: 1,
    name: "Köfte",
    currency: "TRY",
    subCategoryId: 1,
    sortOrder: 0,
    available: true,
    price: 100,
    imageUrl: "https://example.com/a.jpg",
    description: "Izgara köfte",
    ...overrides,
  };
}

describe("summarizeMenuProducts", () => {
  it("countsOffSaleAndMissingDetails", () => {
    const health = summarizeMenuProducts([
      product({}),
      product({ available: false, imageUrl: "  " }),
      product({ price: "0", description: "" }),
      product({ price: undefined, imageUrl: undefined }),
    ]);
    expect(health).toEqual({
      total: 4,
      available: 3,
      unavailable: 1,
      missingImage: 2,
      missingPrice: 2,
      missingDescription: 1,
    });
  });

  it("returnsZerosForEmptyMenu", () => {
    expect(summarizeMenuProducts([]).total).toBe(0);
  });
});
