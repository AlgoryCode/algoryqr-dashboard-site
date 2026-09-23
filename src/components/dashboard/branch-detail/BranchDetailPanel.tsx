"use client";

import Link from "next/link";
import { ChevronDown, FileText, Pencil, Store } from "lucide-react";

import {
  CompareList,
  ReviewList,
  StaffList,
  StockList,
  type CompareRow,
  type MenuRow,
  type ReviewRow,
  type StaffRow,
} from "@/components/dashboard/branch-detail/BranchDetailLists";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WeekBar } from "@/lib/branch-detail";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
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
type Kpi = { label: string; value: string };

type BranchDetailPanelProps = {
  branchId: number;
  name: string;
  meta: string;
  branches: BranchOption[];
  tab: BranchDetailTab;
  onTab: (tab: BranchDetailTab) => void;
  onSelectBranch: (branchId: number) => void;
  kpis: Kpi[];
  bars: WeekBar[];
  compare: CompareRow[];
  staff: StaffRow[];
  reviews: ReviewRow[];
  menus: MenuRow[];
};

export function BranchDetailPanel(props: BranchDetailPanelProps) {
  const { branchId, name, meta, branches, tab, onTab, onSelectBranch } = props;
  return (
    <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] sm:p-6">
      <BranchHeader
        branchId={branchId}
        name={name}
        meta={meta}
        branches={branches}
        onSelectBranch={onSelectBranch}
      />
      <div className="mt-5 flex flex-wrap items-center gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              tab === item.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <BranchDetailBody {...props} />
    </section>
  );
}

function BranchHeader({
  branchId,
  name,
  meta,
  branches,
  onSelectBranch,
}: {
  branchId: number;
  name: string;
  meta: string;
  branches: BranchOption[];
  onSelectBranch: (branchId: number) => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
          <Store className="size-5" />
        </span>
        <div className="min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex max-w-full items-center gap-1 text-left text-lg font-semibold tracking-tight text-foreground">
              <span className="truncate">{name}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {branches.map((branch) => (
                <DropdownMenuItem key={branch.id} onSelect={() => onSelectBranch(branch.id)}>
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {meta ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" className="h-10 rounded-xl bg-background px-4 shadow-none">
          <Link href={DASHBOARD_ROUTES.branchSettings(branchId)}>
            <Pencil />
            Düzenle
          </Link>
        </Button>
        <Button asChild className="h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90">
          <Link href={DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId)}>
            <FileText />
            Rapor al
          </Link>
        </Button>
      </div>
    </header>
  );
}

function BranchDetailBody({ tab, branchId, kpis, bars, compare, staff, reviews, menus }: BranchDetailPanelProps) {
  switch (tab) {
    case "staff":
      return <StaffList branchId={branchId} staff={staff} />;
    case "stock":
      return <StockList menus={menus} />;
    case "reviews":
      return <ReviewList reviews={reviews} />;
    case "compare":
      return <CompareList rows={compare} />;
    case "overview":
      return <Overview kpis={kpis} bars={bars} compare={compare.slice(0, 2)} />;
    default: {
      const exhaustive: never = tab;
      return exhaustive;
    }
  }
}

function Overview({ kpis, bars, compare }: { kpis: Kpi[]; bars: WeekBar[]; compare: CompareRow[] }) {
  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-border bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Haftalık satış trendi</h2>
          <div className="mt-4 flex h-28 items-end gap-3">
            {bars.map((bar) => (
              <div key={bar.date} className="flex h-full flex-1 items-end" title={bar.date}>
                <div
                  className={cn("w-full rounded-md", bar.peak ? "bg-foreground" : "bg-muted")}
                  style={{ height: `${bar.height}%` }}
                />
              </div>
            ))}
          </div>
        </article>
        <CompareList rows={compare} title="Diğer şubelerle kıyas" />
      </div>
    </div>
  );
}
