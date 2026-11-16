"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, Sparkles, X } from "lucide-react";

import { useSessionContext } from "@/hooks/use-session-context";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { formatPackageDate } from "@/lib/package-display";
import { cn } from "@/lib/utils";

const FREE_DISMISS_KEY = "algory-free-plan-banner-dismissed";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dismissFreeBanner() {
  try {
    sessionStorage.setItem(FREE_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(FREE_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * One line under the top bar for billing states that need the merchant's attention: a failed
 * renewal still inside its grace period, or the free plan after a trial or subscription ended.
 * Trials have their own badge and reminder dialog.
 */
export function BillingStatusBanner() {
  const { data: session } = useSessionContext();
  // The server snapshot is "not dismissed", so the server render and hydration agree.
  const freeDismissed = useSyncExternalStore(subscribe, readDismissed, () => false);

  if (session?.decision !== "ALLOW") return null;

  if (session.billingState === "PAST_DUE") {
    const until = session.debtDueAt ? formatPackageDate(session.debtDueAt) : null;
    return (
      <Strip tone="warning" icon={<AlertTriangle className="h-4 w-4 shrink-0" />}>
        <span className="min-w-0 flex-1">
          Son ödemeniz alınamadı.
          {until ? ` Hizmetiniz ${until} tarihine kadar kesintisiz devam ediyor.` : null}
        </span>
        <Link
          href={DASHBOARD_ROUTES.accountSubscription}
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
        >
          Ödemeyi tamamla
        </Link>
      </Strip>
    );
  }

  if (session.billingState === "FREE" && !freeDismissed) {
    return (
      <Strip tone="info" icon={<Sparkles className="h-4 w-4 shrink-0" />}>
        <span className="min-w-0 flex-1">
          Ücretsiz paketi kullanıyorsunuz. Tüm özellikler için bir paket seçin.
        </span>
        <Link
          href={DASHBOARD_ROUTES.accountPackages}
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Paketleri incele
        </Link>
        <button
          type="button"
          aria-label="Kapat"
          onClick={dismissFreeBanner}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </Strip>
    );
  }

  return null;
}

function Strip({
  tone,
  icon,
  children,
}: {
  tone: "warning" | "info";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2 text-sm sm:px-6",
        tone === "warning"
          ? "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-border bg-muted/40 text-foreground",
      )}
    >
      {icon}
      {children}
    </div>
  );
}
