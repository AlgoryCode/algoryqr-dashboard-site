import type { MenuProductApiItem } from "@/lib/api";

import {
  cartCourseRoles,
  missingCourseRoles,
  type MenuCourseRole,
} from "@/lib/chef/chef-cart-coach";
import { classifyMenuProductRole } from "@/lib/chef/build-chef-menu-suggestions";
import { mapMenuProductToChefItem } from "@/lib/chef/map-menu-product-to-chef-item";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";

const MAX_CROSS_SELL = 2;

function ratingScore(product: MenuProductApiItem): number {
  const avg =
    typeof product.ratingAvg === "number" ? product.ratingAvg : Number(product.ratingAvg ?? 0);
  const count =
    typeof product.ratingCount === "number" ? product.ratingCount : Number(product.ratingCount ?? 0);
  if (!Number.isFinite(avg) || !Number.isFinite(count)) return 0;
  return avg * 1000 + count;
}

function expandPairingCandidates(
  anchor: MenuProductApiItem,
  catalog: MenuProductApiItem[],
): MenuProductApiItem[] {
  const pairings = anchor.pairings;
  if (!pairings) return [];

  const byId = new Map(catalog.map((product) => [product.productId, product]));
  const out: MenuProductApiItem[] = [];
  const seen = new Set<number>();

  for (const rawId of pairings.productIds ?? []) {
    const product = byId.get(rawId);
    if (!product || product.available === false || seen.has(product.productId)) continue;
    seen.add(product.productId);
    out.push(product);
  }

  for (const product of catalog) {
    if (product.available === false || seen.has(product.productId)) continue;
    if (product.productId === anchor.productId) continue;
    const mainId = product.mainCategoryId;
    const subId = product.subCategoryId;
    const inMain = mainId != null && (pairings.mainCategoryIds ?? []).includes(mainId);
    const inSub = subId != null && (pairings.subCategoryIds ?? []).includes(subId);
    if (!inMain && !inSub) continue;
    seen.add(product.productId);
    out.push(product);
  }

  return out;
}

function pickForRole(
  candidates: MenuProductApiItem[],
  role: MenuCourseRole,
  excludeIds: Set<number>,
): MenuProductApiItem | null {
  const filtered = candidates
    .filter((product) => !excludeIds.has(product.productId) && classifyMenuProductRole(product) === role)
    .sort((a, b) => {
      const chefDelta = Number(Boolean(b.chefRecommended)) - Number(Boolean(a.chefRecommended));
      if (chefDelta !== 0) return chefDelta;
      return ratingScore(b) - ratingScore(a);
    });
  return filtered[0] ?? null;
}

function rolePriority(missing: MenuCourseRole[]): MenuCourseRole[] {
  const order: MenuCourseRole[] = [];
  for (const role of missing) {
    order.push(role);
  }
  if (order.length === 0) {
    return ["drink", "dessert", "food"];
  }
  return order;
}

export function pickCrossSellProducts(options: {
  anchorProductId: number;
  catalog: MenuProductApiItem[];
  cartProductIds: number[];
  maxItems?: number;
}): ChefProductItem[] {
  const { anchorProductId, catalog, cartProductIds, maxItems = MAX_CROSS_SELL } = options;
  const byId = new Map(catalog.map((product) => [product.productId, product]));
  const anchor = byId.get(anchorProductId);
  if (!anchor) return [];

  const exclude = new Set<number>([...cartProductIds, anchorProductId]);
  const present = cartCourseRoles(cartProductIds, catalog);
  const anchorRole = classifyMenuProductRole(anchor);
  if (anchorRole) present.add(anchorRole);
  const missing = missingCourseRoles(present);

  const pairingPool = expandPairingCandidates(anchor, catalog);
  const pool = catalog.filter((product) => product.available !== false);
  const priorities = rolePriority(missing);

  const picked: ChefProductItem[] = [];
  for (const role of priorities) {
    if (picked.length >= maxItems) break;
    const product =
      pickForRole(pairingPool, role, exclude) ?? pickForRole(pool, role, exclude);
    if (!product) continue;
    exclude.add(product.productId);
    picked.push(mapMenuProductToChefItem(product));
  }

  return picked;
}
