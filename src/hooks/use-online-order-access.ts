"use client";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { useActivePackages, useSubscription } from "@/hooks/use-subscription";
import { hasProduct, hasScope } from "@/lib/auth-user";
import {
  hasActivePackageProduct,
  hasActiveProductAccess,
  hasExpiredProductAccess,
} from "@/lib/product-access";

const ONLINE_ORDER_PRODUCT = "ONLINE_ORDER";

export function useOnlineOrderAccess() {
  const { data: accessProfile, isLoading: accessLoading } = useAccessProfile();
  const subscription = useSubscription();
  const packages = useActivePackages();

  const activePurchase = subscription.data?.activePurchase ?? null;
  const catalogPackages = packages.data ?? [];
  const entitlements = subscription.data?.entitlements ?? [];
  const purchases = subscription.data?.purchases ?? [];

  const canUseOnlineOrder =
    hasScope(accessProfile, "ONLINE_ORDER_OWNER") ||
    hasProduct(accessProfile, ONLINE_ORDER_PRODUCT) ||
    hasActiveProductAccess(entitlements, purchases, ONLINE_ORDER_PRODUCT) ||
    hasActivePackageProduct(activePurchase, catalogPackages, ONLINE_ORDER_PRODUCT);

  return {
    accessLoading: accessLoading || subscription.isLoading || packages.isLoading,
    canUseOnlineOrder,
    hadExpiredAccess:
      !canUseOnlineOrder &&
      hasExpiredProductAccess(entitlements, purchases, ONLINE_ORDER_PRODUCT),
  };
}
