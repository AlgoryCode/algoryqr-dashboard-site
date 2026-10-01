"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, Clock3, Loader2, PartyPopper, Sparkles } from "lucide-react";

import { getOrder } from "@/lib/ordering-api";
import { produceCampaignReward, type ProduceRewardResponse } from "@/lib/public-campaign-api";

import { usePublicMenuTheme } from "./public-menu-theme";
import { useMenuLocale } from "./menu-locale";
import { useOrderingOptional } from "./ordering-context";

type OrderSuccessOverlayProps = {
  orderId: number;
  identifier: string;
  sessionToken: string | null;
  onDone: () => void;
};

function buildQrImageUrl(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}

export function OrderSuccessOverlay({
  orderId,
  identifier,
  sessionToken,
  onDone,
}: OrderSuccessOverlayProps) {
  const theme = usePublicMenuTheme();
  const { t } = useMenuLocale();
  const ordering = useOrderingOptional();
  const tableName = ordering?.tableName ?? null;
  const [status, setStatus] = useState<string>("SUBMITTED");
  const [campaignHint, setCampaignHint] = useState<string | null>(null);
  const [rewardEligible, setRewardEligible] = useState(false);
  const [producing, setProducing] = useState(false);
  const [produceError, setProduceError] = useState<string | null>(null);
  const [produceResult, setProduceResult] = useState<ProduceRewardResponse | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled || attempts > 120 || !sessionToken) return;
      attempts += 1;
      try {
        const order = await getOrder(identifier, sessionToken, orderId);
        if (cancelled) return;
        setStatus(order.status);
        const summary = order.campaignSummary;
        if (summary?.hint) setCampaignHint(summary.hint);
        if (summary?.rewardEligible) setRewardEligible(true);
        if (order.status !== "CONFIRMED" && order.status !== "REJECTED" && order.status !== "CANCELLED") {
          window.setTimeout(() => void poll(), 3000);
        }
      } catch {
        if (!cancelled && attempts < 120) {
          window.setTimeout(() => void poll(), 4000);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [identifier, orderId, sessionToken]);

  const handleProduce = useCallback(async () => {
    setProducing(true);
    setProduceError(null);
    try {
      const result = await produceCampaignReward(identifier, orderId);
      setProduceResult(result);
    } catch (err) {
      setProduceError(err instanceof Error ? err.message : "Ödül üretilemedi.");
    } finally {
      setProducing(false);
    }
  }, [identifier, orderId]);

  if (typeof document === "undefined") return null;

  const claimUrl =
    produceResult?.claimUrl ??
    (produceResult?.claimToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/reward/claim?c=${encodeURIComponent(produceResult.claimToken)}`
      : null);

  return createPortal(
    <motion.div
      className="pw-success-overlay fixed inset-0 z-[90] flex items-center justify-center px-4 py-4 sm:px-6 sm:py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "color-mix(in srgb, #1a1a1a 45%, transparent)" }}
      onClick={onDone}
    >
      <motion.div
        className={`${theme.rootClassName} pw-success-card relative w-full max-w-sm rounded-3xl border border-[var(--lx-border)] bg-[var(--lx-card)] px-6 py-10 text-center shadow-2xl`}
        initial={{ scale: 0.82, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <style>{theme.styles}</style>

        <span className="pw-success-sparkle pw-success-sparkle-one" aria-hidden="true"><Sparkles className="h-5 w-5" /></span>
        <span className="pw-success-sparkle pw-success-sparkle-two" aria-hidden="true"><Sparkles className="h-4 w-4" /></span>

        <motion.div
          className="pw-success-badge mx-auto flex h-20 w-20 items-center justify-center rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          <svg viewBox="0 0 52 52" className="h-10 w-10" aria-hidden>
            <motion.path
              d="M14 27.5 L22.5 36 L38 16"
              fill="none"
              stroke="var(--lx-primary-fg)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, delay: 0.15 }}
            />
          </svg>
        </motion.div>

        <div className="pw-success-kicker mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <PartyPopper className="h-3.5 w-3.5" />
          <span>Siparişin alındı</span>
        </div>
        <p className="pw-success-title mt-3 font-display text-2xl font-semibold">
          {t.orderReceived}
        </p>
        <p className="pw-success-subtitle mt-2 text-sm">Mutfağa ilettik, şimdi tazecik hazırlanıyor.</p>
        <p className="pw-success-order mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <Check className="h-3.5 w-3.5" /> #{orderId}
        </p>
        {tableName ? (
          <p className="pw-success-table mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
            <Clock3 className="h-3.5 w-3.5" />
            {t.tableLabel}: {tableName}
          </p>
        ) : null}

        {status === "CONFIRMED" ? (
          <p className="pw-success-confirmed mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
            <Check className="h-4 w-4" /> {t.orderConfirmed}
          </p>
        ) : null}

        {campaignHint ? (
          <p className="pw-success-hint mt-3 text-xs">{campaignHint}</p>
        ) : null}

        {status === "CONFIRMED" && rewardEligible && !produceResult ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={producing}
              onClick={() => void handleProduce()}
              className="pw-success-reward inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-60"
            >
              {producing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.produceReward}
            </button>
            {produceError ? <p className="text-xs text-red-500">{produceError}</p> : null}
          </div>
        ) : null}

        {produceResult ? (
          <div className="mt-4 space-y-3">
            <p className="pw-success-hint text-sm">
              {produceResult.message ??
                (produceResult.autoAssigned
                  ? t.rewardAddedToAccount
                  : t.rewardLoginToClaim)}
            </p>
            {!produceResult.autoAssigned && claimUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildQrImageUrl(claimUrl)}
                  alt="Claim QR"
                  className="pw-success-qr mx-auto rounded-2xl border"
                />
                <a
                  href={claimUrl}
                  className="pw-success-link block truncate text-xs underline"
                >
                  {claimUrl}
                </a>
              </>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onDone}
          className="pw-success-done mt-6 inline-flex h-10 items-center justify-center rounded-full border px-5 text-sm font-medium"
        >
          {t.done}
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
