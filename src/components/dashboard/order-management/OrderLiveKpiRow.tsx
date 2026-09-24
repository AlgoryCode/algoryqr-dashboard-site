"use client";

import { Bike, Receipt, Table2, Timer, Wallet } from "lucide-react";

import { formatMenuPrice } from "@/components/menu-templates/types";
import type { LiveOpsKpiSnapshot } from "@/lib/order-management";
import { cn } from "@/lib/utils";

type OrderLiveKpiRowProps = {
  kpis: LiveOpsKpiSnapshot;
  currency: string;
  kitchenEnabled: boolean;
};

function formatMinutes(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export function OrderLiveKpiRow({ kpis, currency, kitchenEnabled }: OrderLiveKpiRowProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-xl" />
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground">
            <span>GÜNLÜK CANLI CİRO</span>
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
            {formatMenuPrice(kpis.revenue, currency) || "₺0"}
          </p>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Seçili dönem toplamı</p>
      </article>

      <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground">
            <span>AKTİF SİPARİŞLER</span>
            <span className="rounded-lg bg-sky-500/10 p-1.5 text-sky-600">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">{kpis.openOrders}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Operasyondaki toplam akış</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/70 pt-2 text-center">
          <div className="rounded-lg border border-primary/15 bg-primary/5 p-1.5">
            <span className="block text-sm font-bold tabular-nums text-primary">{kpis.tableOrders}</span>
            <span className="text-[10px] font-medium text-muted-foreground">Masa İçi</span>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-1.5 dark:border-sky-900 dark:bg-sky-950/40">
            <span className="block text-sm font-bold tabular-nums text-sky-700 dark:text-sky-300">
              {kpis.deliveryOrders}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Paket</span>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-1.5 dark:border-emerald-900 dark:bg-emerald-950/40">
            <span className="block text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {kpis.pickupOrders}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Gel-Al</span>
          </div>
        </div>
      </article>

      {kitchenEnabled ? (
        <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground">
              <span>MUTFAK ORT. SÜRE</span>
              <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600">
                <Timer className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {formatMinutes(kpis.kitchenAvgMinutes)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">dakika</span>
            </div>
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                kpis.kitchenOnTarget
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  kpis.kitchenOnTarget ? "bg-emerald-600" : "bg-rose-600",
                )}
              />
              Hedef &lt;{kpis.kitchenTargetMinutes} dk
              {kpis.kitchenOnTarget ? " (Başarılı)" : " (Aşım)"}
            </span>
          </div>
        </article>
      ) : (
        <article className="flex flex-col justify-between rounded-xl border border-dashed border-border bg-muted/30 p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground">
              <span>MUTFAK</span>
              <span className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                <Timer className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">Kapalı</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Siparişler doğrudan garsona atanıyor
            </p>
          </div>
        </article>
      )}

      <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground">
            <span>KURYE FİLOSU</span>
            <span className="rounded-lg bg-sky-500/10 p-1.5 text-sky-600">
              <Bike className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-foreground">{kpis.courierOnRoad}</span>
            <span className="text-xs font-semibold text-foreground">Kurye Yolda</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {kpis.courierWaiting} Beklemede
            {kpis.courierAvgMinutes != null
              ? ` · Ort. ${formatMinutes(kpis.courierAvgMinutes)} dk`
              : ""}
          </p>
        </div>
      </article>

      <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground">
            <span>MASA DOLULUK</span>
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Table2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-foreground">
              {kpis.tableOccupancyPercent != null ? `%${kpis.tableOccupancyPercent}` : "—"}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Doluluk</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {kpis.totalTables > 0
              ? `${kpis.occupiedTables} / ${kpis.totalTables} Masa Dolu`
              : "Masa verisi yok"}
          </p>
        </div>
        {kpis.totalTables > 0 ? (
          <div className="mt-3 border-t border-border/70 pt-2">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(7, Math.max(kpis.totalTables, 1)) }).map((_, index) => {
                const filledRatio = kpis.occupiedTables / kpis.totalTables;
                const filled = index < Math.round(filledRatio * Math.min(7, kpis.totalTables));
                return (
                  <span
                    key={index}
                    className={cn("h-1.5 flex-1 rounded-full", filled ? "bg-primary" : "bg-muted")}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>{kpis.emptyTables} Masa Boş</span>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}
