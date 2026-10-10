import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function mapMenuProductToChefItem(product: MenuProductApiItem): ChefProductItem {
  return {
    productId: product.productId,
    menuId: product.menuId ?? 0,
    name: product.name,
    description: product.description ?? null,
    subCategoryId: product.subCategoryId ?? null,
    subCategoryName: product.subCategoryName ?? null,
    mainCategoryName: product.mainCategoryName ?? null,
    price: asNumber(product.price),
    currency: product.currency || "TRY",
    imageUrl: product.imageUrl ?? null,
    available: product.available !== false,
    chefRecommended: product.chefRecommended === true,
    allergens: (product.allergens ?? []).map((entry) => entry.name || entry.slug).filter(Boolean),
    nutrition: (product.nutrition as Record<string, unknown> | null | undefined) ?? null,
    optionGroups: product.optionGroups,
  };
}
