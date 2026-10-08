"use client";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { useActivePackages } from "@/hooks/use-subscription";
import { hasProduct } from "@/lib/auth-user";
import { filterCatalogPackages } from "@/lib/package-display";
import { packageIncludesProduct } from "@/lib/product-access";

const SMART_REPORTING_PRODUCT = "SMART_REPORTING";

export function useSmartReportingAccess() {
  const { data: accessProfile, isLoading: accessLoading } = useAccessProfile();
  const packages = useActivePackages();
  const catalogPackages = packages.data ?? [];
  const canUseSmartReporting = hasProduct(accessProfile, SMART_REPORTING_PRODUCT);

  const smartReportingPackageNames = filterCatalogPackages(catalogPackages)
    .filter((pkg) => packageIncludesProduct(pkg, SMART_REPORTING_PRODUCT))
    .map((pkg) => pkg.name?.trim())
    .filter((name): name is string => !!name);

  return {
    accessLoading: accessLoading || packages.isLoading,
    canUseSmartReporting,
    smartReportingPackageNames,
  };
}
