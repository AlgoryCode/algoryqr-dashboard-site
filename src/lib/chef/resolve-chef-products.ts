import type { MenuProductApiItem } from "@/lib/api";

import type { ChefProductItem } from "./chef-product-item";
import { extractChefProductIds, type ChefProductIdSource } from "./extract-chef-product-ids";
import { mapMenuProductToChefItem } from "./map-menu-product-to-chef-item";
import { normalizeChefProducts } from "./normalize-chef-products";

export type ResolveChefProductsInput = ChefProductIdSource & {
  catalog?: MenuProductApiItem[];
  fetchProductById?: (productId: number) => Promise<MenuProductApiItem | null>;
};

function catalogById(catalog: MenuProductApiItem[]): Map<number, MenuProductApiItem> {
  const map = new Map<number, MenuProductApiItem>();
  for (const product of catalog) {
    if (Number.isInteger(product.productId) && product.productId > 0) {
      map.set(product.productId, product);
    }
  }
  return map;
}

/**
 * Build chef cards from canonical menu rows when product IDs are known.
 */
export async function resolveChefProducts(input: ResolveChefProductsInput): Promise<ChefProductItem[]> {
  const normalizedFromPayload = normalizeChefProducts(input.products);
  const productIds = extractChefProductIds(input);
  if (
    normalizedFromPayload.length > 0 &&
    productIds.length === 0
  ) {
    const byId = catalogById(input.catalog ?? []);
    return normalizedFromPayload.map((item) => {
      const canonical = byId.get(item.productId);
      return canonical ? mapMenuProductToChefItem(canonical) : item;
    });
  }
  if (productIds.length === 0) {
    return normalizedFromPayload;
  }

  const byId = catalogById(input.catalog ?? []);
  const resolved: ChefProductItem[] = [];
  const fetchProductById = input.fetchProductById;

  for (const productId of productIds) {
    let menuProduct = byId.get(productId) ?? null;
    if (!menuProduct && fetchProductById) {
      try {
        menuProduct = await fetchProductById(productId);
      } catch {
        menuProduct = null;
      }
    }

    if (menuProduct) {
      resolved.push(mapMenuProductToChefItem(menuProduct));
      continue;
    }

    const fallback = Array.isArray(input.products)
      ? (input.products as Array<{ productId?: unknown }>).find(
          (entry) => asPositiveInt(entry?.productId) === productId,
        )
      : null;
    if (fallback) {
      const normalized = normalizeChefProducts([fallback]);
      if (normalized[0]) resolved.push(normalized[0]);
    }
  }

  return normalizeChefProducts(resolved);
}

function asPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export { extractChefProductIds };
