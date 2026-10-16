"use client";

import { useMemo } from "react";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { hasProduct } from "@/lib/auth-user";
import {
  formatQrCreateQuotaLabel,
  hasQrCreateQuotaRemaining,
  summarizeQrCreateQuota,
  type QrCreateQuotaSummary,
} from "@/lib/entitlement-display";
import { usePackageStore } from "@/stores/package-access-store";

const QR_CREATE_PRODUCT = "QR_CREATE";

export function useQrCreateAccess() {
  const {
    data: accessProfile,
    isLoading: accessLoading,
    isError: accessError,
    refetch: retryAccess,
  } = useAccessProfile();
  const entitlements = usePackageStore((state) => state.entitlements);
  const hasProductAccess = hasProduct(accessProfile, QR_CREATE_PRODUCT);
  const right = entitlements.find((item) => item.productCode === QR_CREATE_PRODUCT) ?? null;

  const qrQuota = useMemo<QrCreateQuotaSummary | null>(() => {
    if (!right) return null;
    const total = right.quantity ?? 0;
    const used = right.usedQuantity ?? 0;
    const remaining = right.unlimited ? Number.POSITIVE_INFINITY : Math.max(0, total - used);
    return summarizeQrCreateQuota({
      remaining,
      total,
      used,
      unlimited: right.unlimited,
      usable: right.open,
    });
  }, [right]);

  const hasQuotaRemaining = hasQrCreateQuotaRemaining(qrQuota);
  const canCreateQr = hasProductAccess && hasQuotaRemaining;
  const qrQuotaLabel = formatQrCreateQuotaLabel(qrQuota);

  return {
    accessLoading,
    accessError,
    retryAccess,
    canCreateQr,
    hasProductAccess,
    hasQuotaRemaining,
    qrQuota,
    qrQuotaLabel,
  };
}
