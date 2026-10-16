"use client";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { useActivePackages } from "@/hooks/use-subscription";
import { hasProduct } from "@/lib/auth-user";
import { filterCatalogPackages } from "@/lib/package-display";
import { packageIncludesProduct } from "@/lib/product-access";

const AI_MENU_IMPORT_PRODUCT = "AI_MENU_IMPORT";

export function useAiMenuImportAccess() {
  const {
    data: accessProfile,
    isLoading: accessLoading,
    isError: accessError,
    refetch: retryAccess,
  } = useAccessProfile();
  const packages = useActivePackages();
  const catalogPackages = packages.data ?? [];
  const canUseAiMenuImport = hasProduct(accessProfile, AI_MENU_IMPORT_PRODUCT);

  const aiMenuImportPackageNames = filterCatalogPackages(catalogPackages)
    .filter((pkg) => packageIncludesProduct(pkg, AI_MENU_IMPORT_PRODUCT))
    .map((pkg) => pkg.name?.trim())
    .filter((name): name is string => !!name);

  return {
    accessLoading: accessLoading || packages.isLoading,
    accessError,
    retryAccess,
    canUseAiMenuImport,
    aiMenuImportPackageNames,
  };
}
