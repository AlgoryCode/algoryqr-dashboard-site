"use client";

import { useMemo } from "react";
import { Layers, Package, Radio } from "lucide-react";

import {
  DetailBarList,
  ReportDetailSheet,
  formatPercent,
  sharePercent,
  type RankedRow,
} from "@/components/dashboard/reports/ReportData";
import type { MenuRevenueReportResponse } from "@/lib/api";
import { toAmount } from "@/reporting/numbers";

import { dayLabel } from "./chart-config";
import { readChannelMix, readCiroMetrics } from "./ciro-metrics";

export type RevenueDetailSelection =
  | { kind: "product"; key: string }
  | { kind: "category"; key: string }
  | { kind: "channel"; key: string }
  | null;

type ProductStat = {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
  revenueRank: number;
  quantityRank: number;
};

function rankBy<T>(rows: T[], value: (row: T) => number): Map<T, number> {
  const sorted = [...rows].sort((a, b) => value(b) - value(a));
  return new Map(sorted.map((row, index) => [row, index + 1]));
}

export function readProductStats(revenue: MenuRevenueReportResponse): ProductStat[] {
  const base = (revenue.products ?? []).map((row) => ({
    key: String(row.productId ?? row.name),
    name: row.name,
    quantity: row.quantity ?? 0,
    revenue: toAmount(row.revenue),
  }));
  const byRevenue = rankBy(base, (row) => row.revenue);
  const byQuantity = rankBy(base, (row) => row.quantity);
  return base.map((row) => ({
    ...row,
    revenueRank: byRevenue.get(row) ?? 0,
    quantityRank: byQuantity.get(row) ?? 0,
  }));
}

export function readCategoryStats(revenue: MenuRevenueReportResponse) {
  return (revenue.categories ?? []).map((row) => ({
    key: String(row.categoryId ?? row.name),
    name: row.name,
    quantity: row.quantity ?? 0,
    revenue: toAmount(row.revenue),
  }));
}

export function readChannelStats(revenue: MenuRevenueReportResponse) {
  const metrics = readCiroMetrics(revenue);
  const mix = readChannelMix(revenue, metrics);
  const incoming = new Map((revenue.channels ?? []).map((row) => [row.code, row]));
  return mix.rows
    .filter((row) => row.connected || row.revenue > 0 || row.orders > 0)
    .map((row) => {
      const raw = incoming.get(row.code);
      const delta = raw?.deltaVsPrevPercent;
      return {
        key: row.code,
        name: row.label,
        revenue: row.revenue,
        orders: row.orders,
        share: row.share,
        aov: row.orders > 0 ? row.revenue / row.orders : toAmount(raw?.avgOrderValue),
        delta: delta == null || delta === "" ? null : Number(delta),
        connected: row.connected,
      };
    });
}

/** Adede göre sıralamada çubuk ve sağdaki değer adet olur. */
export function productRankedRowsByMode(
  revenue: MenuRevenueReportResponse,
  formatMoney: (value: number) => string,
) {
  const stats = readProductStats(revenue);
  const totalRevenue = stats.reduce((sum, row) => sum + row.revenue, 0);
  const totalQuantity = stats.reduce((sum, row) => sum + row.quantity, 0);
  const peakRevenue = Math.max(1, ...stats.map((row) => row.revenue));
  const peakQuantity = Math.max(1, ...stats.map((row) => row.quantity));
  const byRevenue: RankedRow[] = stats.map((row) => ({
    key: row.key,
    name: row.name,
    primary: formatMoney(row.revenue),
    secondary: `${row.quantity.toLocaleString("tr-TR")} adet · ${formatPercent(sharePercent(row.revenue, totalRevenue))}`,
    bar: (row.revenue / peakRevenue) * 100,
    sortValues: { revenue: row.revenue, quantity: row.quantity },
  }));
  const byQuantity: RankedRow[] = stats.map((row) => ({
    key: row.key,
    name: row.name,
    primary: `${row.quantity.toLocaleString("tr-TR")} adet`,
    secondary: `${formatMoney(row.revenue)} · ${formatPercent(sharePercent(row.quantity, totalQuantity))}`,
    bar: (row.quantity / peakQuantity) * 100,
    sortValues: { revenue: row.revenue, quantity: row.quantity },
  }));
  return { byRevenue, byQuantity };
}

export function categoryRankedRows(
  revenue: MenuRevenueReportResponse,
  formatMoney: (value: number) => string,
): RankedRow[] {
  const stats = readCategoryStats(revenue);
  const total = stats.reduce((sum, row) => sum + row.revenue, 0);
  const peak = Math.max(1, ...stats.map((row) => row.revenue));
  return stats.map((row) => ({
    key: row.key,
    name: row.name,
    primary: formatMoney(row.revenue),
    secondary: `${row.quantity.toLocaleString("tr-TR")} adet · ${formatPercent(sharePercent(row.revenue, total))}`,
    bar: (row.revenue / peak) * 100,
    sortValues: { revenue: row.revenue, quantity: row.quantity },
  }));
}

