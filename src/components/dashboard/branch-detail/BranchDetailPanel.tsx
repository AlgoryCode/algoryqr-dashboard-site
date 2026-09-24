"use client";

import { ChevronDown } from "lucide-react";

import {
  MenuList,
  ReviewList,
  StaffList,
  type MenuRow,
  type ReviewRow,
  type StaffRow,
} from "@/components/dashboard/branch-detail/BranchDetailLists";
import {
  BranchDetailOverview,
  type BranchOverview,
} from "@/components/dashboard/branch-detail/BranchDetailOverview";
import { Hero } from "@/components/dashboard/branch-detail/branch-detail-hero";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type BranchDetailTab = "overview" | "menus" | "staff" | "reviews";

const TABS: Array<{ id: BranchDetailTab; label: string }> = [
  { id: "overview", label: "Genel bakış" },
  { id: "menus", label: "Menüler" },
  { id: "staff", label: "Personel" },
  { id: "reviews", label: "Yorumlar" },
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
  reviews: ReviewRow[];
  menus: MenuRow[];
  staff: StaffRow[];
};

export function BranchDetailPanel(props: BranchDetailPanelProps) {
  const { name, branches, onSelectBranch } = props;
  return (
    <section>
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Şube Detayı</h1>
        <BranchSwitcher name={name} branches={branches} onSelectBranch={onSelectBranch} />
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

function TabSlide({ tab, onTab }: { tab: BranchDetailTab; onTab: (tab: BranchDetailTab) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onTab(item.id)}
          className={cn(
            "h-8 shrink-0 rounded-full border-2 border-primary bg-background px-3 font-medium text-primary shadow-none hover:bg-primary hover:text-primary-foreground",
            tab === item.id && "bg-primary text-primary-foreground",
          )}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

function BranchDetailBody(props: BranchDetailPanelProps) {
  const { tab, onTab } = props;
  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-3">
        <Hero branchId={props.branchId} name={props.name} overview={props.overview} />
        <TabSlide tab={tab} onTab={onTab} />
      </div>
      <TabPanel {...props} />
    </div>
  );
}

function TabPanel({ tab, branchId, name, overview, reviews, menus, staff }: BranchDetailPanelProps) {
  if (tab === "overview") {
    return <BranchDetailOverview branchId={branchId} name={name} menus={menus} overview={overview} />;
  }
  if (tab === "menus") return <MenuList branchId={branchId} menus={menus} />;
  if (tab === "staff") return <StaffList branchId={branchId} staff={staff} />;
  return <ReviewList reviews={reviews} />;
}
