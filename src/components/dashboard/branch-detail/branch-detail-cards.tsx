"use client";

import Link from "next/link";
import { BarChart3, Megaphone, Package, ShoppingBag, Users, UtensilsCrossed } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

const CARD =
  "rounded-2xl border border-black/[0.04] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:border-border dark:bg-card";

export type RecentOrder = {
  id: number;
  qrId: number | null;
  customer: string;
  amount: string;
  status: string;
  time: string;
};

export type ProductRow = { name: string; quantity: number; revenue: string };
export type ActivityRow = { id: number; title: string; detail: string };

export function RecentOrders({ qrId, orders }: { qrId: number | null; orders: RecentOrder[] }) {
  const href = qrId != null ? DASHBOARD_ROUTES.waiterForQr(qrId) : DASHBOARD_ROUTES.waiter;
  return (
    <article className={cn(CARD, "p-4")}>
      <SectionTitle title="Son siparişler" href={href} />
      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Bu menüde açık sipariş listesi yok.</p>
      ) : (
        <OrderTable orders={orders} />
      )}
    </article>
  );
}

export function TopProducts({ qrId, products }: { qrId: number | null; products: ProductRow[] }) {
  const href = qrId != null ? DASHBOARD_ROUTES.digitalMenuProductsForQr(qrId) : DASHBOARD_ROUTES.digitalMenu;
  return (
    <article className={cn(CARD, "p-4")}>
      <SectionTitle title="En çok satan ürünler" href={href} />
      {products.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Bu dönemde satılan ürün yok.</p>
      ) : (
        <ProductList products={products} />
      )}
    </article>
  );
}

export function QuickActions({ branchId, qrId }: { branchId: number; qrId: number | null }) {
  return (
    <article className={cn(CARD, "p-4")}>
      <h2 className="text-sm font-semibold text-foreground">Hızlı işlemler</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions(branchId, qrId).map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 rounded-xl px-1 py-2 text-sm text-foreground hover:bg-muted/60"
          >
            <span className={cn("flex size-8 items-center justify-center rounded-lg", action.tone)}>
              <action.icon className="size-4" />
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function Activities({ qrId, activities }: { qrId: number | null; activities: ActivityRow[] }) {
  const href = qrId != null ? DASHBOARD_ROUTES.feedbackForQr(qrId) : DASHBOARD_ROUTES.feedback;
  return (
    <article className={cn(CARD, "p-4")}>
      <SectionTitle title="Son yorumlar" href={href} />
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Bu şube için yorum yok.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {activities.map((item) => (
            <li key={item.id} className="flex gap-2.5">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />
              <div className="min-w-0">
                <p className="text-sm text-foreground">{item.title}</p>
                {item.detail ? <p className="truncate text-xs text-muted-foreground">{item.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function OrderTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">#</th>
            <th className="pb-2 font-medium">Müşteri</th>
            <th className="pb-2 font-medium">Tutar</th>
            <th className="pb-2 font-medium">Durum</th>
            <th className="pb-2 text-right font-medium">Saat</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-border/70">
              <td className="py-2.5 text-muted-foreground">
                <Link href={DASHBOARD_ROUTES.waiterOrderDetail(order.id, order.qrId)} className="hover:text-foreground">
                  #{order.id}
                </Link>
              </td>
              <td className="max-w-[8rem] truncate py-2.5">{order.customer}</td>
              <td className="py-2.5 tabular-nums">{order.amount}</td>
              <td className="py-2.5">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass(order.status))}>
                  {order.status}
                </span>
              </td>
              <td className="py-2.5 text-right tabular-nums text-muted-foreground">{order.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductList({ products }: { products: ProductRow[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {products.map((product, index) => (
        <li key={product.name} className="flex items-center gap-3">
          <span className="w-4 text-sm text-muted-foreground">{index + 1}</span>
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
            {product.name.slice(0, 1).toLocaleUpperCase("tr-TR")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.quantity.toLocaleString("tr-TR")} adet</p>
          </div>
          <span className="text-sm font-medium tabular-nums text-foreground">{product.revenue}</span>
        </li>
      ))}
    </ol>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Link href={href} className="text-xs font-medium text-sky-600 hover:underline">
        Tümünü gör
      </Link>
    </div>
  );
}

function actions(branchId: number, qrId: number | null) {
  return [
    { label: "Siparişler", href: qrId != null ? DASHBOARD_ROUTES.waiterForQr(qrId) : DASHBOARD_ROUTES.waiter, icon: ShoppingBag, tone: "bg-sky-100 text-sky-600" },
    { label: "Kampanya", href: qrId != null ? DASHBOARD_ROUTES.campaignsForQr(qrId) : DASHBOARD_ROUTES.campaigns, icon: Megaphone, tone: "bg-violet-100 text-violet-600" },
    { label: "Ürünler", href: qrId != null ? DASHBOARD_ROUTES.digitalMenuProductsForQr(qrId) : DASHBOARD_ROUTES.digitalMenu, icon: UtensilsCrossed, tone: "bg-emerald-100 text-emerald-600" },
    { label: "Stok", href: DASHBOARD_ROUTES.stockForBranch(branchId), icon: Package, tone: "bg-amber-100 text-amber-600" },
    { label: "Rapor", href: DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId, qrId), icon: BarChart3, tone: "bg-blue-100 text-blue-600" },
    { label: "Personel", href: DASHBOARD_ROUTES.menuUsersForBranch(branchId), icon: Users, tone: "bg-rose-100 text-rose-600" },
  ];
}

function statusClass(status: string): string {
  if (status === "Hazırlanıyor" || status === "Onay bekliyor" || status === "Alındı") return "bg-amber-100 text-amber-800";
  if (status === "Teslim edildi" || status === "Müşteriye teslim" || status === "Hazır" || status === "Yolda") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "İptal edildi" || status === "Reddedildi") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export { CARD };