export function channelRankedRows(
  revenue: MenuRevenueReportResponse,
  formatMoney: (value: number) => string,
  mode: "revenue" | "orders",
): RankedRow[] {
  const stats = readChannelStats(revenue);
  const totalOrders = stats.reduce((sum, row) => sum + row.orders, 0);
  const peakRevenue = Math.max(1, ...stats.map((row) => row.revenue));
  const peakOrders = Math.max(1, ...stats.map((row) => row.orders));
  return stats.map((row) => ({
    key: row.key,
    name: row.name,
    primary:
      mode === "revenue" ? formatMoney(row.revenue) : `${row.orders.toLocaleString("tr-TR")} sipariş`,
    secondary:
      mode === "revenue"
        ? `${row.orders.toLocaleString("tr-TR")} sipariş · ${formatPercent(row.share)}`
        : `Ort. ${formatMoney(row.aov)} · ${formatPercent(sharePercent(row.orders, totalOrders))}`,
    bar: mode === "revenue" ? (row.revenue / peakRevenue) * 100 : (row.orders / peakOrders) * 100,
    sortValues: { revenue: row.revenue, orders: row.orders },
  }));
}

/** Ürün, kategori ve kanal satırları için ortak detay pencereleri. */
export function RevenueDetailSheets({
  revenue,
  formatMoney,
  selection,
  onClose,
}: {
  revenue: MenuRevenueReportResponse;
  formatMoney: (value: number) => string;
  selection: RevenueDetailSelection;
  onClose: () => void;
}) {
  const products = useMemo(() => readProductStats(revenue), [revenue]);
  const categories = useMemo(() => readCategoryStats(revenue), [revenue]);
  const channels = useMemo(() => readChannelStats(revenue), [revenue]);

  const totals = useMemo(
    () => ({
      productRevenue: products.reduce((sum, row) => sum + row.revenue, 0),
      productQuantity: products.reduce((sum, row) => sum + row.quantity, 0),
      categoryRevenue: categories.reduce((sum, row) => sum + row.revenue, 0),
      categoryQuantity: categories.reduce((sum, row) => sum + row.quantity, 0),
    }),
    [categories, products],
  );

  const product = selection?.kind === "product" ? products.find((row) => row.key === selection.key) : undefined;
  const category =
    selection?.kind === "category" ? categories.find((row) => row.key === selection.key) : undefined;
  const channel = selection?.kind === "channel" ? channels.find((row) => row.key === selection.key) : undefined;

  const channelDaily = useMemo(() => {
    if (!channel) return [];
    return (revenue.channelDaily ?? [])
      .filter((point) => point.channelCode === channel.key)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14)
      .map((point) => ({
        key: point.date,
        label: dayLabel(point.date),
        value: toAmount(point.revenue),
        display: `${formatMoney(toAmount(point.revenue))} · ${(point.orderCount ?? 0).toLocaleString("tr-TR")}`,
      }));
  }, [channel, formatMoney, revenue.channelDaily]);

  return (
    <>
      <ReportDetailSheet
        open={product != null}
        onClose={onClose}
        icon={Package}
        title={product?.name ?? "Ürün"}
        description={
          product
            ? `Ciroda ${product.revenueRank}. · Adette ${product.quantityRank}. sırada`
            : undefined
        }
        metrics={
          product
            ? [
                { label: "Ciro", value: formatMoney(product.revenue), accent: true },
                { label: "Satılan adet", value: `${product.quantity.toLocaleString("tr-TR")} adet`, accent: true },
                {
                  label: "Ort. birim fiyat",
                  value: product.quantity > 0 ? formatMoney(product.revenue / product.quantity) : "—",
                },
                { label: "Ciro payı", value: formatPercent(sharePercent(product.revenue, totals.productRevenue), 1) },
                { label: "Adet payı", value: formatPercent(sharePercent(product.quantity, totals.productQuantity), 1) },
                { label: "Ürün sayısı", value: `${products.length.toLocaleString("tr-TR")} ürün içinde` },
              ]
            : []
        }
      />

      <ReportDetailSheet
        open={category != null}
        onClose={onClose}
        icon={Layers}
        title={category?.name ?? "Kategori"}
        description="Kategori bazlı satış özeti"
        metrics={
          category
            ? [
                { label: "Ciro", value: formatMoney(category.revenue), accent: true },
                { label: "Satılan adet", value: `${category.quantity.toLocaleString("tr-TR")} adet`, accent: true },
                {
                  label: "Ort. birim fiyat",
                  value: category.quantity > 0 ? formatMoney(category.revenue / category.quantity) : "—",
                },
                { label: "Ciro payı", value: formatPercent(sharePercent(category.revenue, totals.categoryRevenue), 1) },
                { label: "Adet payı", value: formatPercent(sharePercent(category.quantity, totals.categoryQuantity), 1) },
              ]
            : []
        }
      />

      <ReportDetailSheet
        open={channel != null}
        onClose={onClose}
        icon={Radio}
        title={channel?.name ?? "Kanal"}
        description={channel && !channel.connected ? "Kanal bağlı değil" : "Kanal bazlı satış özeti"}
        metrics={
          channel
            ? [
                { label: "Ciro", value: formatMoney(channel.revenue), accent: true },
                { label: "Sipariş", value: channel.orders.toLocaleString("tr-TR"), accent: true },
                { label: "Ort. sepet", value: formatMoney(channel.aov) },
                { label: "Ciro payı", value: formatPercent(channel.share, 1) },
                ...(channel.delta != null && Number.isFinite(channel.delta)
                  ? [
                      {
                        label: "Önceki döneme göre",
                        value: `${channel.delta >= 0 ? "+" : ""}${formatPercent(channel.delta, 1)}`,
                      },
                    ]
                  : []),
              ]
            : []
        }
      >
        {channel ? (
          <DetailBarList
            title="Günlük ciro · sipariş (son 14 gün)"
            rows={channelDaily}
            emptyText="Bu kanal için günlük kayıt yok."
          />
        ) : null}
      </ReportDetailSheet>
    </>
  );
}
