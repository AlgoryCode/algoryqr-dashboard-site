"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";

import { getActiveProductsRequest, type CatalogProductApiItem } from "@/lib/api";

export const CATALOG_PRODUCTS_QUERY_KEY = ["catalogProducts"] as const;

export function useCatalogProducts(enabled = true) {
  return useQuery({
    queryKey: CATALOG_PRODUCTS_QUERY_KEY,
    queryFn: (): Promise<CatalogProductApiItem[]> => getActiveProductsRequest(),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function invalidateCatalogProducts(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: CATALOG_PRODUCTS_QUERY_KEY, exact: false });
}
