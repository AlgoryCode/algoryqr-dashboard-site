"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  BranchDetailPanel,
  type BranchDetailTab,
} from "@/components/dashboard/branch-detail/BranchDetailPanel";
import type { BranchOverview } from "@/components/dashboard/branch-detail/branch-detail-types";
import type { MenuRow, ReviewRow, StaffRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { useDashboardPageLabel } from "@/contexts/dashboard-page-label";
import { useBranch, useBranches } from "@/hooks/use-branches";
import { getMenuFeedbackRequest, getMyActiveMenusRequest, type ActiveMenuSummaryApiItem } from "@/lib/api";
import { formatScore } from "@/lib/branch-detail";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { resolvePublicMenuHref } from "@/lib/public-menu-href";
import {
  listMenuUsers,
  parseStaffRole,
  STAFF_ROLE_LABEL,
} from "@/lib/personnel-management-api";

type BranchDetailViewProps = { branchId: number };

export default function BranchDetailView({ branchId }: BranchDetailViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<BranchDetailTab>("overview");
  const branchQuery = useBranch(branchId);
  const branchesQuery = useBranches(true);
  const branch = branchQuery.data;
  useDashboardPageLabel(branch?.name);

  const menuId = branch?.menus[0]?.menuId ?? null;
  const usersQuery = useQuery({
    queryKey: ["branchDetailUsers", branchId],
    queryFn: () => listMenuUsers(branchId),
    enabled: branchId > 0,
    retry: false,
    staleTime: 60_000,
  });
  const reviewsQuery = useQuery({
    queryKey: ["branchDetailReviews", menuId],
    queryFn: () => getMenuFeedbackRequest(menuId as number, { size: 8 }),
    enabled: menuId != null,
    staleTime: 60_000,
  });
  const activeMenusQuery = useQuery({
    queryKey: ["myActiveMenus"],
    queryFn: getMyActiveMenusRequest,
    staleTime: 60_000,
  });
  const branches = branchesQuery.data?.content;

  if (branchQuery.isLoading) {
    return <DashboardLoadingState label="Şube yükleniyor…" />;
  }
  if (!branch) {
    return <p className="text-sm text-muted-foreground">Şube bulunamadı.</p>;
  }

  const reviews = reviewRows(reviewsQuery.data?.content ?? []);
  const menus = menuRows(branch, activeMenusQuery.data ?? []);
  const staff = staffRows(usersQuery.data?.waiters ?? []);
  const overview = branchOverview(branch);

  return (
    <BranchDetailPanel
      branchId={branchId}
      name={branch.name}
      branches={(branches ?? []).map((item) => ({ id: item.id, name: item.name }))}
      tab={tab}
      onTab={setTab}
      onSelectBranch={(nextId) => router.push(DASHBOARD_ROUTES.branchDetail(nextId))}
      overview={overview}
      reviews={reviews}
      menus={menus}
      staff={staff}
    />
  );
}

function branchOverview(branch: {
  merchantId?: number;
  userId?: number;
  photoUrl?: string | null;
  active: boolean;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  kitchenEnabled?: boolean | null;
  courierEnabled?: boolean | null;
}): BranchOverview {
  return {
    merchantId: branch.merchantId ?? branch.userId ?? 0,
    photoUrl: branch.photoUrl ?? null,
    active: branch.active,
    address: branch.address ?? null,
    phone: branch.phone ?? null,
    email: branch.email ?? null,
    kitchenOn: Boolean(branch.kitchenEnabled),
    courierOn: Boolean(branch.courierEnabled),
  };
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

function menuRows(
  branch: { menus: Array<{ menuId: number; qrId: number; businessName: string }> },
  activeMenus: ActiveMenuSummaryApiItem[],
): MenuRow[] {
  const publicUrlByQr = new Map(activeMenus.map((menu) => [menu.qrId, menu.publicUrl]));
  return branch.menus.map((menu) => ({
    menuId: menu.menuId,
    qrId: menu.qrId,
    name: menu.businessName?.trim() || `Menü #${menu.qrId}`,
    publicHref: resolvePublicMenuHref({ publicUrl: publicUrlByQr.get(menu.qrId) }),
  }));
}
