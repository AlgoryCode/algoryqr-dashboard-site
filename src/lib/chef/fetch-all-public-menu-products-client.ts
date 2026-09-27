import { getPublicMenuProductsRequest, type MenuProductApiItem } from "@/lib/api";

const PAGE_SIZE = 50;
const MAX_PAGES = 8;
const MAX_PRODUCTS = 400;

export async function fetchAllPublicMenuProductsClient(
  publicId: string,
): Promise<MenuProductApiItem[]> {
  const products: MenuProductApiItem[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext && page < MAX_PAGES && products.length < MAX_PRODUCTS) {
    const response = await getPublicMenuProductsRequest(publicId, page, PAGE_SIZE);
    const batch = Array.isArray(response.content) ? response.content : [];
    products.push(...batch);
    hasNext = Boolean(response.hasNext);
    page += 1;
  }

  const seen = new Set<number>();
  const deduped: MenuProductApiItem[] = [];
  for (const product of products) {
    if (deduped.length >= MAX_PRODUCTS) break;
    if (!Number.isInteger(product.productId) || product.productId <= 0) continue;
    if (seen.has(product.productId)) continue;
    seen.add(product.productId);
    deduped.push(product);
  }

  return deduped;
}
