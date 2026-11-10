"use client";

import Link from "next/link";
import { BellRing, ChevronRight, CircleCheck, Hourglass, type LucideIcon } from "lucide-react";

import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import { OverviewCard } from "@/components/dashboard/overview/OverviewCard";
import { ToneIcon, type Tone } from "@/components/dashboard/tone";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { KITCHEN_KANBAN_SLA_MINUTES } from "@/lib/kitchen-queue";
import type {
  OverviewAlert,
  OverviewAlertKind,
  OverviewAlertTone,
  OverviewOrderQueue,
} from "@/lib/overview-dashboard";

type AttentionItem = {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  action: string;
};

/** Each alert wears the icon of the menu entry it leads to. */
const KIND_ICON: Record<OverviewAlertKind, LucideIcon> = {
  stock: DASHBOARD_NAV_ICONS.stock as LucideIcon,
  reservation: DASHBOARD_NAV_ICONS.reservations as LucideIcon,
  feedback: DASHBOARD_NAV_ICONS.feedback as LucideIcon,
  debt: DASHBOARD_NAV_ICONS.accounting as LucideIcon,
  shift: DASHBOARD_NAV_ICONS.reports as LucideIcon,
};

const ALERT_TONE: Record<OverviewAlertTone, Tone> = { danger: "red", warning: "orange", info: "blue" };

function orderItems(queue: OverviewOrderQueue | null): AttentionItem[] {
  if (!queue) return [];
  const items: AttentionItem[] = [];
  if (queue.pendingApproval > 0) {
    items.push({
      id: "orders-pending",
      icon: BellRing,
      tone: "orange",
      title: `${queue.pendingApproval} sipariş onay bekliyor`,
      detail: "Onaylanana kadar mutfağa düşmez",
      href: `${DASHBOARD_ROUTES.orders}?durum=pending&tarih=7g`,
      action: "Onayla",
    });
  }
  if (queue.delayed > 0) {
    items.push({
      id: "orders-late",
      icon: Hourglass,
      tone: "red",
      title: `${queue.delayed} sipariş gecikti`,
      detail: `${KITCHEN_KANBAN_SLA_MINUTES} dakikayı geçti, hâlâ kapanmadı`,
      href: `${DASHBOARD_ROUTES.orders}?durum=late&tarih=7g`,
      action: "Gör",
    });
  }
  return items;
}

/** What needs a decision now: orders waiting on someone, plus the warnings every module raises. */
export function OverviewAttention({
  queue,
  alerts,
  loading,
}: {
  queue: OverviewOrderQueue | null;
  alerts: OverviewAlert[];
  loading: boolean;
}) {
  const items: AttentionItem[] = [
    ...orderItems(queue),
    ...alerts.map((alert) => ({
      id: alert.id,
      icon: KIND_ICON[alert.kind],
      tone: ALERT_TONE[alert.tone],
      title: alert.title,
      detail: alert.detail,
      href: alert.href,
      action: alert.actionLabel,
    })),
  ];

  return (
    <OverviewCard
      title="Dikkat bekleyenler"
      description={items.length > 0 ? `${items.length} konu sizi bekliyor` : "Siparişler, stok, rezervasyon ve yorumlar"}
      icon={BellRing}
      tone="orange"
      className="h-full"
    >
      {items.length === 0 ? (
        loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <CircleCheck className="size-5 text-[#128C7E] dark:text-[#4ADE80]" aria-hidden />
            <p className="text-sm font-medium text-foreground">Her şey yolunda</p>
            <p className="max-w-xs text-xs text-muted-foreground">Şu an sizden bir işlem bekleyen konu yok.</p>
          </div>
        )
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ToneIcon tone={item.tone} icon={item.icon} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  <span className="hidden sm:inline">{item.action}</span>
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
