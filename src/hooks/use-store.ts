"use client";

import { useQuery } from "@tanstack/react-query";

import { useOnlineOrderAccess } from "@/hooks/use-online-order-access";
import { getMyStore, listStoreCouriers, listStoreOrders, type StoreOrderStatus } from "@/lib/store-api";

export const STORE_QUERY_KEYS = {
  merchant: ["store", "merchant"] as const,
  couriers: ["store", "couriers"] as const,
  orders: ["store", "orders"] as const,
};

const ORDER_POLL_INTERVAL_MS = 10_000;

export function useMyStore() {
  const { accessLoading, canUseOnlineOrder } = useOnlineOrderAccess();
  const query = useQuery({
    queryKey: STORE_QUERY_KEYS.merchant,
    queryFn: getMyStore,
    enabled: canUseOnlineOrder && !accessLoading,
  });
  return {
    ...query,
    accessLoading,
    canUseOnlineOrder,
    merchant: query.data ?? null,
    isSetUp: Boolean(query.data),
  };
}

export function useStoreCouriers(enabled = true) {
  const { accessLoading, canUseOnlineOrder } = useOnlineOrderAccess();
  return useQuery({
    queryKey: STORE_QUERY_KEYS.couriers,
    queryFn: listStoreCouriers,
    enabled: enabled && canUseOnlineOrder && !accessLoading,
  });
}

export function useStoreOrders(params: {
  status?: StoreOrderStatus[];
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  enabled?: boolean;
}) {
  const { accessLoading, canUseOnlineOrder } = useOnlineOrderAccess();
  return useQuery({
    queryKey: [
      ...STORE_QUERY_KEYS.orders,
      params.status ?? [],
      params.from,
      params.to,
      params.page ?? 0,
      params.size ?? 20,
    ],
    queryFn: () =>
      listStoreOrders({
        status: params.status,
        from: params.from,
        to: params.to,
        page: params.page,
        size: params.size,
      }),
    enabled: (params.enabled ?? true) && canUseOnlineOrder && !accessLoading,
    refetchInterval: ORDER_POLL_INTERVAL_MS,
  });
}
