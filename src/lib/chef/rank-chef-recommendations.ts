import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";

const MAX_RECOMMENDATIONS = 6;
const MAX_PER_MAIN_CATEGORY = 2;

export type RankChefRecommendationsOptions = {
  maxPerMainCategory?: number;
};

function ratingScore(product: MenuProductApiItem): number {
  const avg =
    typeof product.ratingAvg === "number" ? product.ratingAvg : Number(product.ratingAvg ?? 0);
  const count =
    typeof product.ratingCount === "number" ? product.ratingCount : Number(product.ratingCount ?? 0);
  if (!Number.isFinite(avg) || !Number.isFinite(count)) return 0;
  return avg * 1000 + count;
}

function scoreItem(
  item: ChefProductItem,
  catalogById: Map<number, MenuProductApiItem>,
  priorOrderSet: Set<number>,
): number {
  const catalog = catalogById.get(item.productId);
  if (!catalog) return 0;
  let score = ratingScore(catalog);
  if (catalog.chefRecommended) score += 50_000;
  if (priorOrderSet.has(item.productId)) score += 12_000;
  if (item.available === false) score -= 1_000_000;
  return score;
}

/**
 * Drop cart duplicates, cap per main category, sort by chef pick + rating.
 */
function pickRanked(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  excludeProductIds: Set<number>,
  priorOrderProductIds: number[] = [],
  maxPerMainCategory = MAX_PER_MAIN_CATEGORY,
): ChefProductItem[] {
  const catalogById = new Map(catalog.map((product) => [product.productId, product]));
  const categoryCounts = new Map<number, number>();
  const priorOrderSet = new Set(priorOrderProductIds);

  const candidates = products
    .filter((item) => !excludeProductIds.has(item.productId))
    .sort(
      (a, b) =>
        scoreItem(b, catalogById, priorOrderSet) - scoreItem(a, catalogById, priorOrderSet),
    );

  const picked: ChefProductItem[] = [];
  for (const item of candidates) {
    if (picked.length >= MAX_RECOMMENDATIONS) break;
    const catalogProduct = catalogById.get(item.productId);
    const mainCategoryId = catalogProduct?.mainCategoryId;
    if (mainCategoryId != null) {
      const count = categoryCounts.get(mainCategoryId) ?? 0;
      if (count >= maxPerMainCategory) continue;
      categoryCounts.set(mainCategoryId, count + 1);
    }
    picked.push(item);
  }

  return picked;
}

export function rankChefRecommendations(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  cartProductIds: number[] = [],
  recentlyShownProductIds: number[] = [],
  priorOrderProductIds: number[] = [],
  options: RankChefRecommendationsOptions = {},
): ChefProductItem[] {
  if (products.length === 0) return [];

  const maxPerMainCategory = options.maxPerMainCategory ?? MAX_PER_MAIN_CATEGORY;
  const cartSet = new Set(cartProductIds);
  const recentSet = new Set(recentlyShownProductIds);
  const excludeWithRecent = new Set([...cartSet, ...recentSet]);

  const withRecentDedup = pickRanked(
    products,
    catalog,
    excludeWithRecent,
    priorOrderProductIds,
    maxPerMainCategory,
  );
  if (withRecentDedup.length > 0 || recentSet.size === 0) {
    return withRecentDedup;
  }

  return pickRanked(products, catalog, cartSet, priorOrderProductIds, maxPerMainCategory);
}

export function filterChefProductIds(
  productIds: number[],
  cartProductIds: number[] = [],
): number[] {
  const cartSet = new Set(cartProductIds);
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of productIds) {
    if (cartSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_RECOMMENDATIONS) break;
  }
  return out;
}
