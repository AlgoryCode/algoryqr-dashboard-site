"use client";

import type { MenuWaiterPerformanceReportResponse, MenuWaiterPerformanceRow } from "@/lib/api";
import { toAmount } from "@/reporting/numbers";

import { GapBarsCard } from "./charts/GapBarsCard";
import { NamedTableCard } from "./charts/NamedTableCard";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { buildStaffSparkKpis, type StaffScorecard } from "./shadcn-spark";
import { readStaffCompare } from "./staff-metrics";

export function StaffPage({
  waiter,
  money: formatMoney,
}: {
  waiter: MenuWaiterPerformanceReportResponse;
  money: (value: number) => string;
}) {
  const mix = readStaffCompare(waiter);
  const rows = [...(waiter.waiters ?? [])].sort((a, b) => toAmount(b.revenue) - toAmount(a.revenue));

  return (
    <div className="space-y-3">
      <SparkKpiStrip items={buildStaffSparkKpis(staffScorecard(waiter), formatMoney)} />
      <GapBarsCard
        title="Ciro payı / sipariş payı"
        leftLabel="Ciro payı"
        rightLabel="Sipariş payı"
        rows={mix.load.slice(0, 8).map((row) => ({
          name: row.name,
          left: row.revenueShare,
          right: row.orderShare,
        }))}
      />
      <NamedTableCard
        title="Personel"
        columns={["Personel", "Sipariş", "Sepet", "Bahşiş", "En çok satan"]}
        rows={rows.slice(0, 12).map((row) => staffLine(row, formatMoney))}
      />
    </div>
  );
}

function staffScorecard(waiter: MenuWaiterPerformanceReportResponse): StaffScorecard {
  const kpis = waiter.kpis ?? {};
  const rows = waiter.waiters ?? [];
  const bills = rows.reduce((sum, row) => sum + (row.billsClosedCount ?? row.orderCount ?? 0), 0);
  const active = rows.filter((row) => row.active !== false && (row.orderCount ?? 0) + toAmount(row.revenue) > 0).length;
  const tip = toAmount(kpis.totalTip) || rows.reduce((sum, row) => sum + toAmount(row.tipAmount), 0);
  return {
    tip,
    billsClosed: kpis.billsClosedCount ?? bills,
    unassigned: kpis.unassignedOrderCount ?? 0,
    activeStaff: kpis.activeWaiterCount ?? active,
  };
}

function staffLine(row: MenuWaiterPerformanceRow, formatMoney: (value: number) => string): string[] {
  const orders = row.orderCount ?? 0;
  const basket = toAmount(row.avgOrderValue) || (orders > 0 ? toAmount(row.revenue) / orders : 0);
  const top = row.topProducts?.[0];
  return [
    row.displayName,
    orders.toLocaleString("tr-TR"),
    formatMoney(basket),
    formatMoney(toAmount(row.tipAmount)),
    top ? `${top.name} · ${top.quantity.toLocaleString("tr-TR")}` : "—",
  ];
}
