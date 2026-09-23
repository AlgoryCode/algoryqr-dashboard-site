"use client";

import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CompareRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { CARD } from "@/components/dashboard/branch-detail/branch-detail-cards";
import { formatBranchAmount } from "@/lib/branch-detail";
import { cn } from "@/lib/utils";

const SLICE = ["#3b82f6", "#a855f7", "#22c55e", "#f97316", "#ec4899", "#94a3b8"];

export function SalesChart({ daily }: { daily: Array<{ label: string; revenue: number }> }) {
  return (
    <article className={cn(CARD, "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Günlük satışlar</h2>
        <span className="text-xs text-muted-foreground">Son 7 gün</span>
      </div>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(value: number) => compactAmount(value)}
            />
            <Tooltip formatter={(value) => formatBranchAmount(Number(value))} />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function CategoryChart({
  categories,
  total,
}: {
  categories: Array<{ name: string; value: number }>;
  total: string;
}) {
  const sum = categories.reduce((acc, item) => acc + item.value, 0);
  return (
    <article className={cn(CARD, "p-4")}>
      <h2 className="text-sm font-semibold text-foreground">Satış dağılımı</h2>
      {categories.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Bu dönemde kategori satışı yok.</p>
      ) : (
        <CategoryBody categories={categories} total={total} sum={sum} />
      )}
    </article>
  );
}

export function Performance({
  weekRevenue,
  weekOrders,
  score,
}: {
  weekRevenue: string;
  weekOrders: string;
  score: string;
}) {
  const items = [
    { label: "Haftalık ciro", value: weekRevenue },
    { label: "Haftalık sipariş", value: weekOrders },
    { label: "Müşteri puanı", value: score },
  ];
  return (
    <article className={cn(CARD, "p-4")}>
      <h2 className="text-sm font-semibold text-foreground">Şube performansı</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-muted/50 px-2 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function CompareChart({ rows }: { rows: CompareRow[] }) {
  return (
    <article className={cn(CARD, "p-4")}>
      <h2 className="text-sm font-semibold text-foreground">Diğer şubelerle karşılaştırma</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Karşılaştırılacak şube yok.</p>
      ) : (
        <div className="mt-4 flex h-28 items-end gap-3">
          {rows.map((row, index) => (
            <div key={row.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-16 w-full items-end justify-center">
                <div
                  className={cn("w-8 rounded-md", index === 0 ? "bg-sky-500" : "bg-slate-300")}
                  style={{ height: barHeight(row.value, rows) }}
                  title={row.amount}
                />
              </div>
              <span className="w-full truncate text-center text-[11px] text-muted-foreground">{row.label}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function CategoryBody({
  categories,
  total,
  sum,
}: {
  categories: Array<{ name: string; value: number }>;
  total: string;
  sum: number;
}) {
  return (
    <div className="mt-2 flex items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={categories} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} stroke="none">
              {categories.map((item, index) => (
                <Cell key={item.name} fill={SLICE[index % SLICE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground">Toplam</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {categories.map((item, index) => (
          <li key={item.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: SLICE[index % SLICE.length] }} />
              <span className="truncate text-foreground">{item.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {sum > 0 ? `%${Math.round((item.value / sum) * 100)}` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function barHeight(value: number, rows: CompareRow[]): string {
  const max = Math.max(0, ...rows.map((row) => row.value));
  if (max <= 0 || value <= 0) return "8px";
  return `${Math.max(18, Math.round((value / max) * 100))}%`;
}

function compactAmount(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}b`;
  return String(Math.round(value));
}
