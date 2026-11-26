"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Loader2, Lock } from "lucide-react";

import BillingAddressForm from "@/components/dashboard/commerce/BillingAddressForm";
import { CardVerificationPanel } from "@/components/dashboard/CardVerificationPanel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  invalidateBillingAddresses,
  invalidatePaymentMethods,
  useBillingAddresses,
  usePaymentMethods,
} from "@/hooks/use-commerce";
import { invalidatePackageUsage } from "@/hooks/use-package-usage";
import { usePurchaseFulfillment } from "@/hooks/use-purchase-fulfillment";
import { useActivePackages } from "@/hooks/use-subscription";
import { toast } from "@/hooks/use-toast";
import { SHOP_PATH } from "@/lib/access-session-gate";
import { ApiError } from "@/lib/api";
import {
  buildBillingAddressPayload,
  checkoutSchema,
  displayBillingName,
  resolveIdentityNumber,
  type BillingAddress,
  type BillingAddressForm as BillingAddressFormValues,
} from "@/lib/commerce";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { ACCOUNT_CARD, ACCOUNT_MENU_LABEL, DASHBOARD_TYPE_TITLE } from "@/lib/dashboard-surface";
import { buildPurchaseCart, cartPricing, formatCartMoney, usePackageCart } from "@/lib/package-cart";
import { isPackageVisibleInCatalog } from "@/lib/package-display";
import {
  clearPendingPurchaseId,
  storePendingPurchaseId,
  type PurchaseInitiateResponse,
} from "@/lib/purchase-fulfillment";
import { refreshAccessAfterEntitlementChange } from "@/lib/refresh-access";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { cn } from "@/lib/utils";

type CouponPreview = {
  code: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  expiresAt: string;
  usable: boolean;
};

function couponQuote(baseAmount: number, preview: CouponPreview): { discount: number } | null {
  if (!preview.usable) return null;
  const discount =
    preview.discountType === "PERCENT"
      ? Math.round(baseAmount * Number(preview.discountValue)) / 100
      : Number(preview.discountValue);
  if (discount <= 0 || baseAmount - discount < 0.01) return null;
  return { discount };
}

