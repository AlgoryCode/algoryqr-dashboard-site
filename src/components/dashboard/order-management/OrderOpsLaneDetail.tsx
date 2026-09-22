"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DateRangeFilter, type DateRangeValue } from "@/components/ui/date-range-filter";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  OPS_LANE_LABEL,
  managedOrderKey,
  type OpsCountGroup,
  type OpsLane,
  type OpsLaneSnapshot,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

import { OrderTicketCard } from "./OrderTicketCard";

type OrderOpsLaneDetailProps = {
  lane: OpsLane;
  snapshot: OpsLaneSnapshot;
  backHref: string;
  includeTips?: boolean;
  delayedKeys?: Set<string>;
  onSelect: (order: OrderResponse) => void;
  menuPicker?: ReactNode;
  range: DateRangeValue;
  onRangeChange: (next: DateRangeValue) => void;
  hasMenu: boolean;
  loading?: boolean;
  error?: ReactNode;
};

function CountSection({
  group,
  unit,
  includeTips,
  delayedKeys,
  onSelect,
}: {
  group: OpsCountGroup;
  unit: string;
  includeTips?: boolean;
  delayedKeys?: Set<string>;
  onSelect: (order: OrderResponse) => void;
}) {
  return (
    <section className={`${DASHBOARD_SURFACE} p-4 sm:p-5`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{group.title}</h2>
        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums text-sm font-semibold text-foreground">{group.count}</span> {unit}
        </p>
      </div>
      {group.orders.length === 0 ? (
        <p className="px-2 py-8 text-center text-xs text-muted-foreground">Bu grupta sipariş yok.</p>
      ) : (
        <div className="space-y-2">
          {group.orders.map((order) => (
            <OrderTicketCard
              key={managedOrderKey(order)}
              order={order}
              includeTips={includeTips}
              delayed={delayedKeys?.has(managedOrderKey(order))}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function OrderOpsLaneDetail({
  lane,
  snapshot,
  backHref,
  includeTips,
  delayedKeys,
  onSelect,
  menuPicker,
  range,
  onRangeChange,
  hasMenu,
  loading,
  error,
}: OrderOpsLaneDetailProps) {
  const groups = [snapshot.primary, snapshot.secondary, snapshot.extra].filter(
    (group): group is OpsCountGroup => group != null,
  );
  const unit = lane === "kitchen" ? "yemek" : "ürün";

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title={OPS_LANE_LABEL[lane]}
        hint={`${snapshot.primary.count} ${snapshot.primary.label} · ${snapshot.secondary.count} ${snapshot.secondary.label}`}
        back={
          <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={menuPicker}
      />

      {error}

      {!hasMenu ? (
        <EmptyState
          title="Menü seçin"
          description="Siparişleri görmek için bir dijital menü seçin."
        />
      ) : loading ? (
        <DashboardLoadingState label="Siparişler yükleniyor..." />
      ) : (
        <>
          <DateRangeFilter value={range} onChange={onRangeChange} />
          <div className={groups.length > 2 ? "grid items-start gap-3 lg:grid-cols-3" : "grid items-start gap-3 lg:grid-cols-2"}>
            {groups.map((group) => (
              <CountSection
                key={group.key}
                group={group}
                unit={unit}
                includeTips={includeTips}
                delayedKeys={delayedKeys}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
