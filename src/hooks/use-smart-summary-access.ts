"use client";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { useActivePackages } from "@/hooks/use-subscription";
import { hasProduct } from "@/lib/auth-user";
import { filterCatalogPackages } from "@/lib/package-display";
import { packageIncludesProduct } from "@/lib/product-access";

const SMART_SUMMARY_PRODUCT = "SMART_SUMMARY";

export function useSmartSummaryAccess() {
  const {
    data: accessProfile,
    isLoading: accessLoading,
    isError: accessError,
    refetch: retryAccess,
  } = useAccessProfile();
  const packages = useActivePackages();
  const catalogPackages = packages.data ?? [];
  const canUseSmartSummary = hasProduct(accessProfile, SMART_SUMMARY_PRODUCT);

  const smartSummaryPackageNames = filterCatalogPackages(catalogPackages)
    .filter((pkg) => packageIncludesProduct(pkg, SMART_SUMMARY_PRODUCT))
    .map((pkg) => pkg.name?.trim())
    .filter((name): name is string => !!name);

  return {
    accessLoading: accessLoading || packages.isLoading,
    accessError,
    retryAccess,
    canUseSmartSummary,
    smartSummaryPackageNames,
  };
}
