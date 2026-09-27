import type { MenuProductApiItem } from "@/lib/api";

import { mapMenuProductToChefItem } from "./map-menu-product-to-chef-item";
import type { ChefProductItem } from "./chef-product-item";

const MAX_PICK = 6;

function catalogHaystack(product: MenuProductApiItem): string {
  const tagNames =
    product.tags?.map((tag) => tag.name ?? tag.slug ?? "").filter(Boolean) ?? [];
  return [product.name, product.description, product.mainCategoryName, product.subCategoryName, ...tagNames]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

function wordsFromUserQuery(userQuery: string): string[] {
  return userQuery
    .trim()
    .split(/[\s,.;:!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

/**
 * Agent boş döndüğünde yedek: ham userQuery ile katalogda `includes` (tr-TR küçük harf).
 * Stop-word / sinonim / NFD normalize yok.
 */
export function pickCatalogProductsForRawUserQuery(
  catalog: MenuProductApiItem[],
  userQuery: string,
  cartProductIds: number[] = [],
  limit = MAX_PICK,
): MenuProductApiItem[] {
  const query = userQuery.trim();
  if (!query) return [];

  const queryLower = query.toLocaleLowerCase("tr-TR");
  const words = wordsFromUserQuery(query);
  const cartSet = new Set(cartProductIds);

  const ranked = catalog
    .filter((entry) => entry.available !== false && !cartSet.has(entry.productId))
    .map((entry) => {
      const hay = catalogHaystack(entry);
      let score = 0;
      if (hay.includes(queryLower)) score += 250;
      for (const word of words) {
        const wordLower = word.toLocaleLowerCase("tr-TR");
        if (hay.includes(wordLower)) {
          score += 50 + Math.min(wordLower.length, 24);
        }
      }
      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit).map((row) => row.entry);
}

export function pickChefItemsForRawUserQuery(
  catalog: MenuProductApiItem[],
  userQuery: string,
  cartProductIds: number[] = [],
  limit = MAX_PICK,
): ChefProductItem[] {
  return pickCatalogProductsForRawUserQuery(catalog, userQuery, cartProductIds, limit).map(
    mapMenuProductToChefItem,
  );
}
