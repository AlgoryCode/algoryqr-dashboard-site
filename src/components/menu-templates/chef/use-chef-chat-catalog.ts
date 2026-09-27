"use client";

import { useEffect, useMemo, useState } from "react";

import type { MenuProductApiItem } from "@/lib/api";
import { mapMenuProductToAgentCatalog, type AgentCatalogProduct } from "@/lib/chef/agent-catalog-product";
import { fetchAllPublicMenuProductsClient } from "@/lib/chef/fetch-all-public-menu-products-client";

export function useChefChatCatalog(publicId: string, open: boolean) {
  const [menuProducts, setMenuProducts] = useState<MenuProductApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !publicId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchAllPublicMenuProductsClient(publicId)
      .then((products) => {
        if (cancelled) return;
        setMenuProducts(products);
        if (products.length === 0) {
          setError("Menü ürünleri bulunamadı");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setMenuProducts([]);
        setError(err instanceof Error ? err.message : "Menü ürünleri yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, publicId]);

  const agentCatalog = useMemo<AgentCatalogProduct[]>(
    () => menuProducts.map(mapMenuProductToAgentCatalog),
    [menuProducts],
  );

  return {
    menuProducts,
    agentCatalog,
    loading,
    error,
    ready: !loading && menuProducts.length > 0,
  };
}
