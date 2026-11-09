"use client";

import { useMemo } from "react";
import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getBranchFullAnalyticsRequest,
  getBranchRevenueReportRequest,
  getMenuFeedbackRequest,
  getMenuReservationsRequest,
  listAccountingEntriesRequest,
} from "@/lib/api";
import type { BranchItem } from "@/lib/branch";
import { formatBranchAmount } from "@/lib/branch-detail";
import { listScopedMenuOrders, menusInBranchScope, type BranchScope } from "@/lib/branch-scope";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  isNegativeFeedback,
  overviewDayKeys,
  sortOverviewAlerts,
  summarizeDailyRevenue,
  summarizeOrderQueue,
  unclosedPastShifts,
  type OverviewAlert,
  type OverviewShiftRow,
} from "@/lib/overview-dashboard";
import { listIngredients } from "@/lib/stock-api";

const FEEDBACK_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export type OverviewDashboardAccess = {
  revenue: boolean;
  orders: boolean;
  menus: boolean;
  accounting: boolean;
  shifts: boolean;
};

function combineResults<T>(results: UseQueryResult<T>[]) {
  return {
    data: results.map((result) => result.data),
    loading: results.some((result) => result.isLoading),
    allFailed: results.length > 0 && results.every((result) => result.isError),
  };
}

/** The queue only reacts to recent work; an order left open for longer than this is not actionable here. */
const OVERVIEW_ORDER_DAYS = 7;

