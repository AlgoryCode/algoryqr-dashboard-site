"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Loader2, Lock, ShieldCheck, ShoppingCart } from "lucide-react";

import BillingAddressForm from "@/components/dashboard/commerce/BillingAddressForm";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { invalidateBillingAddresses, useBillingAddresses } from "@/hooks/use-commerce";
import { invalidatePackageUsage } from "@/hooks/use-package-usage";
import { useActivePackages } from "@/hooks/use-subscription";
import { usePurchaseFulfillment } from "@/hooks/use-purchase-fulfillment";
import { ApiError } from "@/lib/api";
import { refreshAccessAfterEntitlementChange } from "@/lib/refresh-access";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import {
  checkoutSchema,
  displayBillingName,
  buildBillingAddressPayload,
  resolveIdentityNumber,
  type BillingAddress,
  type BillingAddressForm as BillingAddressFormValues,
} from "@/lib/commerce";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cartPricing, formatCartMoney, usePackageCart } from "@/lib/package-cart";
import { isPackageVisibleInCatalog } from "@/lib/package-display";
import {
  abandonPendingPaymentAttempt,
  clearPendingPurchaseId,
  storePendingPurchaseId,
  type PurchaseInitiateResponse,
} from "@/lib/purchase-fulfillment";
import PaymentCheckoutOverlay, {
  type PaymentCheckoutOverlayContent,
} from "@/components/dashboard/PaymentCheckoutOverlay";
import { isPaytrCheckout, paytrCheckoutHtml } from "@/lib/paytr-checkout";
import { cn } from "@/lib/utils";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";

interface CartCheckoutViewProps {
  onNotify: (type: "info" | "warning" | "danger", message: string) => void;
  returnHref?: string;
}

type CouponPreview = {
  code: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  expiresAt: string;
  usable: boolean;
};

/** Kupon yalnızca paket taban fiyatına uygulanır; backend CartPricingService ile aynı kural. */
function couponQuote(baseAmount: number, preview: CouponPreview): { discount: number } | null {
  if (!preview.usable) return null;
  const discount =
    preview.discountType === "PERCENT"
      ? Math.round(baseAmount * Number(preview.discountValue)) / 100
      : Number(preview.discountValue);
  if (discount <= 0 || baseAmount - discount < 0.01) return null;
  return { discount };
}

