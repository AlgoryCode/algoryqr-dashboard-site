"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronUp, Minus, Plus, Search } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccessSession } from "@/hooks/use-commerce";
import { useActivePackages } from "@/hooks/use-subscription";
import type { PlanPackageApiItem, PlanPackageModuleApi } from "@/lib/api";
import { destinationForDecision } from "@/lib/access-session-gate";
import type { BillingPeriod } from "@/lib/commerce";
import { clearPackageAccess } from "@/lib/load-package-access";
import {
  ACCOUNT_CARD,
  ACCOUNT_MENU_LABEL,
  DASHBOARD_TYPE_HINT,
  DASHBOARD_TYPE_TITLE,
} from "@/lib/dashboard-surface";
import {
  MAX_MODULE_QUANTITY,
  cartPricing,
  formatCartMoney,
  selectableModules,
  usePackageCart,
  type CartPricing,
} from "@/lib/package-cart";
import {
  filterCatalogPackages,
  formatYearlySavingsLabel,
  resolvePackagePricing,
} from "@/lib/package-display";
import { cn } from "@/lib/utils";

import ShopCheckout from "./ShopCheckout";

const NO_PACKAGE_NOTICE =
  "Şu an Aktif Paketiniz Bulunmamaktadır. Paketlerimize göz atabilirsiniz.";

type ShopStep = "package" | "modules" | "pay";

const STEPS: { id: ShopStep; label: string }[] = [
  { id: "package", label: "Paket" },
  { id: "modules", label: "Modüller" },
  { id: "pay", label: "Ödeme" },
];

function paidPackages(packages: PlanPackageApiItem[]): PlanPackageApiItem[] {
  return filterCatalogPackages(packages)
    .filter((pkg) => pkg.code !== "FREE_PACKAGE" && Number(pkg.price) > 0)
    .sort((left, right) => (Number(left.price) || 0) - (Number(right.price) || 0));
}

function moduleUnitLabel(module: PlanPackageModuleApi): number {
  const unitPrice = Number(module.unitPrice ?? 0);
  const vatRate = Number(module.vatRate ?? 0);
  if (!Number.isFinite(unitPrice)) return 0;
  return Math.round((unitPrice * (1 + vatRate / 100) + Number.EPSILON) * 100) / 100;
}

