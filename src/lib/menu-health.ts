import type { MenuProductApiItem } from "@/lib/api";

export type MenuProductHealth = {
  total: number;
  available: number;
  unavailable: number;
  missingImage: number;
  missingPrice: number;
  missingDescription: number;
};

function hasPrice(price: MenuProductApiItem["price"]): boolean {
  if (price == null || price === "") return false;
  const value = typeof price === "number" ? price : Number(price);
  return Number.isFinite(value) && value > 0;
}

/** Counts the products of one menu that are off sale or missing the details guests see. */
export function summarizeMenuProducts(products: readonly MenuProductApiItem[]): MenuProductHealth {
  const health: MenuProductHealth = {
    total: products.length,
    available: 0,
    unavailable: 0,
    missingImage: 0,
    missingPrice: 0,
    missingDescription: 0,
  };
  for (const product of products) {
    if (product.available) health.available += 1;
    else health.unavailable += 1;
    if (!product.imageUrl?.trim()) health.missingImage += 1;
    if (!hasPrice(product.price)) health.missingPrice += 1;
    if (!product.description?.trim()) health.missingDescription += 1;
  }
  return health;
}
