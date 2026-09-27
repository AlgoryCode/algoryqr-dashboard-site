"use client";

import { useEffect, useState } from "react";

import { getCustomerOrders } from "@/lib/ordering-api";

export function useChefPriorOrderProductIds(publicId: string, enabled: boolean): number[] {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (!enabled || !publicId) {
      setIds([]);
      return;
    }
    let cancelled = false;
    void getCustomerOrders(publicId)
      .then((orders) => {
        if (cancelled) return;
        const seen = new Set<number>();
        for (const order of orders.slice(0, 8)) {
          for (const line of order.items ?? []) {
            if (line.productId != null) seen.add(line.productId);
          }
        }
        setIds([...seen]);
      })
      .catch(() => {
        if (!cancelled) setIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, publicId]);

  return ids;
}
