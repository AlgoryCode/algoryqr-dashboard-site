"use client";

import { Star } from "lucide-react";

import type { MenuWaiterPerformanceReportResponse, MenuWaiterPerformanceRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { revenueShare, toAmount } from "@/reporting/numbers";

import { CHART_COLORS } from "./chart-config";

const CARD = "rounded-2xl border border-border/80 bg-card shadow-sm";
const PLOT_PX = 112;

export function StaffPage({
  waiter,
  money: formatMoney,
  roles,
}: {
  waiter: MenuWaiterPerformanceReportResponse;
  money: (value: number) => string;
  roles?: Record<string, string>;
}) {
  const score = staffScorecard(waiter);
  const rows = [...(waiter.waiters ?? [])].sort((a, b) => toAmount(b.revenue) - toAmount(a.revenue));
  const star = rows[0];
  const orders = score.orders;
  const avgTip = orders > 0 ? score.tip / orders : 0;
  const assignment = assignmentRate(score);
  const tipShare = score.revenue > 0 ? (score.tip / score.revenue) * 100 : null;
  const rosterShare = score.roster > 0 ? (score.activeStaff / score.roster) * 100 : null;
  const showOps = assignment != null || tipShare != null || rosterShare != null;

  return (
    <div className="space-y-3.5">
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label="Personel özeti">
        <KpiCard
          label="Bahşiş"
          value={formatMoney(score.tip)}
          hint={orders > 0 ? `Ort. ${formatMoney(avgTip)} / sipariş` : undefined}
          hintTone={score.tip > 0 ? "positive" : "muted"}
        />
        <KpiCard
          label="Kapanan hesap"
          value={score.billsClosed.toLocaleString("tr-TR")}
          hint={orders > 0 ? `${orders.toLocaleString("tr-TR")} sipariş` : undefined}
        />
        <KpiCard
          label="Atanmamış sipariş"
          value={score.unassigned.toLocaleString("tr-TR")}
          badge={score.unassigned === 0 ? "Mükemmel" : undefined}
          hint={score.unassigned === 0 ? "Atanmamış sipariş yok" : "Atama bekliyor"}
        />
        <KpiCard
          label="Aktif personel"
          value={score.activeStaff.toLocaleString("tr-TR")}
          live={score.activeStaff > 0}
          hint={score.roster > 0 ? `${score.roster.toLocaleString("tr-TR")} kişi kayıtlı` : undefined}
        />
      </section>

      <div className="grid items-start gap-3.5 lg:grid-cols-5">
        {star ? (
          <div className="lg:col-span-2">
            <SpotlightCard
              row={star}
              formatMoney={formatMoney}
              role={roleLabel(star, roles)}
              share={Math.round(star.revenueSharePercent ?? revenueShare(toAmount(star.revenue), score.revenue))}
            />
          </div>
        ) : null}
        <div className={star ? "lg:col-span-3" : "lg:col-span-5"}>
          <ShareChartCard rows={rows} roles={roles} />
        </div>
      </div>

      <div
        className={cn(
          "grid items-start gap-3.5",
          showOps && rows.length > 0 && "lg:grid-cols-[18rem_minmax(0,1fr)]",
        )}
      >
      {showOps ? (
        <section className={cn(CARD, "p-4")} aria-label="Operasyon">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">Operasyon</h2>
            {assignment === 100 && orders > 0 ? (
              <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                Verimli
              </span>
            ) : null}
          </div>
          <div className="space-y-3">
            {assignment != null ? (
              <Meter label="Atanan sipariş oranı" value={`%${Math.round(assignment)}`} percent={assignment} color="hsl(var(--primary))" />
            ) : null}
            {tipShare != null ? (
              <Meter label="Bahşiş / ciro" value={`%${tipShare.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`} percent={tipShare} color="#10b981" />
            ) : null}
            {rosterShare != null ? (
              <Meter
                label="Aktif kadro"
                value={`${score.activeStaff.toLocaleString("tr-TR")} / ${score.roster.toLocaleString("tr-TR")}`}
                percent={rosterShare}
                color={CHART_COLORS.c2}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {rows.length > 0 ? <StaffTable rows={rows} formatMoney={formatMoney} roles={roles} /> : null}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  hintTone = "muted",
  badge,
  live,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: "muted" | "positive";
  badge?: string;
  live?: boolean;
}) {
  return (
    <article className={cn(CARD, "p-3.5")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {badge ? (
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            {badge}
          </span>
        ) : null}
        {live ? (
          <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Vardiyada
          </span>
        ) : null}
      </div>
      {hint ? (
        <p className={cn("mt-1 text-[10px] font-medium", hintTone === "positive" ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground")}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}

function SpotlightCard({
  row,
  formatMoney,
  role,
  share,
}: {
  row: MenuWaiterPerformanceRow;
  formatMoney: (value: number) => string;
  role?: string;
  share: number;
}) {
  const orders = row.orderCount ?? 0;
  const bills = row.billsClosedCount ?? orders;
  const basket = toAmount(row.avgOrderValue) || (orders > 0 ? toAmount(row.revenue) / orders : 0);
  const top = row.topProducts?.[0];

  return (
    <section className={cn(CARD, "p-4")} aria-label="Dönemin yıldızı">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          <Star className="h-3 w-3 fill-current" />
          Dönemin yıldızı
        </span>
        <span className="text-xs font-medium text-muted-foreground">Ekip içinde 1. sıra</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-orange-400 p-0.5">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card text-base font-extrabold text-primary">
                {initials(row.displayName)}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-amber-400 text-[9px] font-black text-slate-900">
              1
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-foreground">{row.displayName}</h2>
            <p className="text-[11px] text-muted-foreground">{role ?? "Personel"}</p>
            {top ? <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/80">{top.name}</p> : null}
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-border/80 bg-muted/40 px-3 py-1.5 text-right">
          <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Ciro payı</span>
          <span className="text-lg font-black tracking-tight text-foreground">%{share}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-2.5 text-center">
        <StatPill label="Hesap" value={`${bills.toLocaleString("tr-TR")} adet`} />
        <StatPill label="Ort. sepet" value={formatMoney(basket)} />
        <StatPill label="Bahşiş" value={formatMoney(toAmount(row.tipAmount))} tone="positive" />
      </div>
    </section>
  );
}

function StatPill({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 px-1 py-1.5">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-bold", tone === "positive" ? "text-emerald-600 dark:text-emerald-300" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function ShareChartCard({
  rows,
  roles,
}: {
  rows: MenuWaiterPerformanceRow[];
  roles?: Record<string, string>;
}) {
  const totalRevenue = rows.reduce((sum, row) => sum + toAmount(row.revenue), 0);
  const totalOrders = rows.reduce((sum, row) => sum + (row.orderCount ?? 0), 0);
  const bars = rows.slice(0, 8).map((row) => ({
    key: `${row.waiterId ?? row.staffId ?? row.displayName}`,
    name: row.displayName,
    role: roleLabel(row, roles),
    revenue: row.revenueSharePercent ?? revenueShare(toAmount(row.revenue), totalRevenue),
    orders: row.orderSharePercent ?? revenueShare(row.orderCount ?? 0, totalOrders),
  }));

  return (
    <section className={cn(CARD, "p-4")} aria-label="Ciro payı ve sipariş payı">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">Ciro payı / sipariş payı</h2>
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.c1 }} />
            Ciro payı
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.c2 }} />
            Sipariş payı
          </span>
        </div>
      </div>
      {bars.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Bu dönemde kayıt yok.</p>
      ) : (
        <ColumnCompare rows={bars} />
      )}
    </section>
  );
}

function ColumnCompare({
  rows,
}: {
  rows: { key: string; name: string; role?: string; revenue: number; orders: number }[];
}) {
  const ticks = [100, 75, 50, 25, 0];
  return (
    <div>
      <div className="relative h-44 w-full">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {ticks.map((tick) => (
            <div key={tick} className="flex w-full items-center justify-end border-b border-dashed border-border/80 pr-0.5">
              <span className="-mt-3.5 bg-card px-0.5 text-[9px] font-medium text-muted-foreground">%{tick}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-1 bottom-1 top-3 z-10 flex items-end" role="img" aria-label="Personel pay karşılaştırması">
          {rows.map((row) => {
            const peak = Math.max(row.revenue, row.orders);
            const peakPx = peak <= 0 ? 6 : Math.max(6, Math.round((peak / 100) * PLOT_PX));
            return (
              <div key={row.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <div className="relative flex items-end justify-center gap-1" style={{ height: PLOT_PX }}>
                  <span
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px]",
                      peak > 0 ? "font-bold text-foreground" : "text-muted-foreground",
                    )}
                    style={{ bottom: peakPx + 2 }}
                  >
                    %{Math.round(peak)}
                  </span>
                  <ShareColumn percent={row.revenue} color={CHART_COLORS.c1} label={`${row.name} ciro payı %${Math.round(row.revenue)}`} />
                  <ShareColumn percent={row.orders} color={CHART_COLORS.c2} label={`${row.name} sipariş payı %${Math.round(row.orders)}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-start justify-between border-t border-border/70 px-1 pt-2">
        {rows.map((row) => (
          <div key={`${row.key}-label`} className="min-w-0 flex-1 px-0.5 text-center">
            <span className="block truncate text-[11px] font-bold text-foreground">{row.name}</span>
            <span className="block truncate text-[9px] text-muted-foreground">{row.role ?? "Personel"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareColumn({ percent, color, label }: { percent: number; color: string; label: string }) {
  const value = Math.max(0, Math.min(100, percent));
  const height = value <= 0 ? 6 : Math.max(6, Math.round((value / 100) * PLOT_PX));
  return (
    <div
      className={cn("w-3.5 rounded-t-md", value <= 0 && "bg-muted")}
      style={{ height, background: value <= 0 ? undefined : color }}
      title={label}
    />
  );
}

function Meter({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-2 rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

function StaffTable({
  rows,
  formatMoney,
  roles,
}: {
  rows: MenuWaiterPerformanceRow[];
  formatMoney: (value: number) => string;
  roles?: Record<string, string>;
}) {
  return (
    <section className={cn(CARD, "p-4")} aria-label="Personel listesi">
      <h2 className="mb-2 text-sm font-bold text-foreground">Personel</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-muted-foreground">
              <th className="pb-1.5 text-left font-medium">Personel</th>
              <th className="pb-1.5 text-right font-medium">Sipariş</th>
              <th className="pb-1.5 text-right font-medium">Ürün</th>
              <th className="pb-1.5 text-right font-medium">Sepet</th>
              <th className="pb-1.5 text-right font-medium">Bahşiş</th>
              <th className="pb-1.5 text-right font-medium">En çok satan</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row, index) => {
              const orders = row.orderCount ?? 0;
              const items = row.itemCount ?? 0;
              const basket = toAmount(row.avgOrderValue) || (orders > 0 ? toAmount(row.revenue) / orders : 0);
              const top = row.topProducts?.[0];
              const role = roleLabel(row, roles);
              return (
                <tr key={`${row.waiterId ?? row.displayName}-${index}`}>
                  <td className="py-1.5 text-left">
                    <span className="block truncate font-medium text-foreground">{row.displayName}</span>
                    {role ? <span className="block text-[10px] text-muted-foreground">{role}</span> : null}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-foreground">{orders.toLocaleString("tr-TR")}</td>
                  <td className="py-1.5 text-right tabular-nums text-foreground">{items.toLocaleString("tr-TR")}</td>
                  <td className="py-1.5 text-right tabular-nums text-foreground">{formatMoney(basket)}</td>
                  <td className="py-1.5 text-right tabular-nums text-foreground">{formatMoney(toAmount(row.tipAmount))}</td>
                  <td className="py-1.5 text-right text-foreground">
                    {top ? `${top.name} · ${top.quantity.toLocaleString("tr-TR")}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type StaffScore = {
  tip: number;
  billsClosed: number;
  unassigned: number;
  activeStaff: number;
  orders: number;
  assigned: number | null;
  revenue: number;
  roster: number;
};

function staffScorecard(waiter: MenuWaiterPerformanceReportResponse): StaffScore {
  const kpis = waiter.kpis ?? {};
  const rows = waiter.waiters ?? [];
  const orders = rows.reduce((sum, row) => sum + (row.orderCount ?? 0), 0);
  const bills = rows.reduce((sum, row) => sum + (row.billsClosedCount ?? row.orderCount ?? 0), 0);
  const active = rows.filter((row) => row.active !== false && (row.orderCount ?? 0) + toAmount(row.revenue) > 0).length;
  const tip = toAmount(kpis.totalTip) || rows.reduce((sum, row) => sum + toAmount(row.tipAmount), 0);
  const revenue = toAmount(kpis.totalRevenue) || rows.reduce((sum, row) => sum + toAmount(row.revenue), 0);
  return {
    tip,
    billsClosed: kpis.billsClosedCount ?? bills,
    unassigned: kpis.unassignedOrderCount ?? 0,
    activeStaff: kpis.activeWaiterCount ?? active,
    orders,
    assigned: kpis.assignedOrderCount ?? null,
    revenue,
    roster: rows.length,
  };
}

function assignmentRate(score: StaffScore): number | null {
  const unassigned = score.unassigned;
  const assigned = score.assigned ?? (score.orders > 0 || unassigned > 0 ? Math.max(0, score.orders) : null);
  if (assigned == null && unassigned <= 0) return null;
  const total = (assigned ?? 0) + unassigned;
  if (total <= 0) return null;
  return ((assigned ?? 0) / total) * 100;
}

function roleLabel(row: MenuWaiterPerformanceRow, roles?: Record<string, string>): string | undefined {
  if (!roles) return undefined;
  const id = row.waiterId ?? row.staffId;
  if (id != null && roles[String(id)]) return roles[String(id)];
  return roles[row.displayName];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return name.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "—";
}
