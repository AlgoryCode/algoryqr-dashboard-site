"use client";

import { BarChart3, ShieldAlert, Trophy } from "lucide-react";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  hourlyOrderSeries,
  topProductShares,
  type TopProductShare,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

type OrderLiveInsightsProps = {
  orders: OrderResponse[];
  currency: string;
  cancelledCount: number;
  delayedCount: number;
};

export function OrderLiveInsights({
  orders,
  currency,
  cancelledCount,
  delayedCount,
}: OrderLiveInsightsProps) {
  const products = topProductShares(orders, 5);
  const hourly = hourlyOrderSeries(orders).slice(12, 23);
  const maxOrders = Math.max(1, ...hourly.map((point) => point.orders));
  const peakHour = hourly.reduce(
    (best, point) => (point.orders > best.orders ? point : best),
    hourly[0] ?? { hour: "—", orders: 0, revenue: 0 },
  );
  const currentHour = new Date().getHours();

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-7">
        <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="text-[15px] font-bold text-foreground">Günün En Çok Satan Ürünleri</h3>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top 5 Performans
          </span>
        </div>
        <div className="space-y-2">
          {products.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Henüz ürün satışı yok.</p>
          ) : (
            products.map((product, index) => (
              <ProductRow
                key={product.name}
                product={product}
                rank={index + 1}
                currency={currency}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-5">
        <div>
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-[15px] font-bold text-foreground">Saatlik Yoğunluk &amp; Güvenlik</h3>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">12:00 - 23:00</span>
          </div>

          <div className="mt-4 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sipariş yoğunluk dağılımı (saatlik)
            </span>
            <div className="flex h-28 items-end justify-between gap-1.5 rounded-xl border border-border bg-muted/40 px-3 pt-4">
              {hourly.map((point) => {
                const hourNum = Number(point.hour.slice(0, 2));
                const height = Math.max(8, Math.round((point.orders / maxOrders) * 100));
                const isPeak = point.hour === peakHour.hour && peakHour.orders > 0;
                const isCurrent = hourNum === currentHour;
                return (
                  <div key={point.hour} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full rounded-t",
                        isPeak && "bg-primary shadow-sm",
                        isCurrent && !isPeak && "bg-sky-500",
                        !isPeak && !isCurrent && point.orders > maxOrders * 0.55 && "bg-orange-300",
                        !isPeak && !isCurrent && point.orders <= maxOrders * 0.55 && "bg-slate-200 dark:bg-slate-700",
                      )}
                      style={{ height: `${height}%` }}
                      title={`${point.hour}: ${point.orders} sipariş`}
                    />
                    <span
                      className={cn(
                        "text-[9px] font-semibold",
                        isPeak ? "font-bold text-primary" : isCurrent ? "font-bold text-sky-700" : "text-muted-foreground",
                      )}
                    >
                      {String(hourNum).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                İptal / İade
              </span>
              <span className="text-[14px] font-bold text-emerald-800 dark:text-emerald-300">
                {cancelledCount} İptal
              </span>
            </div>
            <ShieldAlert className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 dark:border-rose-900 dark:bg-rose-950/30">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Gecikme uyarısı
              </span>
              <span className="text-[14px] font-bold text-rose-600">{delayedCount} Sipariş</span>
            </div>
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductRow({
  product,
  rank,
  currency,
}: {
  product: TopProductShare;
  rank: number;
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:bg-muted/70">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-5 text-[13px] font-extrabold",
            rank === 1 ? "text-primary" : "text-muted-foreground",
          )}
        >
          {String(rank).padStart(2, "0")}
        </span>
        <div>
          <div className="text-[13px] font-bold text-foreground">{product.name}</div>
          <div className="text-[11px] text-muted-foreground">%{product.share.toFixed(0)} pay</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-bold tabular-nums text-foreground">
          {formatMenuPrice(product.revenue, currency) || "₺0"}
        </div>
        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          {product.quantity} Porsiyon
        </div>
      </div>
    </div>
  );
}
