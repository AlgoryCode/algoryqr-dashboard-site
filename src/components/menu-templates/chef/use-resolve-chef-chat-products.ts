"use client";

import { useCallback } from "react";

import { getPublicProductRequest } from "@/lib/api";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import type { SearchCompletePayload } from "@/lib/chef/search-complete";
import { resolveChefProducts } from "@/lib/chef/resolve-chef-products";

import { usePublicMenuProducts } from "../shared";

export type ChefChatProductPayload = {
  productIds?: number[];
  products?: ChefProductItem[];
  searchComplete?: SearchCompletePayload;
};

export function useResolveChefChatProducts(publicId: string) {
  const { products: catalog } = usePublicMenuProducts();

  return useCallback(
    async (payload: ChefChatProductPayload): Promise<ChefProductItem[] | undefined> => {
      const hasIds =
        (Array.isArray(payload.productIds) && payload.productIds.length > 0) ||
        (Array.isArray(payload.products) && payload.products.length > 0) ||
        Boolean(payload.searchComplete);

      if (!hasIds) return undefined;

      const resolved = await resolveChefProducts({
        productIds: payload.productIds,
        products: payload.products,
        searchComplete: payload.searchComplete,
        catalog,
        fetchProductById: async (productId) => {
          try {
            return await getPublicProductRequest(publicId, productId);
          } catch {
            return null;
          }
        },
      });

      return resolved.length > 0 ? resolved : undefined;
    },
    [catalog, publicId],
  );
}