export function useOverviewDashboard(
  branches: BranchItem[],
  scope: BranchScope,
  access: OverviewDashboardAccess,
) {
  const keys = useMemo(() => overviewDayKeys(), []);
  const scopedBranches = useMemo(
    () => (scope === "all" ? branches : branches.filter((branch) => branch.id === scope)),
    [branches, scope],
  );
  const scopedMenus = useMemo(() => menusInBranchScope(branches, scope), [branches, scope]);

  const revenue = useQueries({
    queries: scopedBranches.map((branch) => ({
      queryKey: ["overview-revenue", branch.id, keys.lastWeek, keys.today],
      queryFn: () => getBranchRevenueReportRequest(branch.id, keys.lastWeek, keys.today),
      enabled: access.revenue,
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: (query) => query.state.status !== "error",
      refetchInterval: (query) => (query.state.status === "error" ? false : 120_000),
    })),
    combine: combineResults,
  });

  const ordersQuery = useQuery({
    queryKey: ["overview-orders", scopedMenus.map((menu) => menu.menuId)],
    queryFn: () => listScopedMenuOrders(scopedMenus, OVERVIEW_ORDER_DAYS),
    enabled: access.orders && scopedMenus.length > 0,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });

  const lowStock = useQueries({
    queries: scopedBranches.map((branch) => ({
      queryKey: ["overview-low-stock", branch.id],
      queryFn: () => listIngredients(branch.id, { lowOnly: true, size: 3 }),
      enabled: access.menus,
      staleTime: 60_000,
      retry: false,
    })),
    combine: combineResults,
  });

  const reservations = useQueries({
    queries: scopedMenus.map((menu) => ({
      queryKey: ["overview-pending-reservations", menu.menuId],
      queryFn: () => getMenuReservationsRequest(menu.menuId, { status: "PENDING", size: 1 }),
      enabled: access.menus,
      staleTime: 60_000,
      retry: false,
    })),
    combine: combineResults,
  });

  const feedback = useQueries({
    queries: scopedMenus.map((menu) => ({
      queryKey: ["overview-recent-feedback", menu.menuId],
      queryFn: () => getMenuFeedbackRequest(menu.menuId, { size: 20 }),
      enabled: access.menus,
      staleTime: 120_000,
      retry: false,
    })),
    combine: combineResults,
  });

  const debtQuery = useQuery({
    queryKey: ["overview-accounting-debt"],
    queryFn: () => listAccountingEntriesRequest({ type: "BORC", size: 1 }),
    enabled: access.accounting,
    staleTime: 120_000,
    retry: false,
  });

  const shifts = useQueries({
    queries: scopedBranches.map((branch) => ({
      queryKey: ["overview-shifts", branch.id, keys.weekStart, keys.today],
      queryFn: async (): Promise<OverviewShiftRow[]> => {
        const report = await getBranchFullAnalyticsRequest(branch.id, keys.weekStart, keys.today);
        return report.coverage?.shifts ? (report.shifts?.shifts ?? []) : [];
      },
      enabled: access.shifts,
      staleTime: 5 * 60_000,
      retry: false,
      refetchOnWindowFocus: (query) => query.state.status !== "error",
    })),
    combine: combineResults,
  });

  const summary = useMemo(() => {
    const reports = revenue.data.filter((report) => report != null);
    return reports.length > 0 ? summarizeDailyRevenue(reports, keys) : null;
  }, [revenue.data, keys]);

  const queue = useMemo(
    () => (ordersQuery.data ? summarizeOrderQueue(ordersQuery.data) : null),
    [ordersQuery.data],
  );

  const alerts = useMemo(() => {
    const list: OverviewAlert[] = [];

    scopedBranches.forEach((branch, index) => {
      const page = lowStock.data[index];
      if (!page || page.totalElements === 0) return;
      const names = page.content.map((item) => item.name).join(", ");
      list.push({
        id: `stock-${branch.id}`,
        kind: "stock",
        tone: "danger",
        title: `${page.totalElements} hammadde kritik seviyede`,
        detail: `${branch.name}: ${names}${page.totalElements > page.content.length ? "…" : ""}`,
        href: DASHBOARD_ROUTES.stockForBranch(branch.id),
        actionLabel: "Stoğa git",
      });
    });

    scopedBranches.forEach((branch, index) => {
      const open = unclosedPastShifts(shifts.data[index] ?? [], keys.today);
      if (open.length === 0) return;
      list.push({
        id: `shift-${branch.id}`,
        kind: "shift",
        tone: "danger",
        title: "Kapatılmamış gün sonu",
        detail: `${branch.name}: ${open.length} kasa vardiyası önceki günden açık kaldı.`,
        href: DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branch.id),
        actionLabel: "Vardiyaları gör",
      });
    });

    const pendingReservations = reservations.data.reduce(
      (sum, page) => sum + (page?.totalElements ?? 0),
      0,
    );
    if (pendingReservations > 0) {
      list.push({
        id: "reservations",
        kind: "reservation",
        tone: "warning",
        title: `${pendingReservations} rezervasyon onay bekliyor`,
        detail: "Misafirlere dönüş yapmak için rezervasyon takvimini açın.",
        href: DASHBOARD_ROUTES.reservations,
        actionLabel: "Rezervasyonlar",
      });
    }

    const since = Date.now() - FEEDBACK_WINDOW_MS;
    let negativeFeedback = 0;
    let feedbackQrId: number | null = null;
    scopedMenus.forEach((menu, index) => {
      const count = (feedback.data[index]?.content ?? []).filter((item) =>
        isNegativeFeedback(item, since),
      ).length;
      if (count > 0 && feedbackQrId == null) feedbackQrId = menu.qrId;
      negativeFeedback += count;
    });
    if (negativeFeedback > 0) {
      list.push({
        id: "feedback",
        kind: "feedback",
        tone: "warning",
        title: `${negativeFeedback} düşük puanlı yorum`,
        detail: "Son 3 günde 1–2 puan verilen yorumlar ilgilenmenizi bekliyor.",
        href:
          feedbackQrId != null
            ? DASHBOARD_ROUTES.feedbackForQr(feedbackQrId)
            : DASHBOARD_ROUTES.feedback,
        actionLabel: "Yorumları gör",
      });
    }

    const debt = debtQuery.data;
    const debtTotal = Number(debt?.summary.totalBorc ?? 0);
    if (debt && debtTotal > 0) {
      list.push({
        id: "debt",
        kind: "debt",
        tone: "info",
        title: "Ödenecek borç kayıtları",
        detail: `${debt.totalElements} kayıt · toplam ${formatBranchAmount(debtTotal, debt.summary.currency)}`,
        href: DASHBOARD_ROUTES.muhasebe,
        actionLabel: "Muhasebe",
      });
    }

    return sortOverviewAlerts(list);
  }, [
    scopedBranches,
    scopedMenus,
    keys.today,
    lowStock.data,
    shifts.data,
    reservations.data,
    feedback.data,
    debtQuery.data,
  ]);

  return {
    summary,
    summaryLoading: access.revenue && revenue.loading,
    summaryError: access.revenue && revenue.allFailed,
    queue,
    queueLoading: access.orders && ordersQuery.isLoading,
    alerts,
    alertsLoading:
      (access.menus && (lowStock.loading || reservations.loading || feedback.loading)) ||
      (access.accounting && debtQuery.isLoading) ||
      (access.shifts && shifts.loading),
  };
}
