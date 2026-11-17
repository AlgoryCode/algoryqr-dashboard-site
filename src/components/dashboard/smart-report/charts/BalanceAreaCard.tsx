"use client";

import Link from "next/link";
import { useId } from "react";
import { Flag, Percent, Receipt, Scale } from "lucide-react";
import { Area, ComposedChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import type { BalancePoint, BalanceSummary } from "../balance-series";
import { DeltaCaption } from "./CiroWorthCard";

const INCOME = "#22c55e";
const EXPENSE = "#f43f5e";

const BALANCE_CONFIG = {
  income: { label: "Gelir", color: INCOME },
  expense: { label: "Sabit gider", color: EXPENSE },
} satisfies ChartConfig;

/**
 * Biriken gelir ile dönem boyunca eşit dağıtılan sabit giderin yarışı. Ciro tutarını tekrar
 * etmez: başlık kârı, alt satır giderin ne zaman karşılandığını söyler.
 */
export function BalanceAreaCard({
  summary,
  delta,
  formatValue,
}: {
  summary: BalanceSummary;
  delta: number | null;
  formatValue: (value: number) => string;
}) {
  const hasExpense = summary.expense > 0;
  return (
    <Card className="overflow-hidden pb-1">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-normal leading-none text-neutral-600 dark:text-muted-foreground">
              Gelir–gider dengesi
            </p>
            <p className="mt-1.5 text-xs text-neutral-400 dark:text-muted-foreground">Sabit giderler düşüldükten sonra kalan</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white dark:bg-foreground dark:text-background">
            <Scale className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
          <p
            className={
              summary.net < 0
                ? "text-[2rem] font-bold leading-none tracking-tight text-red-500"
                : "text-[2rem] font-bold leading-none tracking-tight text-neutral-950 dark:text-foreground"
            }
          >
            {formatValue(summary.net)}
          </p>
          {hasExpense ? <DeltaCaption value={delta} /> : null}
        </div>
      </div>

      {hasExpense ? (
        <>
          <div className="grid grid-cols-1 gap-2 px-5 pt-4 sm:grid-cols-3">
            <Stat icon={Receipt} color={EXPENSE} label="Dönem sabit gideri" value={formatValue(summary.expense)} />
            <Stat
              icon={Percent}
              color={INCOME}
              label="Kâr marjı"
              value={summary.margin == null ? "—" : `%${Math.round(summary.margin).toLocaleString("tr-TR")}`}
            />
            <Stat
              icon={Flag}
              color="#0ea5e9"
              label="Giderin karşılandığı gün"
              value={summary.breakEven ?? `Henüz değil · ${formatValue(summary.shortfall)} eksik`}
            />
          </div>
          <BalanceChart points={summary.points} breakEven={summary.breakEven} formatValue={formatValue} />
        </>
      ) : (
        <div className="mx-5 mb-4 mt-4 rounded-xl border border-dashed border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-border dark:text-muted-foreground">
          Bu dönem için sabit gider girilmemiş; kâr ve başabaş günü hesaplanamıyor.{" "}
          <Link href={DASHBOARD_ROUTES.muhasebe} className="font-medium text-neutral-900 underline underline-offset-2 dark:text-foreground">
            Gider ekle
          </Link>
        </div>
      )}
    </Card>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Receipt;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-neutral-200/80 px-2.5 py-2 dark:border-border">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-neutral-500 dark:text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-semibold tabular-nums text-neutral-950 dark:text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}

function BalanceChart({
  points,
  breakEven,
  formatValue,
}: {
  points: BalancePoint[];
  breakEven: string | null;
  formatValue: (value: number) => string;
}) {
  const id = useId().replace(/:/g, "");
  if (points.length < 2) return null;
  return (
    <ChartContainer config={BALANCE_CONFIG} className="mt-3 aspect-auto h-[220px] w-full">
      <ComposedChart data={points} margin={{ top: 24, right: 20, left: 20, bottom: 0 }}>
        <defs>
          <linearGradient id={`${id}-income`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INCOME} stopOpacity={0.35} />
            <stop offset="100%" stopColor={INCOME} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${id}-expense`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EXPENSE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={EXPENSE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={48}
          tick={{ fontSize: 12, fill: "#a3a3a3" }}
        />
        <YAxis hide width={0} domain={[0, (max: number) => (max <= 0 ? 1 : max * 1.1)]} />
        <ChartTooltip
          cursor={{ stroke: "#e5e5e5", strokeDasharray: "3 3" }}
          wrapperStyle={{ background: "transparent", border: "none", padding: 0, boxShadow: "none" }}
          content={<BalanceTooltip formatValue={formatValue} />}
        />
        {breakEven ? (
          <ReferenceLine
            x={breakEven}
            stroke="#0ea5e9"
            strokeDasharray="4 4"
            label={{ value: "Gider karşılandı", position: "insideTopLeft", fill: "#0ea5e9", fontSize: 11, dy: -18 }}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="expense"
          stroke={EXPENSE}
          strokeWidth={1.75}
          strokeDasharray="5 4"
          fill={`url(#${id}-expense)`}
          dot={false}
          activeDot={{ r: 3.5, fill: EXPENSE, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke={INCOME}
          strokeWidth={2.25}
          fill={`url(#${id}-income)`}
          dot={false}
          activeDot={{ r: 4.5, fill: INCOME, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function BalanceTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { payload?: BalancePoint }[];
  label?: string | number;
  formatValue: (value: number) => string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const gap = point.income - point.expense;
  return (
    <div className="min-w-[11rem] rounded-xl border border-neutral-200/80 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-border dark:bg-card">
      <p className="text-[13px] font-medium text-neutral-900 dark:text-foreground">{label}</p>
      <div className="mt-1.5 space-y-1">
        <TooltipRow color={INCOME} label="Biriken gelir" value={formatValue(point.income)} />
        <TooltipRow color={EXPENSE} label="Biriken gider" value={formatValue(point.expense)} />
      </div>
      <p
        className={
          gap < 0
            ? "mt-1.5 border-t border-neutral-100 pt-1.5 text-xs font-semibold tabular-nums text-red-500 dark:border-border"
            : "mt-1.5 border-t border-neutral-100 pt-1.5 text-xs font-semibold tabular-nums text-[#16a34a] dark:border-border"
        }
      >
        {gap < 0 ? "Açık " : "Fazla "}
        {formatValue(Math.abs(gap))}
      </p>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
      <span className="text-neutral-500 dark:text-muted-foreground">{label}</span>
      <span className="ml-auto pl-4 font-medium tabular-nums text-neutral-900 dark:text-foreground">{value}</span>
    </div>
  );
}
