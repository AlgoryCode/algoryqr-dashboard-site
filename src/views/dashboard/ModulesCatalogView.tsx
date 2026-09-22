"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { ModuleCard } from "@/components/dashboard/modules/ModuleCard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useActivePackages, useSubscription } from "@/hooks/use-subscription";
import type { PlanPackageApiItem } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  cartPricing,
  formatCartMoney,
  selectableModules,
  usePackageCart,
} from "@/lib/package-cart";
import { filterCatalogPackages, resolvePackagePricing } from "@/lib/package-display";
import { isActivePaidPurchase } from "@/lib/product-access";
import { cn } from "@/lib/utils";

function basePackages(packages: PlanPackageApiItem[]): PlanPackageApiItem[] {
  return filterCatalogPackages(packages)
    .filter((pkg) => pkg.code !== "FREE_PACKAGE" && Number(pkg.price) > 0)
    .sort((left, right) => (Number(left.price) || 0) - (Number(right.price) || 0));
}

export default function ModulesCatalogView() {
  const packagesQuery = useActivePackages();
  const subscriptionQuery = useSubscription();
  const { cart, hydrated, moduleQuantity, setModuleQuantity, addModule, selectPackage, setBillingPeriod } =
    usePackageCart();

  const packages = useMemo(() => basePackages(packagesQuery.data ?? []), [packagesQuery.data]);
  const activePurchase = subscriptionQuery.data?.activePurchase ?? null;
  const hasActiveHost = isActivePaidPurchase(activePurchase) || activePurchase?.purchaseType === "TRIAL";
  const hostPackageId = activePurchase?.packageId ?? null;
  const addonMode = cart.intent === "ADDON" && hasActiveHost;

  useEffect(() => {
    if (!hydrated || hostPackageId == null || !hasActiveHost) return;
    if (cart.intent === "ADDON" && cart.packageId === hostPackageId) return;
    selectPackage(hostPackageId, cart.billingPeriod, "ADDON");
  }, [
    hydrated,
    hostPackageId,
    hasActiveHost,
    cart.intent,
    cart.packageId,
    cart.billingPeriod,
    selectPackage,
  ]);

  const selectedPackage = useMemo(() => {
    const byCart = packages.find((pkg) => pkg.id === cart.packageId);
    if (byCart) return byCart;
    if (hostPackageId != null) {
      return packagesQuery.data?.find((pkg) => pkg.id === hostPackageId) ?? null;
    }
    return null;
  }, [packages, packagesQuery.data, cart.packageId, hostPackageId]);

  const modules = useMemo(() => selectableModules(selectedPackage), [selectedPackage]);
  const includedCodes = useMemo(
    () => new Set((selectedPackage?.items ?? []).map((item) => item.productCode)),
    [selectedPackage],
  );
  const pricing = useMemo(
    () => cartPricing(selectedPackage, cart.modules, cart.billingPeriod, !addonMode),
    [selectedPackage, cart.modules, cart.billingPeriod, addonMode],
  );
  const yearly = cart.billingPeriod === "YEARLY";
  const canCheckout = selectedPackage != null && (addonMode ? pricing.lines.length > 0 : true);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Modüller"
        hint={
          addonMode
            ? "Aktif paketinize eklemek istediğiniz modülleri sepete ekleyin."
            : "Temel paketi seçin, ardından ihtiyacınız olan modülleri ekleyin."
        }
      />

      <div className="flex items-center gap-3">
        <Label htmlFor="module-billing-period" className={cn("text-sm", !yearly && "font-medium")}>
          Aylık
        </Label>
        <Switch
          id="module-billing-period"
          checked={yearly}
          onCheckedChange={(checked) => setBillingPeriod(checked ? "YEARLY" : "MONTHLY")}
          aria-label="Aylık ve yıllık fiyat arasında geçiş yap"
        />
        <Label htmlFor="module-billing-period" className={cn("text-sm", yearly && "font-medium")}>
          Yıllık
        </Label>
      </div>

      {addonMode && selectedPackage ? (
        <div className={`${DASHBOARD_SURFACE} p-4`}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktif paket</p>
          <p className="mt-1 font-medium text-foreground">{selectedPackage.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seçtiğiniz modüller mevcut paketinize eklenecek.
          </p>
        </div>
      ) : packagesQuery.isLoading || !hydrated || subscriptionQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-3xl bg-muted" />
          <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : packages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Seçilebilecek temel paket bulunamadı.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((pkg) => {
            const selected = pkg.id === cart.packageId;
            const packagePrice = resolvePackagePricing(pkg, cart.billingPeriod);
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => selectPackage(pkg.id, cart.billingPeriod, "NEW_PACKAGE")}
                className={cn(DASHBOARD_SURFACE, "p-4 text-left", selected && "ring-2 ring-primary")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{pkg.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCartMoney(packagePrice.amount, pkg.currency)} {packagePrice.suffix}
                    </p>
                  </div>
                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {hydrated && selectedPackage == null ? (
        <p className="text-sm text-muted-foreground">Modülleri eklemek için önce bir temel paket seçin.</p>
      ) : modules.length === 0 && selectedPackage ? (
        <p className="text-sm text-muted-foreground">Bu paket için eklenebilecek modül bulunmuyor.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.productCode}
              module={module}
              currency={pricing.currency}
              quantity={moduleQuantity(module.productCode)}
              included={includedCodes.has(module.productCode)}
              onAdd={() => addModule(module.productCode)}
              onQuantity={(quantity) => setModuleQuantity(module.productCode, quantity)}
            />
          ))}
        </div>
      )}

      {selectedPackage && canCheckout ? (
        <div className={`${DASHBOARD_SURFACE} flex flex-wrap items-center justify-between gap-3 p-4`}>
          <div>
            <p className="text-sm text-muted-foreground">
              {addonMode
                ? `${pricing.lines.length} modül`
                : `${selectedPackage.name}${pricing.lines.length > 0 ? ` + ${pricing.lines.length} modül` : ""}`}
            </p>
            <p className="text-xl font-semibold text-foreground">
              {formatCartMoney(pricing.grandTotal, pricing.currency)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{pricing.suffix}</span>
            </p>
          </div>
          <Button variant="hero" asChild>
            <Link href={DASHBOARD_ROUTES.accountCartCheckout}>Ödemeye geç</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
