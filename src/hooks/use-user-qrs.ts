"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { mapUserQrToDashboardItem, type DashboardQrItem } from "@/components/dashboard/qr/qr-mappers";
import { getMerchantQrsRequest } from "@/lib/api";

export const merchantQrsQueryKey = (merchantId: string, includeImage = false) =>
  ["merchantQrs", merchantId, includeImage ? "withImage" : "noImage"] as const;

export function useUserQrs(
  merchantId: string | undefined,
  options?: { includeImage?: boolean },
) {
  const id = merchantId?.trim() || "me";
  const includeImage = options?.includeImage === true;
  return useQuery({
    queryKey: merchantQrsQueryKey(id, includeImage),
    queryFn: async (): Promise<DashboardQrItem[]> => {
      const response = await getMerchantQrsRequest(id, { includeImage, page: 0, size: 50 });
      return response.content.map(mapUserQrToDashboardItem);
    },
    enabled: true,
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function invalidateUserQrs(queryClient: QueryClient, merchantId?: string | undefined) {
  const id = merchantId?.trim() || "me";
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["merchantQrs", id], exact: false }),
    queryClient.invalidateQueries({ queryKey: ["merchantQrs", "me"], exact: false }),
  ]);
}
