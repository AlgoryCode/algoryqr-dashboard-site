"use client";

import { InfoCard } from "@/components/dashboard/branch-detail/branch-detail-hero";
import type { BranchOverview } from "@/components/dashboard/branch-detail/branch-detail-types";
import type { MenuRow } from "@/components/dashboard/branch-detail/BranchDetailLists";

export type { BranchOverview };

type BranchDetailOverviewProps = {
  branchId: number;
  name: string;
  menus: MenuRow[];
  overview: BranchOverview;
};

export function BranchDetailOverview({ branchId, name, menus, overview }: BranchDetailOverviewProps) {
  return <InfoCard branchId={branchId} name={name} menus={menus} overview={overview} />;
}
