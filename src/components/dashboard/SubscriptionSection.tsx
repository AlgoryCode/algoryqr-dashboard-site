"use client";

import { SubscriptionHistoryCard } from "@/components/dashboard/SubscriptionHistoryCard";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles } from "lucide-react";

import RefundConfirmDialog from "@/components/dashboard/RefundConfirmDialog";
import RefundStatusBadge from "@/components/dashboard/RefundStatusBadge";
import RefundStatusPanel from "@/components/dashboard/RefundStatusPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { prefetchActivePackages } from "@/hooks/use-subscription";
import {
  addonProductLabel,
  formatDaysUntilExpiry,
  formatPackageDate,
  formatPackagePrice,
  purchaseTypeLabel,
} from "@/lib/package-display";
import {
  formatBranchMenuQuota,
  formatBranchQuota,
  formatBranchQuotaSubtitle,
  formatBranchQuotaUsageFraction,
} from "@/lib/branch";
import { invalidateAccessProfile } from "@/hooks/use-access-profile";
import { invalidatePackageUsage } from "@/hooks/use-package-usage";
import {
  invalidateSubscriptionOverview,
  useSubscriptionOverview,
} from "@/hooks/use-subscription-overview";
import { invalidateSubscription } from "@/hooks/use-subscription";
import { usePurchaseFulfillment } from "@/hooks/use-purchase-fulfillment";
import {
  abandonPendingPaymentAttempt,
  canCancelAtPeriodEnd,
  canCancelPurchase,
  canCancelWithRefund,
  canPaySubscriptionDebt,
  canResumeRenewal,
  cancelPurchase,
  cancelPurchaseAtPeriodEnd,
  cancelPurchaseWithRefund,
  clearPendingPurchaseId,
  isSubscriptionPastDue,
  paySubscriptionDebt,
  readPendingPurchaseId,
  resumePurchaseRenewal,
  storePendingPurchaseId,
  type PurchaseInitiateResponse,
} from "@/lib/purchase-fulfillment";
import PaymentCheckoutOverlay, {
  type PaymentCheckoutOverlayContent,
} from "@/components/dashboard/PaymentCheckoutOverlay";
import { isPaytrCheckout, paytrCheckoutHtml } from "@/lib/paytr-checkout";
import {
  cancelPlanChange,
  directionLabel,
  listMyPlanChanges,
} from "@/lib/plan-change";
import { refreshAccessAfterEntitlementChange } from "@/lib/refresh-access";
import { describeEntitlement } from "@/lib/entitlement-display";
import { isRefundInFlight, purchaseStatusLabel } from "@/lib/refund-display";
import { ApiError } from "@/lib/api/errors";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";

interface SubscriptionSectionProps {
  onNotify: (type: "info" | "warning" | "danger", message: string) => void;
}

