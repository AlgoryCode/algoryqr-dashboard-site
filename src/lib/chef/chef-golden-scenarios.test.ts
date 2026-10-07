import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { filterChefProductsByDietMessage } from "./filter-chef-products-by-diet-message";
import { inferChefPriceBandFromMessage, filterChefProductsByPriceBand } from "./infer-chef-price-band";
import type { ChefProductItem } from "./chef-product-item";
import type { MenuProductApiItem } from "@/lib/api";

type GoldenScenario = {
  name: string;
  message: string;
  cartProductIds?: number[];
  expect?: {
    maxProductIds?: number;
    replyMaxChars?: number;
    replyMentionsDiet?: boolean;
  };
};

function loadScenarios(): GoldenScenario[] {
  const path = join(process.cwd(), "docs/chef-agent-golden-scenarios.json");
  return JSON.parse(readFileSync(path, "utf8")) as GoldenScenario[];
}

function chefItem(id: number, price = 100): ChefProductItem {
  return { productId: id, menuId: 1, name: `P${id}`, price, currency: "TRY", description: null, subCategoryId: null, imageUrl: null, available: true };
}

describe("chef golden scenarios (BFF offline checks)", () => {
  const scenarios = loadScenarios();

  it("loads golden scenario file", () => {
    expect(scenarios.length).toBeGreaterThan(0);
  });

  for (const scenario of scenarios) {
    it(`diet/price guards: ${scenario.name}`, () => {
      if (scenario.expect?.replyMaxChars) {
        expect(scenario.expect.replyMaxChars).toBeLessThanOrEqual(500);
      }

      if (scenario.name.includes("vegan")) {
        const catalog = [
          {
            productId: 1,
            menuId: 1,
            name: "Salata",
            price: 80,
            currency: "TRY",
            allergens: [],
          },
          {
            productId: 2,
            menuId: 1,
            name: "Sütlaç",
            price: 60,
            currency: "TRY",
            allergens: [{ id: 1, slug: "milk", name: "Süt", sortOrder: 0 }],
          },
        ] as MenuProductApiItem[];
        const filtered = filterChefProductsByDietMessage(
          [chefItem(1), chefItem(2)],
          catalog,
          scenario.message,
        );
        expect(filtered.some((p) => p.productId === 2)).toBe(false);
      }

      const band = inferChefPriceBandFromMessage(scenario.message);
      if (band) {
        const filtered = filterChefProductsByPriceBand([chefItem(1, 500), chefItem(2, 100)], band);
        expect(filtered.length).toBeGreaterThan(0);
      }
    });
  }
});
