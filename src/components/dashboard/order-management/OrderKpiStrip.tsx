"use client";

import { formatMenuPrice } from "@/components/menu-templates/types";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

type OrderKpiStripProps = {
  integrationRevenue: number;
  tableRevenue: number;
  openOrders: number;
  pendingOrders: number;
  averageBasket: number;
  tipTotal: number;
  includeTips: boolean;
  currency: string;
  openSelected?: boolean;
  onSelectOpen?: () => void;
};

export function OrderKpiStrip({
  integrationRevenue,
  tableRevenue,
  openOrders,
  pendingOrders,
  averageBasket,
  tipTotal,
  includeTips,
  currency,
  openSelected,
  onSelectOpen,
}: OrderKpiStripProps) {
  const rows = [
    {
      key: "integrations",
      label: "Entegrasyon kazancı",
      value: formatMenuPrice(integrationRevenue, currency) || "₺0",
      hint: "Online, Uber Eats, Yemeksepeti",
    },
    {
      key: "tables",
      label: "Masa kazancı",
      value: formatMenuPrice(tableRevenue, currency) || "₺0",
      hint: "QR masa ve garson",
    },
    {
      key: "open",
      label: "Açık sipariş",
      value: openOrders.toLocaleString("tr-TR"),
      hint: pendingOrders > 0 ? `${pendingOrders.toLocaleString("tr-TR")} onay bekliyor` : "Şu an işlenen",
      onClick: onSelectOpen,
      selected: openSelected,
    },
    {
      key: "basket",
      label: includeTips ? "Bahşiş" : "Ort. sepet",
      value: formatMenuPrice(includeTips ? tipTotal : averageBasket, currency) || "₺0",
      hint: includeTips ? "Dönem toplamı" : "Sipariş başına",
    },
  ];

  return (
    <div className={`${DASHBOARD_SURFACE} flex h-full flex-col justify-center gap-0 px-5 py-4 sm:px-6`}>
      {rows.map((row, index) => {
        const body = (
          <>
            <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{row.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{row.hint}</p>
          </>
        );
        const className = cn(
          "py-4 text-left",
          index < rows.length - 1 && "border-b border-border/70",
          row.selected && "rounded-2xl bg-muted/60 px-2",
        );
        if (row.onClick) {
          return (
            <button
              key={row.key}
              type="button"
              onClick={row.onClick}
              className={cn(
                className,
                "w-full cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {body}
            </button>
          );
        }
        return (
          <div key={row.key} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
