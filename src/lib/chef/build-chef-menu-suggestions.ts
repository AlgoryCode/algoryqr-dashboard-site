import type { MenuProductApiItem } from "@/lib/api";

import type { ChefMenuSuggestion, ChefMenuSuggestionLine, ChefMenuSuggestionRole } from "./chef-menu-suggestion";
import type { ChefProductItem } from "./chef-product-item";
import { mapMenuProductToChefItem } from "./map-menu-product-to-chef-item";

const DRINK_PATTERN =
  /içecek|icecek|drink|beverage|kahve|coffee|çay|cay|tea|soda|cola|ayran|şerbet|serbet|kokteyl|cocktail|bira|beer|şarap|sarap|wine|latte|espresso|smoothie|milkshake|limonata|fresh|meşrubat|mesrubat/i;
const DESSERT_PATTERN =
  /tatlı|tatli|dessert|sweet|pasta|cake|kek|dondurma|ice\s*cream|baklava|künefe|kunefe|helva|puding|tiramisu|cheesecake|kurabiye|sütlaç|sutlac|muhallebi|dondurmalı/i;

export type BuildChefMenuSuggestionsOptions = {
  maxSuggestions?: number;
};

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function productHaystack(product: MenuProductApiItem): string {
  const tags = (product.tags ?? []).map((tag) => `${tag.slug} ${tag.name}`).join(" ");
  return [
    product.name,
    product.mainCategoryName,
    product.mainCategorySlug,
    product.subCategoryName,
    product.subCategorySlug,
    tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

export function classifyMenuProductRole(product: MenuProductApiItem): ChefMenuSuggestionRole | null {
  const haystack = productHaystack(product);
  if (DESSERT_PATTERN.test(haystack)) return "dessert";
  if (DRINK_PATTERN.test(haystack)) return "drink";
  return "food";
}

function ratingScore(product: MenuProductApiItem): number {
  const avg = asNumber(product.ratingAvg) ?? 0;
  const count = asNumber(product.ratingCount) ?? 0;
  return avg * 1000 + count;
}

function comparePick(left: MenuProductApiItem, right: MenuProductApiItem): number {
  const chefDelta = Number(Boolean(right.chefRecommended)) - Number(Boolean(left.chefRecommended));
  if (chefDelta !== 0) return chefDelta;
  const ratingDelta = ratingScore(right) - ratingScore(left);
  if (ratingDelta !== 0) return ratingDelta;
  const priceLeft = asNumber(left.price) ?? 0;
  const priceRight = asNumber(right.price) ?? 0;
  return priceLeft - priceRight;
}

function availableProducts(catalog: MenuProductApiItem[]): MenuProductApiItem[] {
  return catalog.filter((product) => product.available !== false);
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
  role: ChefMenuSuggestionRole,
  excludeIds: Set<number>,
  preferUnused: Set<number>,
): MenuProductApiItem | null {
  const filtered = candidates
    .filter((product) => {
      if (excludeIds.has(product.productId)) return false;
      return classifyMenuProductRole(product) === role;
    })
    .sort(comparePick);

  const fresh = filtered.find((product) => !preferUnused.has(product.productId));
  return fresh ?? filtered[0] ?? null;
}

function pickFoodAnchor(
  searchResults: ChefProductItem[],
  catalogById: Map<number, MenuProductApiItem>,
  catalog: MenuProductApiItem[],
  excludeIds: Set<number>,
): MenuProductApiItem | null {
  for (const item of searchResults) {
    const product = catalogById.get(item.productId);
    if (!product || product.available === false || excludeIds.has(product.productId)) continue;
    const role = classifyMenuProductRole(product);
    if (role === "food") return product;
  }
  for (const item of searchResults) {
    const product = catalogById.get(item.productId);
    if (!product || product.available === false || excludeIds.has(product.productId)) continue;
    if (classifyMenuProductRole(product) !== "dessert" && classifyMenuProductRole(product) !== "drink") {
      return product;
    }
  }
  const fallback = availableProducts(catalog)
    .filter((product) => classifyMenuProductRole(product) === "food" && !excludeIds.has(product.productId))
    .sort(comparePick)[0];
  return fallback ?? null;
}

function sumPrices(lines: ChefMenuSuggestionLine[]): number | null {
  let total = 0;
  let missing = false;
  for (const line of lines) {
    const price = line.product.price;
    if (price == null || !Number.isFinite(price)) {
      missing = true;
      continue;
    }
    total += price;
  }
  if (missing && total === 0) return null;
  return total;
}

function buildOneSuggestion(
  food: MenuProductApiItem,
  catalog: MenuProductApiItem[],
  usedDrinkIds: Set<number>,
  usedDessertIds: Set<number>,
): ChefMenuSuggestion | null {
  const exclude = new Set<number>([food.productId]);
  const pairingPool = expandPairingCandidates(food, catalog);
  const pool = availableProducts(catalog);

  const drink =
    pickForRole(pairingPool, "drink", exclude, usedDrinkIds) ??
    pickForRole(pool, "drink", exclude, usedDrinkIds);
  if (!drink) return null;
  exclude.add(drink.productId);

  const dessert =
    pickForRole(pairingPool, "dessert", exclude, usedDessertIds) ??
    pickForRole(pool, "dessert", exclude, usedDessertIds);
  if (!dessert) return null;

  const lines: ChefMenuSuggestionLine[] = [
    { role: "food", product: mapMenuProductToChefItem(food) },
    { role: "drink", product: mapMenuProductToChefItem(drink) },
    { role: "dessert", product: mapMenuProductToChefItem(dessert) },
  ];

  const currency = food.currency || drink.currency || dessert.currency || "TRY";

  return {
    id: `menu-${food.productId}`,
    anchorProductId: food.productId,
    label: `Önerilen menü · ${food.name}`,
    lines,
    totalPrice: sumPrices(lines),
    currency,
  };
}

/**
 * Build food + drink + dessert menu bundles for chef search results.
 */
export function buildChefMenuSuggestions(
  searchResults: ChefProductItem[],
  catalog: MenuProductApiItem[],
  options?: BuildChefMenuSuggestionsOptions,
): ChefMenuSuggestion[] {
  const maxSuggestions = Math.max(1, Math.min(options?.maxSuggestions ?? 5, 8));
  if (searchResults.length === 0 || catalog.length === 0) return [];

  const catalogById = new Map(catalog.map((product) => [product.productId, product]));
  const suggestions: ChefMenuSuggestion[] = [];
  const usedFoodIds = new Set<number>();
  const usedDrinkIds = new Set<number>();
  const usedDessertIds = new Set<number>();

  const anchorCandidates = [...searchResults];
  let attempts = 0;
  while (suggestions.length < maxSuggestions && attempts < searchResults.length + 3) {
    attempts += 1;
    const food = pickFoodAnchor(anchorCandidates, catalogById, catalog, usedFoodIds);
    if (!food) break;
    usedFoodIds.add(food.productId);

    const suggestion = buildOneSuggestion(food, catalog, usedDrinkIds, usedDessertIds);
    if (!suggestion) continue;

    const drinkId = suggestion.lines.find((line) => line.role === "drink")?.product.productId;
    const dessertId = suggestion.lines.find((line) => line.role === "dessert")?.product.productId;
    if (drinkId) usedDrinkIds.add(drinkId);
    if (dessertId) usedDessertIds.add(dessertId);

    suggestions.push(suggestion);
  }

  return suggestions;
}
