import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";

const MAX_RECOMMENDATIONS = 6;
const MAX_PER_MAIN_CATEGORY = 2;

function ratingScore(product: MenuProductApiItem): number {
  const avg =
    typeof product.ratingAvg === "number" ? product.ratingAvg : Number(product.ratingAvg ?? 0);
  const count =
    typeof product.ratingCount === "number" ? product.ratingCount : Number(product.ratingCount ?? 0);
  if (!Number.isFinite(avg) || !Number.isFinite(count)) return 0;
  return avg * 1000 + count;
}

function scoreItem(item: ChefProductItem, catalogById: Map<number, MenuProductApiItem>): number {
  const catalog = catalogById.get(item.productId);
  if (!catalog) return 0;
  let score = ratingScore(catalog);
  if (catalog.chefRecommended) score += 50_000;
  if (item.available === false) score -= 1_000_000;
  return score;
}

/**
 * Drop cart duplicates, cap per main category, sort by chef pick + rating.
 */
export function rankChefRecommendations(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  cartProductIds: number[] = [],
): ChefProductItem[] {
  if (products.length === 0) return [];

  const cartSet = new Set(cartProductIds);
  const catalogById = new Map(catalog.map((product) => [product.productId, product]));
  const categoryCounts = new Map<number, number>();

  const candidates = products
    .filter((item) => !cartSet.has(item.productId))
    .sort((a, b) => scoreItem(b, catalogById) - scoreItem(a, catalogById));

  const picked: ChefProductItem[] = [];
  for (const item of candidates) {
    if (picked.length >= MAX_RECOMMENDATIONS) break;
    const catalogProduct = catalogById.get(item.productId);
    const mainCategoryId = catalogProduct?.mainCategoryId;
    if (mainCategoryId != null) {
      const count = categoryCounts.get(mainCategoryId) ?? 0;
      if (count >= MAX_PER_MAIN_CATEGORY) continue;
      categoryCounts.set(mainCategoryId, count + 1);
    }
    picked.push(item);
  }

  return picked;
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
