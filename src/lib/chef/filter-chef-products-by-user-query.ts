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
  "yok",
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
  "degil",
  "değil",
]);

const QUERY_SYNONYMS: Record<string, string[]> = {
  hamburger: ["burger", "hamburger"],
  burger: ["burger", "hamburger"],
  kola: ["kola", "cola", "coca"],
  cola: ["kola", "cola", "coca"],
  coca: ["kola", "cola", "coca"],
};

const COCKTAIL_PATTERN =
  /kokteyl|cocktail|\b5\s*cl\b|margarita|mojito|cosmopolitan|aperol|spritz|long\s*island|piña|pina\s*cola|white\s*russian|sex\s*on|tom\s*collins|sangria|martini|daiquiri|negroni|old\s*fashioned|whiskey\s*sour/i;

function normalizeMatchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[-_/]/g, " ");
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

export function resolveChefUserQuery(message: string, userQuery?: string): string {
  const direct = userQuery?.trim();
  if (direct) return direct;
  return extractUserQueryForChefMatch(message);
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

export function isSpecificProductQuery(message: string, userQuery?: string): boolean {
  if (/genel ürün önerisi|genel öneri|genel menü/i.test(message)) return false;
  if (
    !userQuery?.trim() &&
    /müşteri sepeti:|sepetime uygun/i.test(message) &&
    !/istiyorum|isterim/i.test(message)
  ) {
    return false;
  }

  const query = resolveChefUserQuery(message, userQuery);
  const terms = queryTermsForChefMatch(query);
  if (terms.length === 0 || terms.length > 5) return false;
  if (/genel öneri|genel ürün/i.test(query)) return false;
  return true;
}

export function prefersSoftDrinkQuery(query: string): boolean {
  const normalized = normalizeMatchText(query);
  if (/kokteyl|cocktail|alkol|bira|şarap|sarap|wine/.test(normalized)) return false;
  return /serin|soguk|soğuk|mesrubat|meşrubat|kola|cola|soda|gazoz|ayran|limonata|ice\s*cek|içecek|meyve\s*suyu/.test(
    normalized,
  );
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

function isLikelyCocktailProduct(catalog: MenuProductApiItem | undefined, item?: ChefProductItem): boolean {
  const hay = normalizeMatchText(
    [item?.name, catalog?.name, catalog?.mainCategoryName, catalog?.subCategoryName]
      .filter(Boolean)
      .join(" "),
  );
  return COCKTAIL_PATTERN.test(hay) || hay.includes("kokteyl");
}

export function filterSoftDrinkProducts(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  query: string,
): ChefProductItem[] {
  if (!prefersSoftDrinkQuery(query)) return products;
  const catalogById = new Map(catalog.map((entry) => [entry.productId, entry]));
  return products.filter(
    (item) => !isLikelyCocktailProduct(catalogById.get(item.productId), item),
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

function pickFromCatalogHits(
  catalogHits: { entry: MenuProductApiItem; score: number }[],
  products: ChefProductItem[],
  catalogById: Map<number, MenuProductApiItem>,
  terms: string[],
): ChefProductItem[] {
  if (catalogHits.length === 0) return [];

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

/**
 * Belirli ürün isteğinde agent’ın alakasız kategorilerini budar; katalogdan doğru ürünleri seçer.
 */
export function applyUserQueryToChefRecommendations(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  message: string,
  cartProductIds: number[] = [],
  userQuery?: string,
): ChefProductItem[] {
  const queryText = resolveChefUserQuery(message, userQuery);
  if (!isSpecificProductQuery(message, userQuery)) return products;

  const terms = queryTermsForChefMatch(queryText);
  if (terms.length === 0) return products;

  const cartSet = new Set(cartProductIds);
  const catalogById = new Map(catalog.map((entry) => [entry.productId, entry]));

  const catalogHits = catalog
    .filter((entry) => !cartSet.has(entry.productId))
    .map((entry) => ({ entry, score: scoreChefProductQueryMatch(entry, terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (catalogHits.length === 0) {
    if (prefersSoftDrinkQuery(queryText)) {
      return filterSoftDrinkProducts(products, catalog, queryText).slice(0, 6);
    }
    return [];
  }

  const picked = pickFromCatalogHits(catalogHits, products, catalogById, terms);
  const withSoftDrink = filterSoftDrinkProducts(picked, catalog, queryText);
  return withSoftDrink.slice(0, 6);
}
