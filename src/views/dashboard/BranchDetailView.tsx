"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";

import {
  BranchDetailPanel,
  type BranchDetailTab,
} from "@/components/dashboard/branch-detail/BranchDetailPanel";
import type { CompareRow, MenuRow, ReviewRow, StaffRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { useDashboardPageLabel } from "@/contexts/dashboard-page-label";
import { useBranch, useBranches } from "@/hooks/use-branches";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import {
  branchSummaryAnalyticsQueryKey,
  useBranchSummaryAnalytics,
} from "@/hooks/use-branch-summary-analytics";
import {
  getBranchSummaryAnalyticsRequest,
  getMenuFeedbackRequest,
  getMenuFeedbackSummaryRequest,
} from "@/lib/api";
import { compareBranchIds, formatBranchAmount, formatScore } from "@/lib/branch-detail";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { listMerchantOrders } from "@/lib/ordering-api";
import { listMenuUsers, parseStaffRole, STAFF_ROLE_LABEL } from "@/lib/waiter-api";
import { reportingPeriodRange, toAmount } from "@/reporting";
import { buildOverview } from "@/views/dashboard/branch-detail-overview-model";

type BranchDetailViewProps = { branchId: number };

export default function BranchDetailView({ branchId }: BranchDetailViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<BranchDetailTab>("overview");
  const branchQuery = useBranch(branchId);
  const branchesQuery = useBranches(true);
  const branch = branchQuery.data;
  useDashboardPageLabel(branch?.name);

  const week = useMemo(() => reportingPeriodRange("7d"), []);
  const summaryQuery = useBranchSummaryAnalytics(branchId, null, week.from, week.to);
  const revenueQuery = useBranchRevenueReport(branchId, null, week.from, week.to);
  const menuId = branch?.menus[0]?.menuId ?? null;
  const ordersQuery = useQuery({
    queryKey: ["branchDetailOrders", menuId],
    queryFn: () => listMerchantOrders(menuId as number),
    enabled: menuId != null,
    retry: false,
    staleTime: 30_000,
  });
  const usersQuery = useQuery({
    queryKey: ["branchDetailUsers", branchId],
    queryFn: () => listMenuUsers(branchId),
    enabled: branchId > 0,
    retry: false,
    staleTime: 60_000,
  });
  const ratingQuery = useQuery({
    queryKey: ["branchDetailRating", menuId],
    queryFn: () => getMenuFeedbackSummaryRequest(menuId as number),
    enabled: menuId != null,
    staleTime: 60_000,
  });
  const reviewsQuery = useQuery({
    queryKey: ["branchDetailReviews", menuId],
    queryFn: () => getMenuFeedbackRequest(menuId as number, { size: 8 }),
    enabled: menuId != null,
    staleTime: 60_000,
  });
  const branches = branchesQuery.data?.content;
  const ids = useMemo(() => compareBranchIds(branches ?? [], branchId), [branches, branchId]);
  const compareQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: branchSummaryAnalyticsQueryKey(id, null, week.from, week.to),
      queryFn: () => getBranchSummaryAnalyticsRequest(id, week.from, week.to, null),
      enabled: ids.length > 0,
      staleTime: 60_000,
    })),
  });

  if (branchQuery.isLoading) {
    return <DashboardLoadingState label="Şube yükleniyor…" />;
  }
  if (!branch) {
    return <p className="text-sm text-muted-foreground">Şube bulunamadı.</p>;
  }

  const currency = revenueQuery.data?.kpis.currency ?? summaryQuery.data?.overview.currency;
  const compare = compareRows(ids, branches ?? [], compareQueries, currency);
  const staff = staffRows(usersQuery.data?.waiters ?? []);
  const reviews = reviewRows(reviewsQuery.data?.content ?? []);
  const menus = menuRows(branch);
  const overview = buildOverview(branch, currency, week, {
    summary: summaryQuery.data,
    summaryReady: summaryQuery.isSuccess,
    revenue: revenueQuery.data,
    revenueReady: revenueQuery.isSuccess,
    orders: ordersQuery.data ?? [],
    qrId: branch.menus[0]?.qrId ?? null,
    ratingAvg: ratingQuery.data?.menu.ratingAvg,
    ratingCount: ratingQuery.data?.menu.ratingCount ?? 0,
    reviews,
  });

  return (
    <BranchDetailPanel
      branchId={branchId}
      name={branch.name}
      branches={(branches ?? []).map((item) => ({ id: item.id, name: item.name }))}
      tab={tab}
      onTab={setTab}
      onSelectBranch={(nextId) => router.push(DASHBOARD_ROUTES.branchDetail(nextId))}
      overview={overview}
      compare={compare}
      staff={staff}
      reviews={reviews}
      menus={menus}
    />
  );
}

function compareRows(
  ids: number[],
  branches: Array<{ id: number; name: string }>,
  queries: Array<{ isSuccess: boolean; data?: { overview: { grossRevenue?: number | string | null } } }>,
  currency?: string | null,
): CompareRow[] {
  return ids.map((id, index) => {
    const query = queries[index];
    const value = query?.isSuccess ? toAmount(query.data?.overview.grossRevenue) : 0;
    return {
      id,
      label: branches.find((item) => item.id === id)?.name ?? "Şube",
      amount: query?.isSuccess ? formatBranchAmount(value, currency) : "—",
      value,
    };
  });
}

function staffRows(waiters: Array<{ id: number; displayName: string; staffRole?: string | null }>): StaffRow[] {
  return waiters.map((waiter) => ({
    id: waiter.id,
    name: waiter.displayName,
    role: STAFF_ROLE_LABEL[parseStaffRole(waiter.staffRole)],
  }));
}

function reviewRows(
  items: Array<{ id: number; productName?: string | null; score: number; comment?: string | null }>,
): ReviewRow[] {
  return items.map((item) => ({
    id: item.id,
    title: item.productName?.trim() || "Menü",
    score: formatScore(item.score),
    comment: item.comment?.trim() || "",
  }));
}

function menuRows(branch: { menus: Array<{ menuId: number; qrId: number; businessName: string }> }): MenuRow[] {
  return branch.menus.map((menu) => ({
    menuId: menu.menuId,
    qrId: menu.qrId,
    name: menu.businessName?.trim() || `Menü #${menu.qrId}`,
  }));
}
