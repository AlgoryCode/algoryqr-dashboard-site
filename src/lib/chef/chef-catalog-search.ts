import type { MenuProductApiItem } from "@/lib/api";

import { isPairingUserQuery } from "@/lib/chef/chef-user-query-intent";
import { chefTextTokens, foldChefText } from "@/lib/chef/fold-chef-text";
import { mapMenuProductToChefItem } from "@/lib/chef/map-menu-product-to-chef-item";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";

const MAX_RECOMMENDATIONS = 6;

const QUERY_NOISE = new Set([
  "tumu",
  "tum",
  "hepsi",
  "hepsini",
  "listele",
  "goster",
  "ver",
  "oner",
  "oneri",
  "lutfen",
  "bana",
  "bir",
  "tane",
  "var",
  "yok",
  "mi",
  "mu",
  "ne",
  "icin",
  "olsun",
  "getir",
  "urun",
  "menu",
  "please",
  "show",
  "all",
  "give",
  "want",
]);

export type ChefCatalogMatchKind = "category" | "product" | "none";

export type ChefCatalogSearchResult = {
  kind: ChefCatalogMatchKind;
  products: ChefProductItem[];
  matchedLabel?: string;
};

function catalogText(product: MenuProductApiItem): string {
  const tags = product.tags?.map((tag) => tag.name ?? tag.slug ?? "").filter(Boolean) ?? [];
  return [product.name, product.description, product.mainCategoryName, product.subCategoryName, ...tags]
    .filter(Boolean)
    .join(" ");
}

function meaningfulTokens(query: string): string[] {
  return chefTextTokens(query).filter((token) => !QUERY_NOISE.has(token) && token.length >= 3);
}

function wantsFullList(query: string): boolean {
  return /\b(tumu|tum|hepsi|hepsini|listele|goster|ver|all)\b/.test(foldChefText(query));
}

/**
 * Yalnızca bu menünün kendi ad / kategori / etiket metni.
 * Küresel yemek sözlüğü veya sabit SKU listesi yok — anlam ajan + katalog.
 */
export function searchChefCatalogByUserQuery(
  catalog: MenuProductApiItem[],
  userQuery: string,
  cartProductIds: number[] = [],
  limit = MAX_RECOMMENDATIONS,
): ChefCatalogSearchResult {
  const query = userQuery.trim();
  if (!query || isPairingUserQuery(query)) {
    return { kind: "none", products: [] };
  }

  const cartSet = new Set(cartProductIds);
  const available = catalog.filter((entry) => entry.available !== false && !cartSet.has(entry.productId));
  const queryFolded = foldChefText(query);
  const tokens = meaningfulTokens(query);
  if (tokens.length === 0 && queryFolded.length < 3) {
    return { kind: "none", products: [] };
  }

  const categoryHits = new Map<string, { label: string; score: number; products: MenuProductApiItem[] }>();
  for (const entry of available) {
    const labels = [entry.mainCategoryName, entry.subCategoryName].filter(Boolean) as string[];
    for (const label of labels) {
      const folded = foldChefText(label);
      if (folded.length < 3) continue;
      const inQuery = queryFolded.includes(folded) || folded.includes(queryFolded);
      const tokenHit = tokens.some((token) => folded.includes(token) || token.includes(folded));
      if (!inQuery && !tokenHit) continue;
      const key = folded;
      const current = categoryHits.get(key) ?? { label, score: folded.length, products: [] };
      current.products.push(entry);
      categoryHits.set(key, current);
    }
  }

  const bestCategory = [...categoryHits.values()].sort((a, b) => b.products.length - a.products.length)[0];
  if (bestCategory && bestCategory.products.length > 0) {
    const cap = wantsFullList(query) ? Math.max(limit, 12) : limit;
    return {
      kind: "category",
      matchedLabel: bestCategory.label,
      products: bestCategory.products.slice(0, cap).map(mapMenuProductToChefItem),
    };
  }

  const nameHits = available
    .map((entry) => {
      const name = foldChefText(entry.name ?? "");
      const hay = foldChefText(catalogText(entry));
      let score = 0;
      if (name && (queryFolded.includes(name) || name.includes(queryFolded))) score += 200;
      for (const token of tokens) {
        if (name.includes(token) || hay.includes(token)) score += 40 + token.length;
      }
      return { entry, score };
    })
    .filter((row) => row.score >= 80)
    .sort((a, b) => b.score - a.score);

  if (nameHits.length > 0) {
    return {
      kind: "product",
      matchedLabel: nameHits[0].entry.name,
      products: nameHits.slice(0, limit).map((row) => mapMenuProductToChefItem(row.entry)),
    };
  }

  return { kind: "none", products: [] };
}

export function replyForCatalogSearch(result: ChefCatalogSearchResult, count: number): string {
  if (count === 0) {
    return "Bu isteğe uygun ürün menüde bulamadım. Başka bir isim veya kategori deneyebilirsiniz.";
  }
  if (result.kind === "category" && result.matchedLabel) {
    return `${result.matchedLabel} içinden ${count} seçenek gösteriyorum.`;
  }
  return "Menüden bu isteğe uyan seçenekleri gösteriyorum.";
}
