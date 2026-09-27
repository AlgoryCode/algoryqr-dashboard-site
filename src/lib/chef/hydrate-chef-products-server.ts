import axios from "axios";

import type { MenuProductApiItem } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

import type { ChefProductItem } from "./chef-product-item";
import { resolveChefProducts, type ResolveChefProductsInput } from "./resolve-chef-products";

async function fetchPublicProductById(
  publicId: string,
  productId: number,
): Promise<MenuProductApiItem | null> {
  const upstream = await axios.get<MenuProductApiItem>(
    `${API_BASE_URL}/menu/public/${encodeURIComponent(publicId)}/products/${productId}`,
    { validateStatus: () => true, timeout: 15_000 },
  );
  if (upstream.status >= 400 || !upstream.data?.productId) {
    return null;
  }
  return upstream.data;
}

export async function hydrateChefProductsForPublicMenu(
  publicId: string,
  input: ResolveChefProductsInput,
): Promise<{ productIds: number[]; products: ChefProductItem[] }> {
  const products = await resolveChefProducts({
    ...input,
    fetchProductById: (productId) => fetchPublicProductById(publicId, productId),
  });

  const productIds = products.map((item) => item.productId);
  return { productIds, products };
}
