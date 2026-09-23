"use client";

import { ShoppingBag, ShoppingCart, Users, Wallet } from "lucide-react";

import {
  Activities,
  CARD,
  QuickActions,
  RecentOrders,
  TopProducts,
} from "@/components/dashboard/branch-detail/branch-detail-cards";
import { CategoryChart, CompareChart, Performance, SalesChart } from "@/components/dashboard/branch-detail/branch-detail-charts";
import { Hero, InfoCard } from "@/components/dashboard/branch-detail/branch-detail-hero";
import type { BranchOverview } from "@/components/dashboard/branch-detail/branch-detail-types";
import type { CompareRow, MenuRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { cn } from "@/lib/utils";

export type { BranchOverview };

type BranchDetailOverviewProps = {
  branchId: number;
  name: string;
  menus: MenuRow[];
  compare: CompareRow[];
  overview: BranchOverview;
};

export function BranchDetailOverview({ branchId, name, menus, compare, overview }: BranchDetailOverviewProps) {
  const qrId = menus[0]?.qrId ?? null;
  return (
    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_292px]">
      <MainColumn branchId={branchId} name={name} qrId={qrId} compare={compare} overview={overview} />
      <aside className="space-y-4">
        <InfoCard name={name} menus={menus} overview={overview} />
        <QuickActions branchId={branchId} qrId={qrId} />
        <Activities qrId={qrId} activities={overview.activities} />
      </aside>
    </div>
  );
}

function MainColumn({
  branchId,
  name,
  qrId,
  compare,
  overview,
}: {
  branchId: number;
  name: string;
  qrId: number | null;
  compare: CompareRow[];
  overview: BranchOverview;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <Hero branchId={branchId} name={name} overview={overview} />
      <KpiRow overview={overview} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SalesChart daily={overview.daily} />
        <CategoryChart categories={overview.categories} total={overview.sales} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentOrders qrId={qrId} orders={overview.recentOrders} />
        <TopProducts qrId={qrId} products={overview.products} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Performance weekRevenue={overview.weekRevenue} weekOrders={overview.weekOrders} score={overview.score} />
        <CompareChart rows={compare} />
      </div>
    </div>
  );
}

function KpiRow({ overview }: { overview: BranchOverview }) {
  const cards = [
    { label: "Toplam satış", value: overview.sales, delta: overview.salesDelta, icon: Wallet, tone: "bg-emerald-100 text-emerald-600" },
    { label: "Toplam sipariş", value: overview.orders, delta: null, icon: ShoppingBag, tone: "bg-sky-100 text-sky-600" },
    { label: "Ortalama sepet", value: overview.basket, delta: null, icon: ShoppingCart, tone: "bg-violet-100 text-violet-600" },
    { label: "Menü ziyareti", value: overview.visits, delta: null, icon: Users, tone: "bg-amber-100 text-amber-600" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className={cn(CARD, "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <span className={cn("flex size-9 items-center justify-center rounded-xl", card.tone)}>
              <card.icon className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-[1.65rem] font-semibold tracking-tight text-foreground">{card.value}</p>
          <Delta value={card.delta} />
        </article>
      ))}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) return null;
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  const up = percent >= 0;
  return (
    <p className={cn("mt-2 text-xs font-medium", up ? "text-emerald-600" : "text-rose-600")}>
      {up ? "↑" : "↓"} %{Math.abs(percent).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} önceki döneme göre
    </p>
  );
}
