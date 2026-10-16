"use client";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { hasProduct } from "@/lib/auth-user";
import { usePackageStore } from "@/stores/package-access-store";

const ONLINE_ORDER_PRODUCT = "ONLINE_ORDER";

export function useOnlineOrderAccess() {
  const {
    data: accessProfile,
    isLoading: accessLoading,
    isError: accessError,
    refetch: retryAccess,
  } = useAccessProfile();
  const entitlements = usePackageStore((state) => state.entitlements);
  const canUseOnlineOrder = hasProduct(accessProfile, ONLINE_ORDER_PRODUCT);

  return {
    accessLoading,
    accessError,
    retryAccess,
    canUseOnlineOrder,
    hadExpiredAccess:
      !canUseOnlineOrder &&
      entitlements.some((item) => item.productCode === ONLINE_ORDER_PRODUCT && !item.open),
  };
}
