import type { MenuProductApiItem } from "@/lib/api";

import { pickChefItemsForRawUserQuery } from "./pick-catalog-for-raw-user-query";
import type { ChefProductItem } from "./chef-product-item";

/**
 * Önce agent’ın seçtiği ürünleri koru; boşsa ham userQuery ile katalogdan yedek seç.
 */
export function alignChefRecommendationsWithUserQuery(input: {
  agentProducts: ChefProductItem[];
  catalog: MenuProductApiItem[];
  userQuery?: string;
  cartProductIds: number[];
}): ChefProductItem[] {
  const inCart = new Set(input.cartProductIds);
  const catalogIds = new Set(input.catalog.map((entry) => entry.productId));

  const fromAgent = input.agentProducts.filter(
    (item) => catalogIds.has(item.productId) && !inCart.has(item.productId) && item.available !== false,
  );
  if (fromAgent.length > 0) return fromAgent;

  const userQuery = input.userQuery?.trim();
  if (!userQuery) return [];

  return pickChefItemsForRawUserQuery(input.catalog, userQuery, input.cartProductIds);
}
