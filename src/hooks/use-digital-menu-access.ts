"use client";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { hasProduct } from "@/lib/auth-user";
import { usePackageStore } from "@/stores/package-access-store";

const QR_MENU_PRODUCT = "QR_MENU";

export function useDigitalMenuAccess() {
  const {
    data: accessProfile,
    isLoading: accessLoading,
    isError: accessError,
    refetch: retryAccess,
  } = useAccessProfile();
  const entitlements = usePackageStore((state) => state.entitlements);
  const canUseDigitalMenu = hasProduct(accessProfile, QR_MENU_PRODUCT);
  const hadExpiredAccess =
    !canUseDigitalMenu &&
    entitlements.some((item) => item.productCode === QR_MENU_PRODUCT && !item.open);

  return {
    accessLoading,
    accessError,
    retryAccess,
    canUseDigitalMenu,
    hadExpiredAccess,
  };
}