export default function SubscriptionSection({ onNotify }: SubscriptionSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useSubscriptionOverview();
  const planChangesQuery = useQuery({
    queryKey: ["planChanges"],
    queryFn: listMyPlanChanges,
    staleTime: 15_000,
  });
  const [pendingPurchaseId, setPendingPurchaseId] = useState<number | null>(null);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [paymentOverlay, setPaymentOverlay] = useState<PaymentCheckoutOverlayContent | null>(null);
  const handledPurchaseId = useRef<number | null>(null);
  const fulfillment = usePurchaseFulfillment(
    pendingPurchaseId,
    pendingPurchaseId ? pollStartedAt : null,
  );

  const activePurchase = data?.activePurchase;
  const purchaseId = activePurchase?.id && activePurchase.id > 0 ? activePurchase.id : undefined;
  const summary = data?.activePackage ?? null;
  const hasActivePackage = !!(summary ?? activePurchase);
  const addonPurchases = data?.addonPurchases ?? [];
  const visibleAddonPurchases = addonPurchases.filter(
    (addon) => addon.packageCode !== "QR_BRANCH" && addon.packageCode !== "QR_BRANCH_ADDON",
  );
  const branchQuotaLabel = formatBranchQuota(data?.branchQuota ?? null);
  const menuQuotaLabel = formatBranchMenuQuota(data?.menuQuota ?? null);
  const products = summary?.products ?? [];
  const isActiveTrial =
    (summary?.purchaseType ?? activePurchase?.purchaseType) === "TRIAL" &&
    !!(summary?.usable ?? activePurchase?.usable) &&
    !(summary?.expired ?? activePurchase?.expired);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const queryPurchaseId = Number(searchParams.get("purchaseId"));
    const resolvedPurchaseId =
      Number.isSafeInteger(queryPurchaseId) && queryPurchaseId > 0
        ? queryPurchaseId
        : readPendingPurchaseId();
    if (resolvedPurchaseId) {
      const startPolling = window.setTimeout(() => {
        setPendingPurchaseId(resolvedPurchaseId);
        setPollStartedAt(Date.now());
      }, 0);
      return () => window.clearTimeout(startPolling);
    }
    if (payment === "failed") {
      void abandonPendingPaymentAttempt({ cancelIfPending: true });
      onNotify("danger", "Ödeme başarısız oldu. Lütfen tekrar deneyin.");
      router.replace(DASHBOARD_ROUTES.accountSubscription);
    } else if (payment === "success") {
      onNotify("warning", "Ödeme sonucu doğrulanamadı. Abonelik durumunuzu kontrol edin.");
      router.replace(DASHBOARD_ROUTES.accountSubscription);
    }
  }, [onNotify, router, searchParams]);

  useEffect(() => {
    const fulfillmentSummary = fulfillment.summary.data;
    if (
      !fulfillmentSummary ||
      pendingPurchaseId !== fulfillmentSummary.purchaseId ||
      handledPurchaseId.current === fulfillmentSummary.purchaseId
    ) return;
    if (fulfillmentSummary.status === "ACTIVE") {
      handledPurchaseId.current = fulfillmentSummary.purchaseId;
      clearPendingPurchaseId();
      void (async () => {
        await refreshAccessAfterEntitlementChange(queryClient);
        await invalidatePackageUsage(queryClient);
        onNotify("info", "Ödeme tamamlandı ve paketiniz aktif edildi.");
        router.replace(DASHBOARD_ROUTES.accountSubscription);
      })();
      return;
    }
    if (fulfillmentSummary.status === "FAILED" || fulfillmentSummary.status === "CANCELLED") {
      handledPurchaseId.current = fulfillmentSummary.purchaseId;
      void abandonPendingPaymentAttempt({ cancelIfPending: true });
      setPaymentOverlay(null);
      onNotify("danger", "Ödeme tamamlanamadı. Lütfen tekrar deneyin.");
      router.replace(DASHBOARD_ROUTES.accountSubscription);
    }
  }, [fulfillment.summary.data, onNotify, pendingPurchaseId, queryClient, router]);

  useEffect(() => {
    if (!fulfillment.timedOut || handledPurchaseId.current === pendingPurchaseId) return;
    handledPurchaseId.current = pendingPurchaseId;
    onNotify("warning", "Ödeme durumu henüz kesinleşmedi. Daha sonra tekrar kontrol edin.");
    router.replace(DASHBOARD_ROUTES.accountSubscription);
  }, [fulfillment.timedOut, onNotify, pendingPurchaseId, router]);

  const refundPending = isRefundInFlight(
    summary?.refundStatus ?? activePurchase?.refundStatus,
  );
  const packageName =
    summary?.packageName ?? activePurchase?.packageName ?? data?.usage.packageName ?? "Paket";
  const scheduledChange = useMemo(
    () => planChangesQuery.data?.find((item) => item.status === "SCHEDULED") ?? null,
    [planChangesQuery.data],
  );
  const showImmediateCancel =
    !!purchaseId && summary ? canCancelPurchase(summary) && !refundPending : false;
  const showCancelAtPeriodEnd =
    !!purchaseId && summary ? canCancelAtPeriodEnd(summary) && !refundPending : false;
  const showCancelWithRefund =
    !!purchaseId && summary ? canCancelWithRefund(summary) && !refundPending : false;
  const showResumeRenewal =
    !!purchaseId && summary ? canResumeRenewal(summary) && !refundPending : false;
  const showPayDebt =
    !!purchaseId && summary ? canPaySubscriptionDebt(summary) && !refundPending : false;
  const pastDue = summary
    ? isSubscriptionPastDue(summary)
    : isSubscriptionPastDue(activePurchase ?? {});
  const graceEndsAt = summary?.subscriptionGraceEndsAt ?? activePurchase?.subscriptionGraceEndsAt;
  const hasSavedCard = !!(summary?.paymentMethodId ?? activePurchase?.paymentMethodId);
  const isSubscription = summary?.paymentStyle === "SUBSCRIPTION";

  const cancelPlanChangeMutation = useMutation({
    mutationFn: (id: number) => cancelPlanChange(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["planChanges"] });
      onNotify("info", "Planlanan paket gecisi iptal edildi.");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.message
          : "Planlanan gecis iptal edilemedi.";
      onNotify("danger", message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchase(purchaseId!),
    onSuccess: async () => {
      setCancelError(null);
      await refreshAccessAfterEntitlementChange(queryClient);
      await Promise.all([
        invalidateSubscriptionOverview(queryClient),
        invalidateSubscription(queryClient),
        invalidatePackageUsage(queryClient),
      ]);
      onNotify("info", "Paket iptal edildi.");
    },
    onError: (error: unknown) => {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "Paket iptal edilemedi. Lütfen tekrar deneyin.",
      );
    },
  });

  const cancelAtPeriodEndMutation = useMutation({
    mutationFn: () => cancelPurchaseAtPeriodEnd(purchaseId!),
    onSuccess: async () => {
      setCancelError(null);
      await Promise.all([
        invalidateSubscriptionOverview(queryClient),
        invalidateSubscription(queryClient),
        invalidatePackageUsage(queryClient),
        invalidateAccessProfile(),
      ]);
      onNotify("info", "Yenileme dönem sonunda kapatılacak.");
    },
    onError: (error: unknown) => {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "Dönem sonu iptal başarısız. Lütfen tekrar deneyin.",
      );
    },
  });

  const cancelWithRefundMutation = useMutation({
    mutationFn: () => cancelPurchaseWithRefund(purchaseId!),
    onSuccess: async () => {
      setCancelError(null);
      await refreshAccessAfterEntitlementChange(queryClient);
      await Promise.all([
        invalidateSubscriptionOverview(queryClient),
        invalidateSubscription(queryClient),
        invalidatePackageUsage(queryClient),
      ]);
      onNotify("info", "İade ile iptal başlatıldı.");
    },
    onError: (error: unknown) => {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "İade ile iptal başarısız. Lütfen tekrar deneyin.",
      );
    },
  });

  const resumeRenewalMutation = useMutation({
    mutationFn: () => resumePurchaseRenewal(purchaseId!),
    onSuccess: async () => {
      setCancelError(null);
      await refreshAccessAfterEntitlementChange(queryClient);
      await Promise.all([
        invalidateSubscriptionOverview(queryClient),
        invalidateSubscription(queryClient),
        invalidatePackageUsage(queryClient),
      ]);
      onNotify("info", "Yenileme tekrar açıldı.");
    },
    onError: (error: unknown) => {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "Yenilemeyi açma başarısız. Lütfen tekrar deneyin.",
      );
    },
  });

  const payDebtMutation = useMutation({
    mutationFn: () => paySubscriptionDebt(purchaseId!),
    onSuccess: (response: PurchaseInitiateResponse) => {
      setCancelError(null);
      if (!Number.isSafeInteger(response.purchaseId) || response.purchaseId <= 0) {
        setCancelError("Borç ödeme kimliği alınamadı.");
        return;
      }
      storePendingPurchaseId(response.purchaseId);
      setPendingPurchaseId(response.purchaseId);
      setPollStartedAt(Date.now());
      if (response.paymentPageUrl) {
        setPaymentOverlay({ kind: "url", content: response.paymentPageUrl });
        return;
      }
      if (response.checkoutFormContent) {
        setPaymentOverlay({
          kind: "html",
          content: paytrCheckoutHtml(response.checkoutFormContent),
        });
        return;
      }
      setCancelError("Güvenli ödeme sayfası alınamadı.");
    },
    onError: (error: unknown) => {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "Borç ödeme başlatılamadı. Lütfen tekrar deneyin.",
      );
    },
  });

  if (paymentOverlay) {
    const title = isPaytrCheckout(paymentOverlay) ? "Borç ödemesi (PayTR)" : "Borç ödemesi";
    return (
      <PaymentCheckoutOverlay
        overlay={paymentOverlay}
        purchaseId={pendingPurchaseId}
        title={title}
        onClose={() => {
          setPaymentOverlay(null);
          void abandonPendingPaymentAttempt({ cancelIfPending: true });
        }}
      />
    );
  }

  const expiresAt = summary?.expiresAt ?? activePurchase?.expiresAt;
  const daysLeft = summary?.daysUntilExpiry ?? activePurchase?.daysUntilExpiry;
  const renewalOff = !!(summary?.cancelAtPeriodEnd ?? activePurchase?.cancelAtPeriodEnd);
  const nextPaymentAt = summary?.nextPaymentDueAt ?? activePurchase?.nextPaymentDueAt;
  const statusLabel = isActiveTrial
    ? "Deneme"
    : purchaseStatusLabel(summary?.status ?? activePurchase?.status);
  const notice = pastDue
    ? `Yenileme ödemesi alınamadı. ${
        graceEndsAt
          ? `Erişiminiz ${formatPackageDate(graceEndsAt)} tarihine kadar devam eder.`
          : "Erişiminiz kısa süre daha devam eder."
      }`
    : refundPending
      ? "İade işlemi sürüyor. Lütfen bekleyin; tekrar denemeyin."
      : renewalOff
        ? `Yenileme kapalı. Erişiminiz ${formatPackageDate(expiresAt)} tarihine kadar devam eder.`
        : (summary?.expiryApproaching ?? activePurchase?.expiryApproaching)
          ? isActiveTrial
            ? "Deneme süreniz 7 gün içinde bitiyor. Ücretli pakete geçerek erişiminizi sürdürebilirsiniz."
            : "Paketinizin bitmesine 7 günden az kaldı."
          : (summary?.paymentApproaching || activePurchase?.paymentApproaching)
            ? "Ödeme tarihiniz yaklaşıyor."
            : isSubscription && !hasSavedCard
              ? "Kayıtlı kart yok; otomatik yenileme çalışmaz."
              : null;

  const facts: Array<{ label: string; value: string }> = [
    { label: "Başlangıç", value: formatPackageDate(summary?.startsAt ?? activePurchase?.startsAt) },
    { label: "Bitiş", value: formatPackageDate(expiresAt) },
    {
      label: "Yenileme",
      value: isActiveTrial
        ? "Deneme"
        : renewalOff
          ? "Kapalı"
          : isSubscription
            ? "Otomatik"
            : "Tek seferlik",
    },
    nextPaymentAt
      ? { label: "Sonraki ödeme", value: formatPackageDate(nextPaymentAt) }
      : summary?.cardLastFour
        ? {
            label: "Kart",
            value: [summary.cardBrand, `•••• ${summary.cardLastFour}`].filter(Boolean).join(" "),
          }
        : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  const described = products.map((product) => ({ product, ...describeEntitlement(product) }));
  const limits: LimitRow[] = described
    .filter((item) => item.kind === "limit")
    .map((item) => {
      if (item.product.productCode === "QR_BRANCH" && data?.branchQuota) {
        return {
          key: item.product.id,
          name: item.name,
          description: item.description,
          used: data.branchQuota.used,
          total: data.branchQuota.allowed,
          unlimited: false,
        };
      }
      return {
        key: item.product.id,
        name: item.name,
        description:
          item.product.productCode === "QR_MENU" && data?.menuQuota
            ? `${item.description ?? ""} Her şubenin ilk menüsü ücretsiz.`.trim()
            : item.description,
        used: item.product.usedQuantity,
        total: item.product.totalQuantity,
        unlimited: item.product.unlimited,
      };
    })
    .reduce<LimitRow[]>((rows, row) => {
      const same = rows.find((existing) => existing.name === row.name);
      if (!same) return [...rows, row];
      same.total += row.total;
      same.used = Math.max(same.used, row.used);
      same.unlimited = same.unlimited || row.unlimited;
      return rows;
    }, [])
    .sort((a, b) => Number(a.unlimited) - Number(b.unlimited));
  const features = described
    .filter((item) => item.kind === "feature")
    .filter(
      (item, index, all) =>
        all.findIndex((other) => other.name === item.name) === index,
    )
    .map((item) => {
      const twins = described.filter((other) => other.kind === "feature" && other.name === item.name);
      const active = twins.some((twin) => twin.product.usable && !twin.product.expired);
      return { ...item, active };
    });
  const paidAddons = visibleAddonPurchases.filter(
    (addon) => addon.purchaseId != null && addon.purchaseId > 0,
  );
  const hasManageActions =
    showImmediateCancel ||
    showCancelAtPeriodEnd ||
    showCancelWithRefund ||
    showResumeRenewal ||
    showPayDebt;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href={DASHBOARD_ROUTES.account}
          aria-label="Hesaba dön"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Abonelik</h1>
      </div>

      {isLoading ? (
        <Card className={DASHBOARD_SURFACE}>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          </CardContent>
        </Card>
      ) : isError ? (
        <p className="text-sm text-destructive">Abonelik bilgileri yüklenemedi.</p>
      ) : data && !hasActivePackage ? (
        <div className="smart-feature-panel flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`${DASHBOARD_SURFACE} flex h-10 w-10 shrink-0 items-center justify-center`}>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Henüz bir paketiniz bulunmuyor
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Paketleri inceleyerek size uygun planı seçin.
              </p>
            </div>
          </div>
          <span className="btn-shine-pulse inline-flex w-fit shrink-0 self-start rounded-full sm:self-auto">
            <Button
              variant="hero"
              size="sm"
              className="h-10 shrink-0 rounded-full px-5 shadow-none"
              asChild
            >
              <Link
                href={DASHBOARD_ROUTES.accountPackages}
                onMouseEnter={() => prefetchActivePackages(queryClient)}
              >
                Paketleri incele
              </Link>
            </Button>
          </span>
        </div>
      ) : data ? (
        <>
          {summary && !isActiveTrial ? (
            <RefundStatusPanel
              packageName={summary.packageName}
              price={summary.price}
              currency={summary.currency}
              refundableAmount={summary.refundableAmount}
              refundStatus={summary.refundStatus}
              refundedAt={summary.refundedAt}
              cardBrand={summary.cardBrand}
              cardLastFour={summary.cardLastFour}
            />
          ) : null}

          <Card className={DASHBOARD_SURFACE}>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {packageName}
                    </h2>
                    {statusLabel ? (
                      <span
                        className={
                          pastDue
                            ? "rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                            : "rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                        }
                      >
                        {statusLabel}
                      </span>
                    ) : null}
                    {summary && !isActiveTrial ? (
                      <RefundStatusBadge
                        refundStatus={summary.refundStatus}
                        refundedAt={summary.refundedAt}
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {expiresAt ? `${formatPackageDate(expiresAt)} tarihine kadar geçerli` : "Süresiz"}
                    {daysLeft != null ? ` · ${formatDaysUntilExpiry(daysLeft)}` : ""}
                  </p>
                </div>
                {summary || isActiveTrial ? (
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {isActiveTrial || !summary || Number(summary.price) === 0
                      ? "Ücretsiz"
                      : formatPackagePrice(summary.price, summary.currency)}
                  </p>
                ) : null}
              </div>

              {notice ? (
                <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                  {notice}
                </p>
              ) : null}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                {facts.map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                <Button variant="hero" size="sm" asChild>
                  <Link
                    href={DASHBOARD_ROUTES.accountPackages}
                    onMouseEnter={() => prefetchActivePackages(queryClient)}
                  >
                    {isActiveTrial ? "Ücretli pakete geç" : "Paketleri gör"}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={DASHBOARD_ROUTES.modules}>Modüller</Link>
                </Button>
                {isSubscription && !hasSavedCard ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={DASHBOARD_ROUTES.accountPaymentMethods}>Kayıtlı kartlar</Link>
                  </Button>
                ) : null}
                {hasManageActions ? (
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    {showPayDebt ? (
                      <Button
                        type="button"
                        variant="hero"
                        size="sm"
                        disabled={payDebtMutation.isPending}
                        onClick={() => payDebtMutation.mutate()}
                      >
                        {payDebtMutation.isPending ? "Ödeme açılıyor…" : "Borcu öde"}
                      </Button>
                    ) : null}
                    {showResumeRenewal ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={resumeRenewalMutation.isPending}
                        onClick={() => resumeRenewalMutation.mutate()}
                      >
                        {resumeRenewalMutation.isPending ? "Açılıyor…" : "Yenilemeyi tekrar aç"}
                      </Button>
                    ) : null}
                    {showCancelWithRefund || showCancelAtPeriodEnd ? (
                      <RefundConfirmDialog
                        purchase={{
                          purchaseId: purchaseId!,
                          packageName: summary!.packageName,
                          price: summary!.price,
                          currency: summary!.currency,
                          refundableAmount: summary!.refundableAmount,
                          refundEligibleUntil: summary!.refundEligibleUntil,
                          refundCoolingDays: summary!.refundCoolingDays,
                          cardBrand: summary!.cardBrand,
                          cardLastFour: summary!.cardLastFour,
                        }}
                        allowRefundNow={showCancelWithRefund}
                        allowPeriodEnd={showCancelAtPeriodEnd}
                        isPending={
                          cancelWithRefundMutation.isPending ||
                          cancelAtPeriodEndMutation.isPending
                        }
                        onConfirm={() => cancelWithRefundMutation.mutate()}
                        onPreferPeriodEnd={
                          showCancelAtPeriodEnd
                            ? () => cancelAtPeriodEndMutation.mutate()
                            : undefined
                        }
                      />
                    ) : null}
                    {showImmediateCancel ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="hero"
                            size="sm"
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? "İptal ediliyor…" : "Paketi iptal et"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Paket iptal edilsin mi?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {packageName} paketi hemen iptal edilir.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelMutation.mutate()}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Evet, iptal et
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {cancelError ? <p className="text-sm text-destructive">{cancelError}</p> : null}
            </CardContent>
          </Card>

          {limits.length > 0 || features.length > 0 || paidAddons.length > 0 ? (
            <Card className={DASHBOARD_SURFACE}>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <h3 className="text-base font-semibold text-foreground">Paketinizde neler var</h3>

                {limits.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {limits.map((limit) => (
                      <LimitTile key={limit.key} limit={limit} />
                    ))}
                  </div>
                ) : null}

                {features.length > 0 ? (
                  <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {features.map((item) => {
                      const active = item.active;
                      return (
                        <li key={item.product.id} className="flex items-start gap-2.5">
                          <span
                            className={
                              active
                                ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                            }
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {item.name}
                              {active ? null : (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  (pasif)
                                </span>
                              )}
                            </p>
                            {item.description ? (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {paidAddons.length > 0 ? (
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <p className="text-xs font-medium text-muted-foreground">Ek satın alımlar</p>
                    <div className="divide-y divide-border/60">
                      {paidAddons.map((addon) => (
                        <Link
                          key={addon.purchaseId}
                          href={DASHBOARD_ROUTES.accountPaymentHistoryDetail(addon.purchaseId!)}
                          className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                        >
                          <span className="truncate font-medium">
                            {addonProductLabel(addon.packageCode, addon.packageName)}
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              {addon.installmentCount && addon.installmentCount > 0
                                ? `${addon.installmentCount} adet`
                                : "1 adet"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatPackagePrice(addon.price, addon.currency)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {scheduledChange && (
            <Card className={DASHBOARD_SURFACE}>
              <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Planlanan paket geçişi</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {directionLabel(scheduledChange.direction)}:{" "}
                    {scheduledChange.fromPackageName} → {scheduledChange.toPackageName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPackageDate(scheduledChange.effectiveAt)} tarihinde devreye girecek ·
                    tahsil:{" "}
                    {formatPackagePrice(scheduledChange.chargeAmount, scheduledChange.currency)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cancelPlanChangeMutation.isPending}
                  onClick={() => cancelPlanChangeMutation.mutate(scheduledChange.id)}
                >
                  {cancelPlanChangeMutation.isPending ? "İptal ediliyor…" : "Planlamayı iptal et"}
                </Button>
              </CardContent>
            </Card>
          )}

          <SubscriptionHistoryCard />
        </>
      ) : null}
    </div>
  );
}

type LimitRow = {
  key: number;
  name: string;
  description: string | null;
  used: number;
  total: number;
  unlimited: boolean;
};

function LimitTile({ limit }: { limit: LimitRow }) {
  const ratio = limit.unlimited || limit.total <= 0 ? 0 : Math.min(1, limit.used / limit.total);
  const full = !limit.unlimited && limit.total > 0 && limit.used >= limit.total;
  return (
    <div className="rounded-xl border border-border/70 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{limit.name}</p>
        <p className="shrink-0 text-sm tabular-nums text-foreground">
          {limit.unlimited ? (
            "Sınırsız"
          ) : (
            <>
              <span className="font-semibold">{limit.used}</span>
              <span className="text-muted-foreground"> / {limit.total}</span>
            </>
          )}
        </p>
      </div>
      {limit.unlimited ? null : (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={full ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-primary"}
            style={{ width: `${Math.max(ratio * 100, limit.used > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
      {limit.description ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{limit.description}</p>
      ) : null}
    </div>
  );
}
