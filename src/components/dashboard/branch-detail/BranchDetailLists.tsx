import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { ACCOUNT_CARD } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

export type ReviewRow = { id: number; title: string; score: string; comment: string };
export type MenuRow = { menuId: number; qrId: number; name: string };
export type StaffRow = { id: number; name: string; role: string };

export function MenuList({ branchId, menus }: { branchId: number; menus: MenuRow[] }) {
  return (
    <RecordList
      title="Menüler"
      actionHref={DASHBOARD_ROUTES.digitalMenuCreateForBranch(branchId)}
      actionLabel="Menü ekle"
      filled={menus.length > 0}
      empty="Bu şubede menü yok."
    >
      {menus.map((menu) => (
        <li key={menu.menuId}>
          <Link href={DASHBOARD_ROUTES.digitalMenuEdit(menu.qrId)} className="block truncate py-2.5 text-sm font-medium text-zinc-950">
            {menu.name}
          </Link>
        </li>
      ))}
    </RecordList>
  );
}

export function StaffList({ branchId, staff }: { branchId: number; staff: StaffRow[] }) {
  return (
    <RecordList
      title="Personel"
      actionHref={DASHBOARD_ROUTES.menuUsersForBranch(branchId)}
      actionLabel="Personel Ekle"
      filled={staff.length > 0}
      empty="Bu şubede personel yok."
    >
      {staff.map((member) => (
        <li key={member.id}>
          <Link
            href={DASHBOARD_ROUTES.menuUserDetail(member.id, branchId)}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="truncate font-medium text-zinc-950">{member.name}</span>
            <span className="shrink-0 text-zinc-950">{member.role}</span>
          </Link>
        </li>
      ))}
    </RecordList>
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

function RecordList({
  title,
  actionHref,
  actionLabel,
  filled,
  empty,
  children,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
  filled: boolean;
  empty: string;
  children: ReactNode;
}) {
  return (
    <article className={cn(ACCOUNT_CARD, "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <AddLink href={actionHref} label={actionLabel} />
      </div>
      {filled ? <ul className="mt-3 divide-y divide-[#ececea]">{children}</ul> : <p className="mt-4 text-sm text-zinc-950">{empty}</p>}
    </article>
  );
}

function AddLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="group h-8 gap-0 border-2 border-primary px-2 font-medium text-primary hover:border-primary hover:bg-transparent hover:text-primary">
      <Link href={href}>
        <span className="inline-flex w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:mr-1.5 group-hover:w-4 group-hover:opacity-100">
          <Plus className="size-4 shrink-0" />
        </span>
        {label}
      </Link>
    </Button>
  );
}

function PanelList({ filled, empty, children }: { filled: boolean; empty: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      {filled ? <ul className="space-y-3">{children}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </article>
  );
}
