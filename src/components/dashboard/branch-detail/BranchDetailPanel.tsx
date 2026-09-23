"use client";

import { ChevronDown } from "lucide-react";

import { BranchStockList } from "@/components/dashboard/branch-detail/BranchStockList";
import {
  CompareList,
  ReviewList,
  StaffList,
  type CompareRow,
  type MenuRow,
  type ReviewRow,
  type StaffRow,
} from "@/components/dashboard/branch-detail/BranchDetailLists";
import {
  BranchDetailOverview,
  type BranchOverview,
} from "@/components/dashboard/branch-detail/BranchDetailOverview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type BranchDetailTab = "overview" | "staff" | "stock" | "reviews" | "compare";

const TABS: Array<{ id: BranchDetailTab; label: string }> = [
  { id: "overview", label: "Genel bakış" },
  { id: "staff", label: "Personel" },
  { id: "stock", label: "Stok" },
  { id: "reviews", label: "Yorumlar" },
  { id: "compare", label: "Şube kıyası" },
];

type BranchOption = { id: number; name: string };

type BranchDetailPanelProps = {
  branchId: number;
  name: string;
  branches: BranchOption[];
  tab: BranchDetailTab;
  onTab: (tab: BranchDetailTab) => void;
  onSelectBranch: (branchId: number) => void;
  overview: BranchOverview;
  compare: CompareRow[];
  staff: StaffRow[];
  reviews: ReviewRow[];
  menus: MenuRow[];
};

export function BranchDetailPanel(props: BranchDetailPanelProps) {
  const { name, branches, tab, onTab, onSelectBranch } = props;
  return (
    <section>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Şube Detayı</h1>
          <BranchSwitcher name={name} branches={branches} onSelectBranch={onSelectBranch} />
        </div>
        <TabBar tab={tab} onTab={onTab} />
      </header>
      <BranchDetailBody {...props} />
    </section>
  );
}

function BranchSwitcher({
  name,
  branches,
  onSelectBranch,
}: {
  name: string;
  branches: BranchOption[];
  onSelectBranch: (branchId: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-[14rem] items-center gap-1 text-sm text-muted-foreground">
        <span className="truncate">{name}</span>
        <ChevronDown className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {branches.map((branch) => (
          <DropdownMenuItem key={branch.id} onSelect={() => onSelectBranch(branch.id)}>
            {branch.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TabBar({ tab, onTab }: { tab: BranchDetailTab; onTab: (tab: BranchDetailTab) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTab(item.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            tab === item.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function BranchDetailBody(props: BranchDetailPanelProps) {
  const { tab, branchId, name, overview, compare, staff, reviews, menus } = props;
  if (tab === "overview") {
    return <BranchDetailOverview branchId={branchId} name={name} menus={menus} compare={compare} overview={overview} />;
  }
  return (
    <div className="mt-4">
      <SecondaryTab tab={tab} branchId={branchId} compare={compare} staff={staff} reviews={reviews} />
    </div>
  );
}

function SecondaryTab({
  tab,
  branchId,
  compare,
  staff,
  reviews,
}: {
  tab: Exclude<BranchDetailTab, "overview">;
  branchId: number;
  compare: CompareRow[];
  staff: StaffRow[];
  reviews: ReviewRow[];
}) {
  switch (tab) {
    case "staff":
      return <StaffList branchId={branchId} staff={staff} />;
    case "stock":
      return <BranchStockList branchId={branchId} />;
    case "reviews":
      return <ReviewList reviews={reviews} />;
    case "compare":
      return <CompareList rows={compare} />;
    default: {
      const exhaustive: never = tab;
      return exhaustive;
    }
  }
}
