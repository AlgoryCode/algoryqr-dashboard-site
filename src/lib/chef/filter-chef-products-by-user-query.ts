import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";

const QUERY_STOP_WORDS = new Set([
  "istiyorum",
  "isterim",
  "istiyor",
  "lütfen",
  "lutfen",
  "bana",
  "ben",
  "bir",
  "tane",
  "adet",
  "var",
  "mi",
  "mı",
  "mu",
  "mü",
  "ne",
  "nasil",
  "nasıl",
  "öner",
  "oner",
  "öneri",
  "oneri",
  "menu",
  "menü",
  "ürün",
  "urun",
  "için",
  "icin",
  "olsun",
  "getir",
  "gelsin",
]);

const QUERY_SYNONYMS: Record<string, string[]> = {
  hamburger: ["burger", "hamburger"],
  burger: ["burger", "hamburger"],
};

function normalizeMatchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Son gerçek kullanıcı cümlesi (BFF prefix’lerini atlar). */
export function extractUserQueryForChefMatch(message: string): string {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith("[")) continue;
    if (/yanıt kuralları|müşteri sepeti|kişiselleştirme|son sohbet|productid:/i.test(line)) {
      continue;
    }
    return line;
  }

  return lines[lines.length - 1] ?? message;
}

export function queryTermsForChefMatch(query: string): string[] {
  const normalized = normalizeMatchText(query);
  const raw = normalized.split(/[^a-z0-9çğıöşü]+/).filter((part) => part.length >= 2);
  const terms = new Set<string>();

  for (const part of raw) {
    if (QUERY_STOP_WORDS.has(part)) continue;
    terms.add(part);
  }

  return [...terms];
}

function termVariants(term: string): string[] {
  return [...new Set([term, ...(QUERY_SYNONYMS[term] ?? [])])];
}

function scoreTermAgainstProduct(haystack: string, nameHay: string, term: string): number {
  let best = 0;
  for (const variant of termVariants(term)) {
    if (!haystack.includes(variant)) continue;
    const inName = nameHay.includes(variant);
    best = Math.max(best, (inName ? 120 : 60) + (variant.length >= 5 ? 15 : 0));
  }
  return best;
}

export function isSpecificProductQuery(message: string): boolean {
  if (/genel ürün önerisi|genel öneri|genel menü/i.test(message)) return false;
  if (/müşteri sepeti:|sepetime uygun/i.test(message) && !/istiyorum|isterim/i.test(message)) {
    return false;
  }

  const query = extractUserQueryForChefMatch(message);
  const terms = queryTermsForChefMatch(query);
  return terms.length > 0 && terms.length <= 5;
}

function productMatchHaystack(catalog: MenuProductApiItem): string {
  const tagNames =
    catalog.tags?.map((tag) => tag.name ?? tag.slug ?? "").filter(Boolean) ?? [];
  return normalizeMatchText(
    [
      catalog.name,
      catalog.description,
      catalog.mainCategoryName,
      catalog.subCategoryName,
      ...tagNames,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function scoreChefProductQueryMatch(
  catalog: MenuProductApiItem,
  terms: string[],
): number {
  if (terms.length === 0) return 0;
  const haystack = productMatchHaystack(catalog);
  const nameHay = normalizeMatchText(catalog.name ?? "");
  let score = 0;

  for (const term of terms) {
    score += scoreTermAgainstProduct(haystack, nameHay, term);
  }

  return score;
}

function menuProductToChefItem(product: MenuProductApiItem): ChefProductItem {
  const price =
    typeof product.price === "number"
      ? product.price
      : typeof product.price === "string"
        ? Number.parseFloat(product.price)
        : null;

  return {
    productId: product.productId,
    menuId: product.menuId,
    name: product.name,
    description: product.description ?? null,
    subCategoryId: product.subCategoryId ?? null,
    subCategoryName: product.subCategoryName ?? null,
    mainCategoryName: product.mainCategoryName ?? null,
    price: Number.isFinite(price) ? price : null,
    currency: product.currency ?? "TRY",
    imageUrl: product.imageUrl ?? null,
    available: product.available !== false,
    chefRecommended: product.chefRecommended === true,
    allergens: product.allergens?.map((a) => a.name).filter(Boolean),
  };
}

/**
 * Belirli ürün isteğinde agent’ın alakasız kategorilerini budar; gerekirse katalogdan doğru ürünleri seçer.
 */
export function applyUserQueryToChefRecommendations(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  message: string,
  cartProductIds: number[] = [],
): ChefProductItem[] {
  if (!isSpecificProductQuery(message)) return products;

  const terms = queryTermsForChefMatch(extractUserQueryForChefMatch(message));
  if (terms.length === 0) return products;

  const cartSet = new Set(cartProductIds);
  const catalogById = new Map(catalog.map((entry) => [entry.productId, entry]));

  const catalogHits = catalog
    .filter((entry) => !cartSet.has(entry.productId))
    .map((entry) => ({ entry, score: scoreChefProductQueryMatch(entry, terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (catalogHits.length === 0) return products;

  const topScore = catalogHits[0].score;
  const minScore = Math.max(50, topScore * 0.55);
  const relevant = catalogHits.filter((row) => row.score >= minScore);

  const categoryWeight = new Map<number, number>();
  for (const { entry, score } of relevant) {
    if (entry.mainCategoryId == null) continue;
    categoryWeight.set(
      entry.mainCategoryId,
      (categoryWeight.get(entry.mainCategoryId) ?? 0) + score,
    );
  }

  let dominantCategoryId: number | null = null;
  let bestWeight = 0;
  for (const [categoryId, weight] of categoryWeight) {
    if (weight > bestWeight) {
      bestWeight = weight;
      dominantCategoryId = categoryId;
    }
  }

  const focusedPool = relevant.filter(
    (row) =>
      dominantCategoryId == null ||
      row.entry.mainCategoryId === dominantCategoryId ||
      row.score >= topScore * 0.92,
  );

  const allowedIds = new Set(focusedPool.map((row) => row.entry.productId));
  const agentMatches = products
    .filter((item) => allowedIds.has(item.productId))
    .map((item) => {
      const catalogProduct = catalogById.get(item.productId);
      const score = catalogProduct ? scoreChefProductQueryMatch(catalogProduct, terms) : 0;
      return { item, score };
    })
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);

  if (agentMatches.length > 0) {
    return agentMatches.slice(0, 6);
  }

  return focusedPool.slice(0, 6).map((row) => menuProductToChefItem(row.entry));
}
