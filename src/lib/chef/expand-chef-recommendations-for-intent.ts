import type { MenuProductApiItem } from "@/lib/api";

import { classifyMenuProductRole } from "@/lib/chef/build-chef-menu-suggestions";
import type { MenuCourseRole } from "@/lib/chef/chef-cart-coach";
import {
  inferChefCourseRoleFromUserQuery,
  wantsMoreChefOptions,
} from "@/lib/chef/chef-user-query-intent";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import { mapMenuProductToChefItem } from "@/lib/chef/map-menu-product-to-chef-item";

const MAX_RECOMMENDATIONS = 6;

function ratingScore(product: MenuProductApiItem): number {
  const avg =
    typeof product.ratingAvg === "number" ? product.ratingAvg : Number(product.ratingAvg ?? 0);
  const count =
    typeof product.ratingCount === "number" ? product.ratingCount : Number(product.ratingCount ?? 0);
  if (!Number.isFinite(avg) || !Number.isFinite(count)) return 0;
  return avg * 1000 + count;
}

function sortCatalogEntries(entries: MenuProductApiItem[]): MenuProductApiItem[] {
  return [...entries].sort((a, b) => {
    const chefDelta = Number(Boolean(b.chefRecommended)) - Number(Boolean(a.chefRecommended));
    if (chefDelta !== 0) return chefDelta;
    return ratingScore(b) - ratingScore(a);
  });
}

function catalogMatchesCourseRole(
  product: MenuProductApiItem,
  role: MenuCourseRole,
): boolean {
  if (classifyMenuProductRole(product) === role) return true;
  const hay = [product.mainCategoryName, product.subCategoryName]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  if (role === "dessert" && /tatlı|tatli|dessert|sweet/.test(hay)) return true;
  if (role === "drink" && /içecek|icecek|drink|kokteyl|cocktail|meşrubat|mesrubat/.test(hay)) {
    return true;
  }
  if (role === "food" && /yemek|ana\s*yemek|food|grill|izgara|et/.test(hay)) return true;
  return false;
}

/**
 * Agent az ürün döndürdüğünde veya tatlı/içecek/yemek niyetinde katalogdan tamamla (max 6).
 */
export function expandChefRecommendationsForUserQuery(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  userQuery?: string,
  cartProductIds: number[] = [],
  limit = MAX_RECOMMENDATIONS,
): ChefProductItem[] {
  const role = inferChefCourseRoleFromUserQuery(userQuery);
  const wantsMore = wantsMoreChefOptions(userQuery);
  if (!role && !wantsMore) return products;

  const cartSet = new Set(cartProductIds);
  const merged: ChefProductItem[] = [];
  const seen = new Set<number>();

  for (const item of products) {
    if (seen.has(item.productId) || cartSet.has(item.productId)) continue;
    seen.add(item.productId);
    merged.push(item);
  }

  if (role) {
    const pool = sortCatalogEntries(
      catalog.filter(
        (entry) =>
          entry.available !== false &&
          !cartSet.has(entry.productId) &&
          catalogMatchesCourseRole(entry, role),
      ),
    );
    for (const entry of pool) {
      if (merged.length >= limit) break;
      if (seen.has(entry.productId)) continue;
      seen.add(entry.productId);
      merged.push(mapMenuProductToChefItem(entry));
    }
  }

  if (wantsMore && merged.length < limit && products.length > 0) {
    const queryLower = userQuery?.trim().toLocaleLowerCase("tr-TR") ?? "";
    const extras = sortCatalogEntries(
      catalog.filter((entry) => {
        if (entry.available === false || cartSet.has(entry.productId) || seen.has(entry.productId)) {
          return false;
        }
        const hay = [entry.name, entry.mainCategoryName, entry.subCategoryName]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        return queryLower.split(/\s+/).some((word) => word.length >= 3 && hay.includes(word));
      }),
    );
    for (const entry of extras) {
      if (merged.length >= limit) break;
      if (seen.has(entry.productId)) continue;
      seen.add(entry.productId);
      merged.push(mapMenuProductToChefItem(entry));
    }
  }

  return merged.slice(0, limit);
}
