import axios from "axios";

import type { MenuProductApiItem, MenuProductPageApiResponse } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

import { type AgentCatalogProduct, mapMenuProductToAgentCatalog } from "./agent-catalog-product";

const PAGE_SIZE = 50;
const MAX_PAGES = 8;
const MAX_CATALOG = 400;

export async function fetchPublicMenuCatalogForChef(publicId: string): Promise<AgentCatalogProduct[]> {
  const products: MenuProductApiItem[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext && page < MAX_PAGES && products.length < MAX_CATALOG) {
    const upstream = await axios.get<MenuProductPageApiResponse>(
      `${API_BASE_URL}/menu/public/${encodeURIComponent(publicId)}/products`,
      {
        params: { page, size: PAGE_SIZE },
        validateStatus: () => true,
        timeout: 20_000,
      },
    );

    if (upstream.status >= 400) {
      throw new Error(
        typeof upstream.data === "object" && upstream.data && "message" in upstream.data
          ? String((upstream.data as { message?: string }).message)
          : "Menü ürünleri alınamadı",
      );
    }

    const batch = Array.isArray(upstream.data?.content) ? upstream.data.content : [];
    products.push(...batch);
    hasNext = Boolean(upstream.data?.hasNext);
    page += 1;
  }

  const seen = new Set<number>();
  const catalog: AgentCatalogProduct[] = [];
  for (const product of products) {
    if (catalog.length >= MAX_CATALOG) break;
    if (!Number.isInteger(product.productId) || product.productId <= 0) continue;
    if (seen.has(product.productId)) continue;
    seen.add(product.productId);
    catalog.push(mapMenuProductToAgentCatalog(product));
  }

  return catalog;
}
