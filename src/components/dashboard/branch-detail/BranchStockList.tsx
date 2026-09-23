"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { formatQuantity, listIngredients, STOCK_UNIT_LABELS } from "@/lib/stock-api";

export function BranchStockList({ branchId }: { branchId: number }) {
  const ingredients = useQuery({
    queryKey: ["stock-ingredients", branchId, "branch-low"],
    queryFn: () => listIngredients(branchId, { lowOnly: true, page: 0, size: 8 }),
  });
  const rows = ingredients.data?.content ?? [];

  return (
    <article className="mt-5 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Düşük stok</h2>
        <Link href={DASHBOARD_ROUTES.stockForBranch(branchId)} className="text-sm text-muted-foreground hover:text-foreground">
          Stoku yönet
        </Link>
      </div>
      {ingredients.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Yükleniyor…</p> : null}
      {!ingredients.isLoading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Minimumun altında hammadde yok.</p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {rows.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="shrink-0 tabular-nums text-foreground">
              {formatQuantity(item.quantity)} {STOCK_UNIT_LABELS[item.unit]}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
