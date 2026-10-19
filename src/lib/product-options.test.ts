import { describe, expect, it } from "vitest";

import { productChoicesFromCatalog } from "./product-options";

describe("product choices from catalog", () => {
  it("turns selected products into options and skips names already in the group", () => {
    const drafts = productChoicesFromCatalog(
      ["kola"],
      [
        { productId: 1, name: "Kola", price: 12.5 },
        { productId: 2, name: "Ayran", price: 12.5 },
        { productId: 3, name: "Sufle", price: "40" },
      ],
      [1, 2, 3],
    );
    expect(drafts).toEqual([
      { name: "Ayran", priceDelta: "12,5" },
      { name: "Sufle", priceDelta: "40" },
    ]);
  });
});