export default function CartCheckoutView({
  onNotify,
  returnHref = DASHBOARD_ROUTES.accountSubscription,
}: CartCheckoutViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const packages = useActivePackages();
  const addresses = useBillingAddresses();
  const { cart, hydrated, setBillingPeriod, clear } = usePackageCart();
  const [recurringConsent, setRecurringConsent] = useState(false);
  const [billingAddressId, setBillingAddressId] = useState<number | null>(null);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [paymentOverlay, setPaymentOverlay] = useState<PaymentCheckoutOverlayContent | null>(null);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const finalizedPurchaseId = useRef<number | null>(null);
  const addressInitialized = useRef(false);
  const fulfillment = usePurchaseFulfillment(purchaseId, pollStartedAt);

  const pkg = useMemo(() => {
    if (cart.packageId == null) return undefined;
    const found = packages.data?.find((item) => item.id === cart.packageId);
    if (!found) return undefined;
    if (cart.intent === "ADDON") return found;
    return isPackageVisibleInCatalog(found) ? found : undefined;
  }, [packages.data, cart.packageId, cart.intent]);

  const addonMode = cart.intent === "ADDON";

  const pricing = useMemo(
    () => cartPricing(pkg, cart.modules, cart.billingPeriod, !addonMode),
    [pkg, cart.modules, cart.billingPeriod, addonMode],
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

  useEffect(() => {
    if (addresses.isError) {
      onNotify(
        "danger",
        addresses.error instanceof ApiError ? addresses.error.message : "Fatura adresleri yüklenemedi.",
      );
    }
  }, [addresses.error, addresses.isError, onNotify]);

  const finalizeSuccess = useCallback(async () => {
    clear();
    await refreshAccessAfterEntitlementChange(queryClient);
    await invalidatePackageUsage(queryClient);
    onNotify("info", "Ödeme tamamlandı ve paketiniz aktif edildi.");
    router.push(returnHref);
  }, [clear, onNotify, queryClient, returnHref, router]);

  useEffect(() => {
    const summary = fulfillment.summary.data;
    if (!summary || finalizedPurchaseId.current === summary.purchaseId) return;
    if (summary.status === "ACTIVE") {
      finalizedPurchaseId.current = summary.purchaseId;
      clearPendingPurchaseId();
      setPaymentOverlay(null);
      void finalizeSuccess();
    }
    if (summary.status === "FAILED" || summary.status === "CANCELLED") {
      finalizedPurchaseId.current = summary.purchaseId;
      clearPendingPurchaseId();
      setPaymentOverlay(null);
      setPurchaseId(null);
      setPollStartedAt(null);
      onNotify("danger", "Ödeme tamamlanamadı. Lütfen kart bilgilerinizi kontrol edip tekrar deneyin.");
    }
  }, [finalizeSuccess, fulfillment.summary.data, onNotify]);

  const cancelPaymentOverlay = () => {
    setPaymentOverlay(null);
    setPurchaseId(null);
    setPollStartedAt(null);
    finalizedPurchaseId.current = null;
    void abandonPendingPaymentAttempt({ cancelIfPending: true });
  };

  const createAddress = async (values: BillingAddressFormValues) => {
    try {
      const response = await getSiteSameOriginAxios().post<BillingAddress>(
        "/account/billing-addresses",
        buildBillingAddressPayload(values),
      );
      await invalidateBillingAddresses(queryClient);
      if (response.data?.id) setBillingAddressId(response.data.id);
      setCreatingAddress(false);
      onNotify("info", "Fatura adresiniz kaydedildi.");
    } catch (error) {
      onNotify("danger", error instanceof ApiError ? error.message : "Fatura adresi kaydedilemedi.");
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
      if (!preview.usable) {
        setAppliedCoupon(null);
        setCouponError("Kupon kullanilamaz");
        return;
      }
      if (couponQuote(pricing.basePrice, preview) == null) {
        setAppliedCoupon(null);
        setCouponError("Kupon bu paket tutarina uygulanamaz");
        return;
      }
      setAppliedCoupon(preview);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof ApiError ? error.message : "Kupon dogrulanamadi");
    } finally {
      setCouponBusy(false);
    }
  };

  const pay = async () => {
    if (!pkg) return;
    if (addonMode && pricing.lines.length === 0) {
      onNotify("warning", "Sepete en az bir modül ekleyin.");
      return;
    }
    const checkout = checkoutSchema.safeParse({
      billingPeriod: cart.billingPeriod,
      billingAddressId,
      recurringConsent: addonMode ? true : recurringConsent,
    });
    if (!checkout.success) {
      onNotify("warning", checkout.error.issues[0]?.message ?? "Ödeme seçimlerini kontrol edin.");
      return;
    }

    const selectedAddress = addresses.data?.find((item) => item.id === billingAddressId);

    setIsPaying(true);
    try {
      const identityNumber = resolveIdentityNumber(selectedAddress?.tckn, selectedAddress?.vkn);
      const response = addonMode
        ? await getSiteSameOriginAxios().post<PurchaseInitiateResponse>("/purchases/addons/cart", {
            billingAddressId,
            identityNumber,
            modules: pricing.lines.map((line) => ({
              productCode: line.productCode,
              quantity: line.quantity,
            })),
          })
        : await getSiteSameOriginAxios().post<PurchaseInitiateResponse>("/purchases", {
            packageId: pkg.id,
            paymentMode: "CHECKOUT_FORM",
            paymentStyle: "SUBSCRIPTION",
            billingPeriod: cart.billingPeriod,
            billingAddressId,
            identityNumber,
            recurringConsent,
            modules: pricing.lines.map((line) => ({
              productCode: line.productCode,
              quantity: line.quantity,
            })),
            ...(appliedCoupon?.code && couponPricing ? { couponCode: appliedCoupon.code } : {}),
          });
      if (!Number.isSafeInteger(response.data.purchaseId) || response.data.purchaseId <= 0) {
        throw new Error("Satın alım kimliği alınamadı.");
      }
      storePendingPurchaseId(response.data.purchaseId);
      setPurchaseId(response.data.purchaseId);
      setPollStartedAt(Date.now());
      if (response.data.paymentPageUrl) {
        setPaymentOverlay({ kind: "url", content: response.data.paymentPageUrl });
      } else if (response.data.checkoutFormContent) {
        setPaymentOverlay({
          kind: "html",
          content: paytrCheckoutHtml(response.data.checkoutFormContent),
        });
      } else {
        throw new Error("Güvenli ödeme sayfası alınamadı.");
      }
    } catch (error) {
      onNotify("danger", error instanceof ApiError ? error.message : "Ödeme işlemi tamamlanamadı.");
    } finally {
      setIsPaying(false);
    }
  };

  if (paymentOverlay) {
    return (
      <PaymentCheckoutOverlay
        overlay={paymentOverlay}
        purchaseId={purchaseId}
        title={isPaytrCheckout(paymentOverlay) ? "Güvenli Ödeme (PayTR)" : "Güvenli Ödeme"}
        onClose={cancelPaymentOverlay}
      />
    );
  }

  if (!hydrated || packages.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (!pkg) {
    return (
      <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 text-center shadow-none`}>
        <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {addonMode
            ? "Sepetinizde ödenecek modül yok. Modüller sayfasından ürün ekleyin."
            : "Sepetinizde satın alınabilir bir paket yok. Paketleri inceleyip sepetinize ekleyin."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="hero" asChild>
            <Link href={DASHBOARD_ROUTES.modules}>Modüllere git</Link>
          </Button>
          {!addonMode ? (
            <Button variant="outline" asChild>
              <Link href={DASHBOARD_ROUTES.accountPackages}>Paketlere git</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (addonMode && pricing.lines.length === 0) {
    return (
      <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 text-center shadow-none`}>
        <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sepetinizde ödenecek modül yok. Modüller sayfasından ürün ekleyin.
        </p>
        <Button variant="hero" asChild>
          <Link href={DASHBOARD_ROUTES.modules}>Modüllere git</Link>
        </Button>
      </div>
    );
  }

  const nextDueLabel = (() => {
    const next = new Date();
    next.setMonth(next.getMonth() + (cart.billingPeriod === "YEARLY" ? 12 : 1));
    return next.toLocaleDateString("tr-TR");
  })();

  return (
    <div className="space-y-6 animate-fade-in rounded-2xl border border-border bg-muted p-4 sm:p-6/20">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="border-border bg-card">
          <Link href={returnHref}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <BrandLogo size="sm" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sepet Ödemesi</h1>
          <p className="text-sm text-muted-foreground">
            {addonMode
              ? "Seçtiğiniz modüller mevcut paketinize eklenir; tek ödemede PayTR üzerinden tahsil edilir."
              : "Paketiniz ve seçtiğiniz modüller tek ödemede tahsil edilir."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 shadow-none`}>
          <h2 className="text-base font-semibold text-foreground">Sepet özeti</h2>

          {addonMode ? (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">{pkg.name}</p>
              <p className="text-xs text-muted-foreground">Aktif paket · yalnızca ek modüller tahsil edilir</p>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cart.billingPeriod === "YEARLY" ? "Yıllık paket" : "Aylık paket"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCartMoney(pricing.basePrice, pricing.currency)}
              </p>
            </div>
          )}

          {pricing.lines.map((line) => (
            <div key={line.productCode} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{line.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {line.quantity} × {formatCartMoney(line.unitPrice, pricing.currency)} + KDV
                  {line.billingType === "ONE_TIME" ? " · tek seferlik" : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums">
                {formatCartMoney(line.lineTotal, pricing.currency)}
              </p>
            </div>
          ))}

          {pricing.unavailableCodes.length > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Bazı modüller bu pakete eklenemediği için özetten çıkarıldı.
            </p>
          ) : null}

          <div className="space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Modüller toplamı</span>
              <span className="tabular-nums">
                {formatCartMoney(pricing.modulesTotal, pricing.currency)}
              </span>
            </div>
            {!addonMode && couponPricing ? (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>{appliedCoupon?.code} indirimi</span>
                <span className="tabular-nums">
                  −{formatCartMoney(couponPricing.discount, pricing.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1 text-lg font-bold text-foreground">
              <span>Toplam</span>
              <span className="tabular-nums">
                {payableLabel}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{pricing.suffix}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {!addonMode ? (
            <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 shadow-none`}>
              <h2 className="text-base font-semibold text-foreground">Faturalama periyodu</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["MONTHLY", "YEARLY"] as const).map((period) => (
                  <label
                    key={period}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border p-3",
                      cart.billingPeriod === period
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="billingPeriod"
                      checked={cart.billingPeriod === period}
                      onChange={() => setBillingPeriod(period)}
                    />
                    <span className="text-sm">{period === "YEARLY" ? "Yıllık" : "Aylık"}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 shadow-none`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Fatura adresi</h2>
              <Button variant="ghost" size="sm" onClick={() => setCreatingAddress((value) => !value)}>
                Yeni adres
              </Button>
            </div>
            {creatingAddress ? (
              <BillingAddressForm onSubmit={createAddress} />
            ) : addresses.isLoading ? (
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            ) : addresses.isError ? (
              <p className="text-sm text-destructive">
                {addresses.error instanceof ApiError
                  ? addresses.error.message
                  : "Fatura adresleri yüklenemedi."}
              </p>
            ) : addresses.data?.length ? (
              <SearchableSelect
                value={billingAddressId ? String(billingAddressId) : ""}
                onValueChange={(value) => setBillingAddressId(Number(value))}
                options={addresses.data.map((address) => ({
                  value: String(address.id),
                  label: `${displayBillingName(address)} · ${address.city}${address.defaultAddress ? " · Aktif" : ""}`,
                }))}
                placeholder="Fatura adresi seçin"
                searchPlaceholder="Adres ara..."
                emptyText="Adres bulunamadı."
              />
            ) : (
              <Button variant="outline" onClick={() => setCreatingAddress(true)}>
                Fatura adresi oluştur
              </Button>
            )}
          </div>

          {!addonMode ? (
            <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 shadow-none`}>
              <h2 className="text-base font-semibold text-foreground">Kupon kodu</h2>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  value={couponInput}
                  onChange={(event) => {
                    setCouponInput(event.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Kupon kodu"
                  maxLength={32}
                  className="max-w-xs uppercase"
                  autoComplete="off"
                />
                <Button type="button" variant="outline" disabled={couponBusy} onClick={() => void applyCoupon()}>
                  {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uygula"}
                </Button>
              </div>
              {couponError ? <p className="text-sm text-destructive">{couponError}</p> : null}
              {appliedCoupon && couponPricing ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {appliedCoupon.code} uygulandi. Kupon yalnizca paket tutarina uygulanir.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className={`${DASHBOARD_SURFACE} space-y-4 p-6 shadow-none`}>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Ödeme</h2>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Kart bilgileriniz bizim sunucularımıza ulaşmaz. &quot;Ödemeyi Tamamla&quot; butonuna
                bastığınızda PayTR güvenli ödeme sayfası açılır; kart bilgilerinizi yalnızca orada
                girersiniz.
              </p>
            </div>

            {!addonMode ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={recurringConsent}
                    onChange={(event) => setRecurringConsent(event.target.checked)}
                  />
                  <span className="text-sm">
                    Düzenli ödeme için kart bilgilerimin saklanmasını istiyorum.
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Kart bilgileri AlgoryQR sunucularında saklanmaz.
                    </span>
                  </span>
                </label>

                <div className="rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                  <p>
                    Bu ödeme: bugün · Dönem bitişi:{" "}
                    <span className="font-medium text-foreground">{nextDueLabel}</span>
                  </p>
                  <p className="mt-1">
                    Yenileme tutarı: {formatCartMoney(pricing.recurringPrice, pricing.currency)} (paket +
                    modüller).
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                <p>
                  Modüller mevcut abonelik sürenizin sonuna kadar geçerlidir. Tek seferlik ödeme
                  alınır.
                </p>
              </div>
            )}

            <Button
              className="w-full gap-2"
              variant="hero"
              disabled={isPaying || (purchaseId != null && fulfillment.summary.data?.status === "PENDING")}
              onClick={() => void pay()}
            >
              {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {isPaying ? "Ödeme işleniyor…" : `Ödemeyi Tamamla · ${payableLabel}`}
            </Button>
            {purchaseId && fulfillment.summary.data?.status === "PENDING" && (
              <p className="text-center text-xs text-muted-foreground">Ödeme sonucu doğrulanıyor…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
