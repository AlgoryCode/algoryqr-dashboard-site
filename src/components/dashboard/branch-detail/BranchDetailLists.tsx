import type { ReactNode } from "react";
import Link from "next/link";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

export type CompareRow = { id: number; label: string; amount: string };
export type StaffRow = { id: number; name: string; role: string };
export type ReviewRow = { id: number; title: string; score: string; comment: string };
export type MenuRow = { menuId: number; qrId: number; name: string };

export function CompareList({ rows, title }: { rows: CompareRow[]; title?: string }) {
  return (
    <article className={cn("rounded-2xl border border-border bg-background p-4", title ? "" : "mt-5")}>
      {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
      {rows.length === 0 ? (
        <p className={cn("text-sm text-muted-foreground", title && "mt-4")}>Karşılaştırılacak şube yok.</p>
      ) : (
        <ul className={cn("space-y-3", title && "mt-4")}>
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{row.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">{row.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function StaffList({ branchId, staff }: { branchId: number; staff: StaffRow[] }) {
  return (
    <PanelList
      filled={staff.length > 0}
      empty="Bu şubede personel kaydı yok."
      actionHref={DASHBOARD_ROUTES.menuUsersForBranch(branchId)}
      actionLabel="Personeli yönet"
    >
      {staff.map((member) => (
        <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{member.name}</span>
          <span className="text-muted-foreground">{member.role}</span>
        </li>
      ))}
    </PanelList>
  );
}

export function StockList({ menus }: { menus: MenuRow[] }) {
  return (
    <PanelList filled={menus.length > 0} empty="Bu şubeye bağlı menü yok. Stok, menü ürünlerinden takip edilir.">
      {menus.map((menu) => (
        <li key={menu.menuId} className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{menu.name}</span>
          <Link
            href={DASHBOARD_ROUTES.digitalMenuProductsForQr(menu.qrId)}
            className="text-muted-foreground hover:text-foreground"
          >
            Ürünler
          </Link>
        </li>
      ))}
    </PanelList>
  );
}

export function ReviewList({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <PanelList filled={reviews.length > 0} empty="Bu şube için yorum yok.">
      {reviews.map((review) => (
        <li key={review.id} className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-foreground">{review.title}</span>
            <span className="tabular-nums text-foreground">{review.score}</span>
          </div>
          {review.comment ? <p className="text-muted-foreground">{review.comment}</p> : null}
        </li>
      ))}
    </PanelList>
  );
}

function PanelList({
  filled,
  empty,
  actionHref,
  actionLabel,
  children,
}: {
  filled: boolean;
  empty: string;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <article className="mt-5 rounded-2xl border border-border bg-background p-4">
      {filled ? <ul className="space-y-3">{children}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-4 inline-flex text-sm font-medium text-foreground">
          {actionLabel}
        </Link>
      ) : null}
    </article>
  );
}
