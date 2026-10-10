import type { MenuProductApiItem } from "@/lib/api";

/** Shape expected by qr-agent `catalogProductsSchema`. */
export type AgentCatalogProduct = {
  productId: number;
  menuId: number;
  name: string;
  description: string | null;
  subCategoryId: number | null;
  subCategoryName: string | null;
  mainCategoryId: number | null;
  mainCategoryName: string | null;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  available: boolean;
  chefRecommended: boolean;
  ratingAvg: number | null;
  ratingCount: number | null;
  tags: string[];
  allergens: string[];
  pairingProductIds: number[];
};

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function mapMenuProductToAgentCatalog(product: MenuProductApiItem): AgentCatalogProduct {
  const description = product.description?.trim();
  return {
    productId: product.productId,
    menuId: product.menuId ?? 0,
    name: product.name.trim(),
    description: description ? description.slice(0, 500) : null,
    subCategoryId: product.subCategoryId ?? null,
    subCategoryName: product.subCategoryName?.trim() || null,
    mainCategoryId: product.mainCategoryId ?? null,
    mainCategoryName: product.mainCategoryName?.trim() || null,
    price: asNumber(product.price),
    currency: product.currency?.trim() || "TRY",
    imageUrl: product.imageUrl?.trim() || null,
    available: product.available !== false,
    chefRecommended: Boolean(product.chefRecommended),
    ratingAvg: asNumber(product.ratingAvg),
    ratingCount: asNumber(product.ratingCount),
    tags: (product.tags ?? []).map((tag) => tag.slug || tag.name).filter(Boolean),
    allergens: (product.allergens ?? []).map((item) => item.slug || item.name).filter(Boolean),
    pairingProductIds: product.pairings?.productIds ?? [],
  };
}
