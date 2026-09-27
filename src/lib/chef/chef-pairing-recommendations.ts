import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import { pickCrossSellProducts } from "@/lib/chef/pick-cross-sell-products";

/** Ürün adı userQuery içinde geçiyorsa anchor (en uzun eşleşme). */
export function findAnchorProductInUserQuery(
  catalog: MenuProductApiItem[],
  userQuery: string,
): MenuProductApiItem | null {
  const q = userQuery.trim().toLocaleLowerCase("tr-TR");
  if (!q) return null;

  let best: { entry: MenuProductApiItem; score: number } | null = null;
  for (const entry of catalog) {
    if (entry.available === false) continue;
    const name = entry.name.trim();
    if (name.length < 3) continue;
    const nameLower = name.toLocaleLowerCase("tr-TR");
    if (!q.includes(nameLower)) continue;
    const score = name.length;
    if (!best || score > best.score) best = { entry, score };
  }
  return best?.entry ?? null;
}

export function resolveChefPairingRecommendations(
  agentProducts: ChefProductItem[],
  catalog: MenuProductApiItem[],
  userQuery: string,
  cartProductIds: number[],
): { products: ChefProductItem[]; anchorName?: string } {
  const anchor = findAnchorProductInUserQuery(catalog, userQuery);
  const exclude = new Set(cartProductIds);
  if (anchor) exclude.add(anchor.productId);

  const fromAgent = agentProducts.filter(
    (item) => !exclude.has(item.productId) && item.available !== false,
  );

  if (!anchor) {
    return { products: fromAgent };
  }

  const crossSell = pickCrossSellProducts({
    anchorProductId: anchor.productId,
    catalog,
    cartProductIds,
    maxItems: 4,
  });

  const merged: ChefProductItem[] = [];
  const seen = new Set<number>();
  for (const item of [...fromAgent, ...crossSell]) {
    if (seen.has(item.productId) || exclude.has(item.productId)) continue;
    seen.add(item.productId);
    merged.push(item);
    if (merged.length >= 6) break;
  }

  return { products: merged, anchorName: anchor.name };
}

export function pairingFallbackReply(anchorName: string): string {
  return `${anchorName} ile güzel gidecek birkaç seçenek hazırladım.`;
}

/** Agent önceki misafir cümlesini tekrarladığında gösterilmez. */
export function sanitizeChefAgentReply(reply: string | undefined, userQuery?: string): string {
  const trimmed = reply?.trim() ?? "";
  const query = userQuery?.trim() ?? "";
  if (!trimmed) return "";
  if (!query) return trimmed;
  if (trimmed.toLocaleLowerCase("tr-TR") === query.toLocaleLowerCase("tr-TR")) return "";
  return trimmed;
}