function CartLines({
  packageName,
  billingPeriod,
  pricing,
}: {
  packageName: string;
  billingPeriod: BillingPeriod;
  pricing: CartPricing;
}) {
  return (
    <ul className="divide-y divide-[#ececea]">
      <li className="flex items-start justify-between gap-3 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">{packageName}</p>
          <p className="text-xs text-[#8a8a86]">{billingPeriod === "YEARLY" ? "Yıllık paket" : "Aylık paket"}</p>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums text-zinc-900">
          {formatCartMoney(pricing.basePrice, pricing.currency)}
        </p>
      </li>
      {pricing.lines.map((line) => (
        <li key={line.productCode} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900">{line.productName}</p>
            <p className="text-xs text-[#8a8a86]">
              {line.quantity} × {formatCartMoney(line.unitPrice, pricing.currency)} + KDV
              {line.billingType === "ONE_TIME" ? " · tek seferlik" : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium tabular-nums text-zinc-900">
            {formatCartMoney(line.lineTotal, pricing.currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function ShopPage() {
  const router = useRouter();
  const session = useAccessSession();
  const packagesQuery = useActivePackages();
  const {
    cart,
    hydrated,
    selectPackage,
    setIntent,
    setBillingPeriod,
    moduleQuantity,
    addModule,
    setModuleQuantity,
  } = usePackageCart();
  const [step, setStep] = useState<ShopStep>("package");
  const [leaving, setLeaving] = useState(false);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const pendingStep = useRef<ShopStep | null>(null);

  useEffect(() => {
    if (session.isLoading || session.isError) return;
    const decision = session.data?.decision;
    if (!decision || decision === "REQUIRE_PURCHASE") return;
    router.replace(destinationForDecision(decision, null));
  }, [router, session.data?.decision, session.isError, session.isLoading]);

  useEffect(() => {
    if (!hydrated || cart.intent === "NEW_PACKAGE") return;
    setIntent("NEW_PACKAGE");
  }, [cart.intent, hydrated, setIntent]);

  const packages = useMemo(() => paidPackages(packagesQuery.data ?? []), [packagesQuery.data]);
  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === cart.packageId) ?? null,
    [packages, cart.packageId],
  );
  const modules = useMemo(() => selectableModules(selectedPackage), [selectedPackage]);
  const includedCodes = useMemo(
    () => new Set((selectedPackage?.items ?? []).map((item) => item.productCode)),
    [selectedPackage],
  );
  const visibleModules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");
    if (!query) return modules;
    return modules.filter((module) => {
      const name = module.productName.toLocaleLowerCase("tr");
      const code = module.productCode.toLocaleLowerCase("tr");
      return name.includes(query) || code.includes(query);
    });
  }, [modules, search]);
  const pricing = useMemo(
    () => cartPricing(selectedPackage, cart.modules, cart.billingPeriod, true),
    [selectedPackage, cart.modules, cart.billingPeriod],
  );
  const comparisonRows = useMemo(() => {
    const labels = new Map<string, string>();
    for (const pkg of packages) {
      for (const item of pkg.items ?? []) {
        if (!labels.has(item.productCode)) labels.set(item.productCode, item.productName);
      }
    }
    return [...labels.entries()].map(([code, label]) => ({ code, label }));
  }, [packages]);
  const selectedPricing = selectedPackage
    ? resolvePackagePricing(selectedPackage, cart.billingPeriod)
    : null;
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  const pickPackage = (packageId: number) => {
    selectPackage(packageId, cart.billingPeriod, "NEW_PACKAGE");
  };

  const goToStep = (next: ShopStep) => {
    if (next === step || pendingStep.current) return;
    const nextIndex = STEPS.findIndex((item) => item.id === next);
    if (nextIndex > stepIndex && !selectedPackage) return;
    setCartOpen(false);
    pendingStep.current = next;
    setLeaving(true);
  };

  useEffect(() => {
    if (!leaving) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => {
      const next = pendingStep.current;
      pendingStep.current = null;
      if (next === "modules") setSearch("");
      if (next) setStep(next);
      setLeaving(false);
      window.scrollTo(0, 0);
    }, reduceMotion ? 0 : 240);
    return () => window.clearTimeout(timeout);
  }, [leaving]);

  const continueToModules = () => {
    if (cart.packageId == null) return;
    goToStep("modules");
  };

  const openStep = (next: ShopStep) => {
    const nextIndex = STEPS.findIndex((item) => item.id === next);
    if (nextIndex >= stepIndex) return;
    goToStep(next);
  };

  const signOut = async () => {
    localStorage.removeItem("algory_user");
    clearPackageAccess();
    await axios.post("/api/auth/logout", undefined, { withCredentials: true }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  };

  if (session.isLoading || (session.data && session.data.decision !== "REQUIRE_PURCHASE")) {
    return (
      <div className="shop-store grid min-h-dvh place-items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <div className="shop-store min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-[#ececea] bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-12 items-center justify-between md:h-14">
            <BrandLogo size="sm" priority />
            <Button variant="ghost" size="sm" className="text-[#8a8a86]" onClick={() => void signOut()}>
              Çıkış
            </Button>
          </div>
          <nav className="relative border-t border-[#ececea] py-3" aria-label="Satın alma adımları">
            <span className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[25px] h-px bg-[#e4e4e1]" aria-hidden />
            <span
              className="pointer-events-none absolute left-[16.67%] top-[25px] h-px bg-zinc-900"
              style={{ width: stepIndex === 0 ? "0%" : stepIndex === 1 ? "33.33%" : "66.67%" }}
              aria-hidden
            />
            <ol className="grid grid-cols-3">
              {STEPS.map((item, index) => {
                const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "upcoming";
                return (
                  <li key={item.id} className="flex justify-center">
                    <button
                      type="button"
                      disabled={state !== "done"}
                      onClick={() => openStep(item.id)}
                      className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2 disabled:cursor-default"
                      aria-current={state === "current" ? "step" : undefined}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                          state === "upcoming"
                            ? "border border-[#d4d4d0] bg-white text-[#8a8a86]"
                            : "bg-zinc-900 text-white",
                        )}
                      >
                        {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          state === "upcoming" ? "text-[#8a8a86]" : "font-medium text-zinc-900",
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </header>

      <main
        className={cn(
          "shop-step mx-auto max-w-5xl px-4 py-8 sm:px-6",
          leaving && "is-leaving",
          step === "package" && "pb-28",
          step === "modules" && "pb-28 lg:pb-8",
        )}
      >
        {step === "package" ? (
          <section>
            <p className="text-sm text-zinc-900">{NO_PACKAGE_NOTICE}</p>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a86]">Adım 1 / 3</p>
                <h1 className={cn(DASHBOARD_TYPE_TITLE, "mt-1")}>Paket seçimi</h1>
                <p className={cn(DASHBOARD_TYPE_HINT, "mt-1")}>
                  Paketleri karşılaştırın. Devam etmek için bir paket seçin.
                </p>
              </div>
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <Tabs
                  value={cart.billingPeriod}
                  onValueChange={(value) => setBillingPeriod(value === "YEARLY" ? "YEARLY" : "MONTHLY")}
                >
                  <TabsList>
                    <TabsTrigger value="MONTHLY">Aylık</TabsTrigger>
                    <TabsTrigger value="YEARLY">Yıllık</TabsTrigger>
                  </TabsList>
                </Tabs>
                {selectedPricing?.yearlySavings != null && selectedPricing.yearlySavings > 0 ? (
                  <p className="text-xs text-[#8a8a86]">
                    {formatYearlySavingsLabel(selectedPricing.yearlySavings, selectedPackage?.currency)}
                  </p>
                ) : null}
              </div>
            </div>

            {packagesQuery.isLoading || !hydrated ? (
              <Skeleton className="mt-6 h-72 w-full" />
            ) : packages.length === 0 ? (
              <p className={cn(DASHBOARD_TYPE_HINT, "mt-6")}>Seçilebilecek paket bulunamadı.</p>
            ) : (
              <>
              <div className="mt-6 md:hidden">
                <div className={cn(ACCOUNT_CARD, "grid grid-cols-3 divide-x divide-[#ececea]")}>
                  {packages.map((pkg) => {
                    const selected = pkg.id === cart.packageId;
                    const packagePrice = resolvePackagePricing(pkg, cart.billingPeriod);
                    const yearlyMissing = cart.billingPeriod === "YEARLY" && packagePrice.amount <= 0;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        disabled={yearlyMissing}
                        onClick={() => pickPackage(pkg.id)}
                        className={cn(
                          "min-w-0 px-2.5 py-3 text-left",
                          selected && "bg-[#fafafa] shadow-[inset_0_-2px_0_0_#18181b]",
                          yearlyMissing && "cursor-default opacity-60",
                        )}
                      >
                        <span className="line-clamp-2 min-h-8 text-xs font-medium leading-4 text-zinc-900">
                          {pkg.name}
                        </span>
                        {yearlyMissing ? (
                          <span className="mt-2 block text-xs text-[#8a8a86]">Yıllık yok</span>
                        ) : (
                          <span className="mt-2 block text-sm font-semibold tabular-nums text-zinc-900">
                            {formatCartMoney(packagePrice.amount, pkg.currency)}
                            <span className="mt-0.5 block text-[11px] font-normal text-[#8a8a86]">
                              {packagePrice.suffix}
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedPackage ? (
                  <div className={cn(ACCOUNT_CARD, "mt-3 p-4")}>
                    {selectedPackage.description ? (
                      <p className="text-sm text-[#8a8a86]">{selectedPackage.description}</p>
                    ) : null}
                    <ul className="mt-3 space-y-2">
                      {(selectedPackage.items ?? []).map((item) => (
                        <li key={item.productCode} className="flex items-start gap-2 text-sm text-zinc-900">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                          {item.productName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className={cn(DASHBOARD_TYPE_HINT, "mt-3")}>Fiyatı görüp bir paket seçin.</p>
                )}
              </div>
              <div className={cn(ACCOUNT_CARD, "mt-6 hidden overflow-x-auto md:block")}>
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <caption className="sr-only">Paket karşılaştırması</caption>
                  <thead>
                    <tr className="border-b border-[#ececea]">
                      <th className="sticky left-0 z-10 bg-white p-4 text-left align-bottom">
                        <span className={ACCOUNT_MENU_LABEL}>İçerik</span>
                      </th>
                      {packages.map((pkg) => {
                        const selected = pkg.id === cart.packageId;
                        const packagePrice = resolvePackagePricing(pkg, cart.billingPeriod);
                        const yearlyMissing = cart.billingPeriod === "YEARLY" && packagePrice.amount <= 0;
                        return (
                          <th
                            key={pkg.id}
                            scope="col"
                            className={cn("w-[28%] p-4 text-left align-top", selected && "bg-[#fafafa]")}
                          >
                            <p className="text-base font-semibold text-zinc-900">{pkg.name}</p>
                            {pkg.description ? (
                              <p className="mt-1 min-h-10 text-xs font-normal leading-5 text-[#8a8a86]">
                                {pkg.description}
                              </p>
                            ) : (
                              <p className="mt-1 min-h-10" />
                            )}
                            {yearlyMissing ? (
                              <p className="mt-3 text-sm text-[#8a8a86]">Yıllık fiyat yok</p>
                            ) : (
                              <p className="mt-3 text-lg font-semibold tabular-nums text-zinc-900">
                                {formatCartMoney(packagePrice.amount, pkg.currency)}
                                <span className="ml-1 text-xs font-normal text-[#8a8a86]">{packagePrice.suffix}</span>
                              </p>
                            )}
                            {!yearlyMissing && packagePrice.compareAmount != null ? (
                              <p className="text-xs tabular-nums text-[#8a8a86] line-through">
                                {formatCartMoney(packagePrice.compareAmount, pkg.currency)}
                              </p>
                            ) : null}
                            <Button
                              className="mt-3"
                              size="sm"
                              variant={selected && !yearlyMissing ? "hero" : "outline"}
                              disabled={yearlyMissing}
                              onClick={() => pickPackage(pkg.id)}
                            >
                              {yearlyMissing ? "Yıllık yok" : selected ? "Seçili" : "Seç"}
                            </Button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.code} className="border-b border-[#ececea] last:border-b-0">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-sm font-normal text-zinc-900"
                        >
                          {row.label}
                        </th>
                        {packages.map((pkg) => {
                          const selected = pkg.id === cart.packageId;
                          const included = (pkg.items ?? []).some((item) => item.productCode === row.code);
                          return (
                            <td
                              key={pkg.id}
                              className={cn("px-4 py-3 text-center", selected && "bg-[#fafafa]")}
                            >
                              {included ? (
                                <Check className="mx-auto h-4 w-4 text-zinc-900" aria-label="Dahil" />
                              ) : (
                                <span className="text-[#c4c4c0]" aria-label="Dahil değil">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ececea] bg-white">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  {selectedPackage && selectedPricing ? (
                    <>
                      <p className="truncate text-sm font-medium text-zinc-900">{selectedPackage.name}</p>
                      <p className="text-sm tabular-nums text-[#8a8a86]">
                        {cart.billingPeriod === "YEARLY" && selectedPricing.amount <= 0
                          ? "Bu paket için yıllık fiyat yok"
                          : `${formatCartMoney(selectedPricing.amount, selectedPackage.currency)} ${selectedPricing.suffix}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#8a8a86]">Devam etmek için bir paket seçin.</p>
                  )}
                </div>
                <Button
                  variant="hero"
                  disabled={
                    !selectedPackage ||
                    !selectedPricing ||
                    (cart.billingPeriod === "YEARLY" && selectedPricing.amount <= 0)
                  }
                  onClick={continueToModules}
                >
                  Devam
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {step === "modules" && (packagesQuery.isLoading || !hydrated) ? (
          <Skeleton className="h-64 w-full" />
        ) : null}

        {step === "modules" && hydrated && !packagesQuery.isLoading && selectedPackage ? (
          <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm text-[#8a8a86] hover:text-zinc-900"
                onClick={() => openStep("package")}
              >
                <ArrowLeft className="h-4 w-4" />
                Geri
              </button>
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a86]">Adım 2 / 3</p>
                <h1 className={cn(DASHBOARD_TYPE_TITLE, "mt-1")}>Modül seçimi</h1>
                <p className={cn(DASHBOARD_TYPE_HINT, "mt-1")}>
                  {selectedPackage.name} paketine eklenecek modülleri belirleyin. Modül eklemeden de devam edebilirsiniz.
                </p>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8a86]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Modül adı veya kodu"
                  className="bg-white pl-9"
                  aria-label="Modül ara"
                />
              </div>
              {visibleModules.length === 0 ? (
                <p className={cn(DASHBOARD_TYPE_HINT, "mt-6")}>
                  {modules.length === 0
                    ? "Bu paket için eklenebilecek modül bulunmuyor."
                    : "Aramanızla eşleşen modül yok."}
                </p>
              ) : (
                <ul className={cn(ACCOUNT_CARD, "mt-4 divide-y divide-[#ececea]")}>
                  {visibleModules.map((module) => {
                    const quantity = moduleQuantity(module.productCode);
                    return (
                      <li
                        key={module.productCode}
                        className={cn(
                          "flex flex-col gap-3 p-4 sm:flex-row sm:items-center",
                          quantity > 0 && "bg-[#fafafa]",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-medium text-zinc-900">{module.productName}</h2>
                            {includedCodes.has(module.productCode) ? (
                              <Badge variant="secondary" className="font-normal">
                                Pakette var
                              </Badge>
                            ) : null}
                          </div>
                          {module.description ? (
                            <p className="mt-1 text-sm text-[#8a8a86]">{module.description}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-zinc-900">
                          {formatCartMoney(moduleUnitLabel(module), pricing.currency)}
                          <span className="ml-1 text-xs font-normal text-[#8a8a86]">
                            {module.billingType === "ONE_TIME" ? "tek seferlik" : "/ ay"}
                          </span>
                        </p>
                        {quantity <= 0 ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => addModule(module.productCode)}>
                            Ekle
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Adet azalt"
                              onClick={() => setModuleQuantity(module.productCode, quantity - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm tabular-nums">{quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Adet artır"
                              disabled={quantity >= MAX_MODULE_QUANTITY}
                              onClick={() => setModuleQuantity(module.productCode, quantity + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <aside className="hidden lg:block">
              <div className={cn(ACCOUNT_CARD, "sticky top-20 p-4")}>
                <p className={ACCOUNT_MENU_LABEL}>Sepet</p>
                <CartLines
                  packageName={selectedPackage.name}
                  billingPeriod={cart.billingPeriod}
                  pricing={pricing}
                />
                <div className="mt-3 flex items-end justify-between border-t border-[#ececea] pt-3">
                  <span className="text-sm text-[#8a8a86]">Toplam</span>
                  <span className="text-lg font-semibold tabular-nums text-zinc-900">
                    {formatCartMoney(pricing.grandTotal, pricing.currency)}
                    <span className="ml-1 text-xs font-normal text-[#8a8a86]">{pricing.suffix}</span>
                  </span>
                </div>
                <Button className="mt-4 w-full" variant="hero" onClick={() => goToStep("pay")}>
                  Devam
                </Button>
              </div>
            </aside>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ececea] bg-white lg:hidden">
              <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={cartOpen}
                  aria-label="Sepeti aç"
                  onClick={() => setCartOpen(true)}
                >
                  <ChevronUp className="h-4 w-4 shrink-0 text-[#8a8a86]" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-[#8a8a86]">
                      {selectedPackage.name}
                      {pricing.lines.length > 0 ? ` + ${pricing.lines.length} modül` : ""}
                    </span>
                    <span className="block text-base font-semibold tabular-nums text-zinc-900">
                      {formatCartMoney(pricing.grandTotal, pricing.currency)}
                      <span className="ml-1 text-xs font-normal text-[#8a8a86]">{pricing.suffix}</span>
                    </span>
                  </span>
                </button>
                <Button variant="hero" size="sm" onClick={() => goToStep("pay")}>
                  Devam
                </Button>
              </div>
            </div>

            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetContent side="bottom" className="shop-store max-h-[85vh] overflow-y-auto rounded-t-2xl border-[#ececea] bg-white px-4 pb-6 sm:px-6">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-base">Sepet</SheetTitle>
                  <SheetDescription>
                    {selectedPackage.name}
                    {pricing.lines.length > 0 ? ` ve ${pricing.lines.length} modül` : ""}
                  </SheetDescription>
                </SheetHeader>
                <CartLines
                  packageName={selectedPackage.name}
                  billingPeriod={cart.billingPeriod}
                  pricing={pricing}
                />
                <div className="mt-2 flex items-end justify-between border-t border-[#ececea] pt-3">
                  <span className="text-sm text-[#8a8a86]">Toplam</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCartMoney(pricing.grandTotal, pricing.currency)}
                    <span className="ml-1 text-xs font-normal text-[#8a8a86]">{pricing.suffix}</span>
                  </span>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="hero"
                  onClick={() => goToStep("pay")}
                >
                  Devam
                </Button>
              </SheetContent>
            </Sheet>
          </section>
        ) : null}

        {step === "modules" && hydrated && !packagesQuery.isLoading && !selectedPackage ? (
          <section>
            <p className={DASHBOARD_TYPE_HINT}>Modülleri görmek için önce bir paket seçin.</p>
            <Button className="mt-4" variant="outline" onClick={() => openStep("package")}>
              Geri
            </Button>
          </section>
        ) : null}

        {step === "pay" ? (
          <ShopCheckout onBack={() => openStep(selectedPackage ? "modules" : "package")} />
        ) : null}
      </main>
    </div>
  );
}
