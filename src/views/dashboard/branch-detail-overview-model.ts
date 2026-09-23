import type { BranchOverview } from "@/components/dashboard/branch-detail/BranchDetailOverview";
import type { ReviewRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import type { MenuRevenueReportResponse, SummaryAnalyticsResponse } from "@/lib/api";
import type { BranchItem } from "@/lib/branch";
import { clockLabel, dailySalesPoints, formatBranchAmount, formatScore } from "@/lib/branch-detail";
import { orderStatusLabel } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { eachIsoDate, toAmount } from "@/reporting";

type OverviewSource = {
  summary?: SummaryAnalyticsResponse;
  summaryReady: boolean;
  revenue?: MenuRevenueReportResponse;
  revenueReady: boolean;
  orders: OrderResponse[];
  qrId: number | null;
  ratingAvg?: number | string | null;
  ratingCount: number;
  reviews: ReviewRow[];
};

export function buildOverview(
  branch: BranchItem,
  currency: string | null | undefined,
  week: { from: string; to: string },
  source: OverviewSource,
): BranchOverview {
  const sales = source.revenueReady ? toAmount(source.revenue?.kpis.totalRevenue) : null;
  const orderCount = source.revenue?.kpis.orderCount;
  return {
    photoUrl: branch.photoUrl ?? null,
    active: branch.active,
    address: branch.address ?? null,
    phone: branch.phone ?? null,
    email: branch.email ?? null,
    kitchenOn: Boolean(branch.kitchenEnabled),
    sales: sales == null ? "—" : formatBranchAmount(sales, currency),
    orders: source.revenueReady ? (orderCount ?? 0).toLocaleString("tr-TR") : "—",
    basket: source.revenueReady
      ? formatBranchAmount(toAmount(source.revenue?.kpis.avgOrderValue), currency)
      : "—",
    visits: source.summaryReady ? (source.summary?.qrTeaser.sessions ?? 0).toLocaleString("tr-TR") : "—",
    salesDelta: source.summary?.overview.revenueVsPreviousPct ?? null,
    daily: dailySalesPoints(eachIsoDate(week.from, week.to), source.revenue?.daily ?? []),
    categories: categorySlices(source.revenue),
    products: productRows(source.revenue, currency),
    recentOrders: recentOrders(source.orders, source.qrId),
    activities: source.reviews.slice(0, 5).map((review) => ({
      id: review.id,
      title: `${review.title} · ${review.score}`,
      detail: review.comment,
    })),
    weekRevenue: sales == null ? "—" : formatBranchAmount(sales, currency),
    weekOrders: source.revenueReady ? (orderCount ?? 0).toLocaleString("tr-TR") : "—",
    score: source.ratingCount > 0 ? formatScore(toAmount(source.ratingAvg)) : "—",
  };
}

function categorySlices(revenue?: MenuRevenueReportResponse) {
  return (revenue?.categories ?? [])
    .map((item) => ({ name: item.name, value: toAmount(item.revenue) }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function productRows(revenue: MenuRevenueReportResponse | undefined, currency?: string | null) {
  return [...(revenue?.products ?? [])]
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      revenue: formatBranchAmount(toAmount(item.revenue), currency),
    }));
}

function recentOrders(orders: OrderResponse[], qrId: number | null) {
  return [...orders]
    .sort((left, right) => timeValue(right.createdAt) - timeValue(left.createdAt))
    .slice(0, 5)
    .map((order) => ({
      id: order.id,
      qrId,
      customer: order.customerName?.trim() || order.tableName?.trim() || "Misafir",
      amount: formatBranchAmount(toAmount(order.totalAmount), order.currency),
      status: orderStatusLabel(order.status),
      time: clockLabel(order.createdAt),
    }));
}

function timeValue(iso?: string | null): number {
  const value = iso ? Date.parse(iso) : 0;
  return Number.isNaN(value) ? 0 : value;
}
