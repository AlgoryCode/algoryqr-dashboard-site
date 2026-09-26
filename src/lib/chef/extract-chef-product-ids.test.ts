import { describe, expect, it } from "vitest";

import { extractChefProductIds } from "./extract-chef-product-ids";

describe("extractChefProductIds", () => {
  it("prefers explicit productIds over product payloads", () => {
    const ids = extractChefProductIds({
      productIds: [42, 7],
      products: [{ productId: 99, name: "Wrong" }],
    });
    expect(ids).toEqual([42, 7]);
  });

  it("reads productId from products when productIds missing", () => {
    const ids = extractChefProductIds({
      products: [{ productId: 3, name: "A" }, { productId: 3, name: "Dup" }, { productId: 5 }],
    });
    expect(ids).toEqual([3, 5]);
  });

  it("falls back to searchComplete.response.resolvedIds", () => {
    const ids = extractChefProductIds({
      searchComplete: {
        input: { message: "x", query: "x", filters: {}, limit: 3 },
        response: {
          searchPhase: "done",
          searchSource: "mcp",
          appliedFilters: {},
          resolvedIds: { tatli: 12, icecek: 34 },
          totalMatches: 2,
          productCount: 2,
          notFound: null,
          durationMs: 10,
        },
      },
    });
    expect(ids).toEqual([12, 34]);
  });
});
