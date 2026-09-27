import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";

type DietRule = {
  keywords: string[];
  excludeAllergenSlugs: string[];
  excludeNameKeywords: string[];
};

const DIET_RULES: DietRule[] = [
  {
    keywords: ["vegan", "vejetaryen", "vegetarian"],
    excludeAllergenSlugs: ["milk", "egg", "fish", "crustacean", "mollusc"],
    excludeNameKeywords: ["et", "tavuk", "balık", "köfte", "dana", "kuzu", "hindi", "somon", "karides"],
  },
  {
    keywords: ["gluten"],
    excludeAllergenSlugs: ["gluten", "wheat"],
    excludeNameKeywords: [],
  },
  {
    keywords: ["laktoz", "lactose", "süt"],
    excludeAllergenSlugs: ["milk", "lactose"],
    excludeNameKeywords: [],
  },
];

function messageMatchesRule(message: string, rule: DietRule): boolean {
  const lower = message.toLowerCase();
  return rule.keywords.some((keyword) => lower.includes(keyword));
}

function productViolatesRule(product: MenuProductApiItem, rule: DietRule): boolean {
  const allergens = product.allergens ?? [];
  for (const allergen of allergens) {
    const slug = (allergen.slug ?? "").toLowerCase();
    const name = (allergen.name ?? "").toLowerCase();
    if (rule.excludeAllergenSlugs.some((ex) => slug.includes(ex) || name.includes(ex))) {
      return true;
    }
  }
  const productName = (product.name ?? "").toLowerCase();
  return rule.excludeNameKeywords.some((keyword) => productName.includes(keyword));
}

/**
 * Hard-filter hydrated recommendations when the user message mentions diet/allergen constraints.
 */
export function filterChefProductsByDietMessage(
  products: ChefProductItem[],
  catalog: MenuProductApiItem[],
  userMessage: string,
): ChefProductItem[] {
  const activeRules = DIET_RULES.filter((rule) => messageMatchesRule(userMessage, rule));
  if (activeRules.length === 0) return products;

  const catalogById = new Map(catalog.map((entry) => [entry.productId, entry]));
  return products.filter((item) => {
    const catalogProduct = catalogById.get(item.productId);
    if (!catalogProduct) return true;
    return !activeRules.some((rule) => productViolatesRule(catalogProduct, rule));
  });
}