export default function ShopCheckout({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const packages = useActivePackages();
  const addresses = useBillingAddresses();
  const cards = usePaymentMethods({ refetchOnWindowFocus: true });
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const { cart, hydrated, setBillingPeriod, clear } = usePackageCart();
  const [recurringConsent, setRecurringConsent] = useState(false);
  const [billingAddressId, setBillingAddressId] = useState<number | null>(null);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const finalizedPurchaseId = useRef<number | null>(null);
  const addressInitialized = useRef(false);
  const selectedCardId = paymentMethodId ?? cards.data?.[0]?.id ?? null;
  const fulfillment = usePurchaseFulfillment(purchaseId, pollStartedAt);

  const pkg = useMemo(() => {
    if (cart.packageId == null || cart.intent !== "NEW_PACKAGE") return undefined;
    const found = packages.data?.find((item) => item.id === cart.packageId);
    if (!found || !isPackageVisibleInCatalog(found)) return undefined;
    return found;
  }, [packages.data, cart.packageId, cart.intent]);

  const pricing = useMemo(
    () => cartPricing(pkg, cart.modules, cart.billingPeriod, true),
    [pkg, cart.modules, cart.billingPeriod],
  );

  const couponPricing = useMemo(() => {
    if (!appliedCoupon) return null;
    return couponQuote(pricing.basePrice, appliedCoupon);
  }, [appliedCoupon, pricing.basePrice]);

  const payableAmount = Math.round((pricing.grandTotal - (couponPricing?.discount ?? 0)) * 100) / 100;
  const payableLabel = formatCartMoney(payableAmount, pricing.currency);

  useEffect(() => {
    if (!addressInitialized.current && addresses.data?.length) {
      addressInitialized.current = true;
      setBillingAddressId((addresses.data.find((item) => item.defaultAddress) ?? addresses.data[0]).id);
    }
  }, [addresses.data]);

  // A card saved a moment ago (returning from PayTR) is not in the cached list yet.
  useEffect(() => {
    void invalidatePaymentMethods(queryClient);
  }, [queryClient]);

  const finalizeSuccess = useCallback(async () => {
    clear();
    await refreshAccessAfterEntitlementChange(queryClient);
    await invalidatePackageUsage(queryClient);
    toast({ title: "Ödeme tamamlandı", description: "Paketiniz aktif edildi.", variant: "success" });
    router.push(DASHBOARD_ROUTES.root);
    router.refresh();
  }, [clear, queryClient, router]);

  useEffect(() => {
    const summary = fulfillment.summary.data;
    if (!summary || finalizedPurchaseId.current === summary.purchaseId) return;
    if (summary.status === "ACTIVE") {
      finalizedPurchaseId.current = summary.purchaseId;
      clearPendingPurchaseId();
      void finalizeSuccess();
    }
    if (summary.status === "FAILED" || summary.status === "CANCELLED") {
      finalizedPurchaseId.current = summary.purchaseId;
      clearPendingPurchaseId();
      setPurchaseId(null);
      setPollStartedAt(null);
      toast({
        title: "Ödeme tamamlanamadı",
        description: "Kartınızdan ödeme alınamadı. Başka bir kart seçip tekrar deneyin.",
        variant: "destructive",
      });
    }
  }, [finalizeSuccess, fulfillment.summary.data]);

  const createAddress = async (values: BillingAddressFormValues) => {
    try {
      const response = await getSiteSameOriginAxios().post<BillingAddress>(
        "/account/billing-addresses",
        buildBillingAddressPayload(values),
      );
      await invalidateBillingAddresses(queryClient);
      if (response.data?.id) setBillingAddressId(response.data.id);
      setCreatingAddress(false);
      toast({ title: "Fatura adresi kaydedildi", variant: "success" });
    } catch (error) {
      toast({
        title: "Adres kaydedilemedi",
        description: error instanceof ApiError ? error.message : "Fatura adresi kaydedilemedi.",
        variant: "destructive",
      });
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (code.length < 4) {
      setCouponError("Kupon kodu girin");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      const response = await getSiteSameOriginAxios().get<CouponPreview>(
        `/coupons/${encodeURIComponent(code)}`,
      );
      const preview = response.data;
      if (!preview.usable || couponQuote(pricing.basePrice, preview) == null) {
        setAppliedCoupon(null);
        setCouponError("Kupon bu pakete uygulanamıyor");
        return;
      }
      setAppliedCoupon(preview);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof ApiError ? error.message : "Kupon doğrulanamadı");
    } finally {
      setCouponBusy(false);
    }
  };

  const pay = async () => {
    if (!pkg) return;
    const checkout = checkoutSchema.safeParse({
      billingPeriod: cart.billingPeriod,
      billingAddressId,
      paymentMethodId: selectedCardId ?? "",
      recurringConsent,
    });
    if (!checkout.success) {
      toast({
        title: "Ödeme seçimlerini kontrol edin",
        description: checkout.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }

    const selectedAddress = addresses.data?.find((item) => item.id === billingAddressId);
    setIsPaying(true);
    try {
      const identityNumber = resolveIdentityNumber(selectedAddress?.tckn, selectedAddress?.vkn);
      const purchaseCart = buildPurchaseCart(pkg, cart.billingPeriod, pricing.lines);
      const response = await getSiteSameOriginAxios().post<PurchaseInitiateResponse>("/purchases", {
        packageId: pkg.id,
        paymentMode: "DIRECT",
        paymentMethodId: selectedCardId,
        paymentStyle: "SUBSCRIPTION",
        billingPeriod: cart.billingPeriod,
        billingAddressId,
        identityNumber,
        recurringConsent,
        modules: purchaseCart.modules.map((line) => ({
          productCode: line.productCode,
          quantity: line.quantity,
        })),
        cart: purchaseCart,
        ...(appliedCoupon?.code && couponPricing ? { couponCode: appliedCoupon.code } : {}),
      });
      if (!Number.isSafeInteger(response.data.purchaseId) || response.data.purchaseId <= 0) {
        throw new Error("Satın alım kimliği alınamadı.");
      }
      storePendingPurchaseId(response.data.purchaseId);
      setPurchaseId(response.data.purchaseId);
      setPollStartedAt(Date.now());
    } catch (error) {
      toast({
        title: "Ödeme alınamadı",
        description: error instanceof ApiError ? error.message : "Ödeme işlemi tamamlanamadı.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (!hydrated || packages.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pkg) {
    return (
      <div className={cn(ACCOUNT_CARD, "p-6")}>
        <p className="text-sm text-muted-foreground">Sepette satın alınabilir bir paket yok.</p>
        <Button className="mt-4" variant="outline" onClick={onBack}>
          Paket seç
        </Button>
      </div>
    );
  }

  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + (cart.billingPeriod === "YEARLY" ? 12 : 1));
  const nextDueLabel = nextDue.toLocaleDateString("tr-TR");
  const verifying = purchaseId != null && fulfillment.summary.data?.status === "PENDING";
  const canPay = !isPaying && !verifying && selectedCardId != null && recurringConsent && billingAddressId != null;

  return (
    <div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm text-[#8a8a86] hover:text-zinc-900"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Geri
      </button>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a86]">Adım 3 / 3</p>
      <h1 className={cn(DASHBOARD_TYPE_TITLE, "mt-1")}>Ödeme</h1>
      <p className="mt-1 text-sm text-[#8a8a86]">Ödeme kayıtlı kartınızdan alınır; paketiniz her dönem sonunda aynı karttan yenilenir.</p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className={cn(ACCOUNT_CARD, "divide-y divide-[#ececea]")}>
          <section className="p-4 sm:p-5">
            <p className={ACCOUNT_MENU_LABEL}>Dönem</p>
            <Tabs
              className="mt-3"
              value={cart.billingPeriod}
              onValueChange={(value) => setBillingPeriod(value === "YEARLY" ? "YEARLY" : "MONTHLY")}
            >
              <TabsList>
                <TabsTrigger value="MONTHLY">Aylık</TabsTrigger>
                <TabsTrigger value="YEARLY">Yıllık</TabsTrigger>
              </TabsList>
            </Tabs>
          </section>

          <section className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className={ACCOUNT_MENU_LABEL}>Fatura adresi</p>
              <Button variant="ghost" size="sm" onClick={() => setCreatingAddress((value) => !value)}>
                Yeni adres
              </Button>
            </div>
            <div className="mt-3">
              {creatingAddress ? (
                <BillingAddressForm onSubmit={createAddress} />
              ) : addresses.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : addresses.data?.length ? (
                <select
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={billingAddressId ? String(billingAddressId) : ""}
                  onChange={(event) => setBillingAddressId(Number(event.target.value))}
                >
                  <option value="" disabled>
                    Fatura adresi seçin
                  </option>
                  {addresses.data.map((address) => (
                    <option key={address.id} value={address.id}>
                      {displayBillingName(address)} · {address.city}
                      {address.defaultAddress ? " · Aktif" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setCreatingAddress(true)}>
                  Fatura adresi oluştur
                </Button>
              )}
            </div>
          </section>

          <section className="p-4 sm:p-5">
            <p className={ACCOUNT_MENU_LABEL}>Kart</p>
            <div className="mt-3">
              {cards.isLoading ? (
                <Skeleton className="h-14 w-full" />
              ) : cards.data?.length ? (
                <div className="space-y-2" role="radiogroup" aria-label="Ödeme kartı">
                  {cards.data.map((card) => {
                    const active = card.id === selectedCardId;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPaymentMethodId(card.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
                          active ? "border-zinc-900 ring-1 ring-zinc-900" : "border-[#e5e5e3] hover:border-zinc-400",
                        )}
                      >
                        <CreditCard className="h-5 w-5 shrink-0 text-[#8a8a86]" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900">
                            {card.cardAlias || card.brand || "Kart"} •••• {card.lastFour}
                          </span>
                          {card.expiryMonth && card.expiryYear ? (
                            <span className="block text-xs text-[#8a8a86]">
                              Son kullanma {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "h-4 w-4 shrink-0 rounded-full border",
                            active ? "border-[5px] border-zinc-900" : "border-[#c8c8c5]",
                          )}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <CardVerificationPanel
                  title="Ödeme için kart ekleyin"
                  description="Kartınız PayTR'de güvenle saklanır. 1 TL doğrulama çekilip hemen iade edilir; ardından bu ekrana dönüp ödemeyi tamamlarsınız."
                  returnPath={`${SHOP_PATH}?adim=odeme`}
                />
              )}
            </div>
          </section>

          <section className="p-4 sm:p-5">
            <p className={ACCOUNT_MENU_LABEL}>Kupon</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                value={couponInput}
                onChange={(event) => {
                  setCouponInput(event.target.value.toUpperCase());
                  setCouponError(null);
                }}
                placeholder="Kupon kodu"
                maxLength={32}
                className="max-w-xs bg-white uppercase"
                autoComplete="off"
              />
              <Button type="button" variant="outline" disabled={couponBusy} onClick={() => void applyCoupon()}>
                {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uygula"}
              </Button>
            </div>
            {couponError ? <p className="mt-2 text-sm text-destructive">{couponError}</p> : null}
          </section>

          <section className="p-4 sm:p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={recurringConsent}
                onCheckedChange={(checked) => setRecurringConsent(checked === true)}
              />
              <span className="text-sm text-zinc-900">
                Düzenli ödeme için onay veriyorum.
                <span className="mt-1 block text-xs text-[#8a8a86]">
                  Paketim her dönem sonunda seçtiğim kayıtlı karttan otomatik olarak yenilenir. İlk yenileme{" "}
                  {nextDueLabel}, tutar {formatCartMoney(pricing.recurringPrice, pricing.currency)}. Aboneliği
                  istediğim zaman iptal edebilirim.
                </span>
              </span>
            </label>
            <Button
              className="mt-5 w-full gap-2 lg:hidden"
              variant="hero"
              disabled={!canPay}
              onClick={() => void pay()}
            >
              {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {isPaying ? "Ödeme işleniyor…" : `Ödemeyi tamamla · ${payableLabel}`}
            </Button>
            {verifying ? (
              <p className="mt-2 text-center text-xs text-[#8a8a86] lg:hidden">Ödeme sonucu doğrulanıyor…</p>
            ) : null}
          </section>
        </div>

        <aside className={cn(ACCOUNT_CARD, "order-first p-4 lg:sticky lg:top-20 lg:order-none")}>
          <p className={ACCOUNT_MENU_LABEL}>Sepet</p>
          <ul className="divide-y divide-[#ececea]">
            <li className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">{pkg.name}</p>
                <p className="text-xs text-[#8a8a86]">
                  {cart.billingPeriod === "YEARLY" ? "Yıllık paket" : "Aylık paket"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {formatCartMoney(pricing.basePrice, pricing.currency)}
              </p>
            </li>
            {pricing.lines.map((line) => (
              <li key={line.productCode} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{line.productName}</p>
                  <p className="text-xs text-[#8a8a86]">
                    {line.quantity} × {formatCartMoney(line.unitPrice, pricing.currency)} + KDV
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatCartMoney(line.lineTotal, pricing.currency)}
                </p>
              </li>
            ))}
          </ul>
          {couponPricing ? (
            <div className="flex items-center justify-between pt-3 text-sm text-emerald-700">
              <span>{appliedCoupon?.code}</span>
              <span>−{formatCartMoney(couponPricing.discount, pricing.currency)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-end justify-between border-t border-[#ececea] pt-3">
            <span className="text-sm text-[#8a8a86]">Toplam</span>
            <span className="text-lg font-semibold tabular-nums text-zinc-900">
              {payableLabel}
              <span className="ml-1 text-xs font-normal text-[#8a8a86]">{pricing.suffix}</span>
            </span>
          </div>
          <Button
            className="mt-4 hidden w-full gap-2 lg:inline-flex"
            variant="hero"
            disabled={!canPay}
            onClick={() => void pay()}
          >
            {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {isPaying ? "Ödeme işleniyor…" : "Ödemeyi tamamla"}
          </Button>
          {verifying ? (
            <p className="mt-2 text-center text-xs text-[#8a8a86]">Ödeme sonucu doğrulanıyor…</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
