"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Banknote, CreditCard, Wallet } from "lucide-react";
import { Area, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { CiroWorthPoint } from "../shadcn-charts";

const CIRO_LINE = "#22c55e";
const CASH_LINE = "#f59e0b";
const CARD_LINE = "#6366f1";

const WORTH_CONFIG = {
  value: { label: "Ciro", color: CIRO_LINE },
  cash: { label: "Nakit", color: CASH_LINE },
  card: { label: "Kart", color: CARD_LINE },
} satisfies ChartConfig;

type SeriesKey = "value" | "cash" | "card";

/** Nakit / kredi kartı toplamları (bahşiş hariç). */
export type CiroPaymentSplit = {
  cash: number;
  card: number;
};

export function CiroWorthCard({
  total,
  delta,
  points,
  formatValue,
  split,
}: {
  total: string;
  delta: number | null;
  points: CiroWorthPoint[];
  formatValue: (value: number) => string;
  split?: CiroPaymentSplit;
}) {
  const hasSeriesSplit = points.some((point) => point.cash != null || point.card != null);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ value: true, cash: true, card: true });

  const toggle = (key: SeriesKey) =>
    setVisible((current) => {
      const next = { ...current, [key]: !current[key] };
      // En az bir seri açık kalsın.
      return Object.values(next).some(Boolean) ? next : current;
    });

  return (
    <Card className="overflow-hidden pb-1">
      <WorthHeader total={total} delta={delta} />
      {split ? <PaymentSplitSummary split={split} formatValue={formatValue} /> : null}
      {hasSeriesSplit ? <SeriesToggles visible={visible} onToggle={toggle} /> : null}
      <WorthChart
        points={points}
        formatValue={formatValue}
        showSplit={hasSeriesSplit}
        visible={hasSeriesSplit ? visible : { value: true, cash: false, card: false }}
      />
    </Card>
  );
}

function WorthHeader({ total, delta }: { total: string; delta: number | null }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-normal leading-none text-neutral-600 dark:text-muted-foreground">Ciro</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white dark:bg-foreground dark:text-background">
          <Wallet className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
        <p className="text-[2rem] font-bold leading-none tracking-tight text-neutral-950 dark:text-foreground">{total}</p>
        <DeltaCaption value={delta} />
      </div>
    </div>
  );
}

function PaymentSplitSummary({
  split,
  formatValue,
}: {
  split: CiroPaymentSplit;
  formatValue: (value: number) => string;
}) {
  const sum = split.cash + split.card;
  if (sum <= 0) return null;
  const cashShare = (split.cash / sum) * 100;
  const cardShare = 100 - cashShare;
  const pct = (value: number) => `%${Math.round(value).toLocaleString("tr-TR")}`;

  return (
    <div className="px-5 pt-4" aria-label="Nakit ve kart dağılımı">
      <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-muted" aria-hidden>
        <span className="h-full" style={{ width: `${cashShare}%`, backgroundColor: CASH_LINE }} />
        <span className="h-full" style={{ width: `${cardShare}%`, backgroundColor: CARD_LINE }} />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <SplitItem
          icon={Banknote}
          color={CASH_LINE}
          label="Nakit"
          value={formatValue(split.cash)}
          share={pct(cashShare)}
        />
        <SplitItem
          icon={CreditCard}
          color={CARD_LINE}
          label="Kredi kartı"
          value={formatValue(split.card)}
          share={pct(cardShare)}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-muted-foreground">
        Salon tahsilatı, bahşiş hariç
      </p>
    </div>
  );
}

function SplitItem({
  icon: Icon,
  color,
  label,
  value,
  share,
}: {
  icon: typeof Banknote;
  color: string;
  label: string;
  value: string;
  share: string;
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
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-muted-foreground">
          {label}
          <span className="font-semibold tabular-nums" style={{ color }}>
            {share}
          </span>
        </span>
        <span className="block truncate text-sm font-semibold tabular-nums text-neutral-950 dark:text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}

function SeriesToggles({
  visible,
  onToggle,
}: {
  visible: Record<SeriesKey, boolean>;
  onToggle: (key: SeriesKey) => void;
}) {
  const items: { key: SeriesKey; label: string; color: string }[] = [
    { key: "value", label: "Toplam", color: CIRO_LINE },
    { key: "cash", label: "Nakit", color: CASH_LINE },
    { key: "card", label: "Kart", color: CARD_LINE },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 px-5 pt-3" role="group" aria-label="Grafikte gösterilecek seriler">
      {items.map((item) => {
        const on = visible[item.key];
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on
                ? "border-neutral-200 bg-white text-neutral-900 dark:border-border dark:bg-card dark:text-foreground"
                : "border-dashed border-neutral-200 text-neutral-400 dark:border-border dark:text-muted-foreground",
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: on ? item.color : "transparent", border: `1.5px solid ${item.color}` }}
            />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function DeltaCaption({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded === 0) {
    return <span className="mb-0.5 text-[13px] text-neutral-400">önceki dönemle aynı</span>;
  }
  const up = rounded > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  const tone = up ? "text-[#22c55e]" : "text-red-500";
  const caption = up ? "önceki döneme göre arttı" : "önceki döneme göre azaldı";
  return (
    <span className="mb-0.5 inline-flex items-center gap-1 text-[13px] leading-none">
      <Icon className={`h-3.5 w-3.5 ${tone}`} strokeWidth={2.5} />
      <span className={`font-semibold tabular-nums ${tone}`}>{Math.abs(rounded)}%</span>
      <span className="font-normal text-neutral-400">{caption}</span>
    </span>
  );
}

function WorthChart({
  points,
  formatValue,
  showSplit,
  visible,
}: {
  points: CiroWorthPoint[];
  formatValue: (value: number) => string;
  showSplit: boolean;
  visible: Record<SeriesKey, boolean>;
}) {
  const gradientId = useId().replace(/:/g, "");
  if (points.length < 2) return null;
  return (
    <ChartContainer config={WORTH_CONFIG} className={cn("mt-2 aspect-auto w-full", showSplit ? "h-[170px]" : "h-[140px]")}>
      <ComposedChart data={points} margin={{ top: 18, right: 20, left: 20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CIRO_LINE} stopOpacity={0.38} />
            <stop offset="100%" stopColor={CIRO_LINE} stopOpacity={0} />
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
        <YAxis
          hide
          width={0}
          domain={[
            (min: number) => (min <= 0 ? 0 : min * 0.72),
            (max: number) => (max <= 0 ? 1 : max * 1.12),
          ]}
        />
        <ChartTooltip
          cursor={false}
          wrapperStyle={{ background: "transparent", border: "none", padding: 0, boxShadow: "none" }}
          content={<WorthTooltip formatValue={formatValue} showSplit={showSplit} />}
        />
        {visible.value ? (
          <Area
            type="monotone"
            dataKey="value"
            stroke={CIRO_LINE}
            strokeWidth={2.25}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4.5, fill: CIRO_LINE, strokeWidth: 0 }}
          />
        ) : null}
        {showSplit && visible.cash ? (
          <Line
            type="monotone"
            dataKey="cash"
            stroke={CASH_LINE}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3.5, fill: CASH_LINE, strokeWidth: 0 }}
          />
        ) : null}
        {showSplit && visible.card ? (
          <Line
            type="monotone"
            dataKey="card"
            stroke={CARD_LINE}
            strokeWidth={1.75}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3.5, fill: CARD_LINE, strokeWidth: 0 }}
          />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  );
}

function WorthTooltip({
  active,
  payload,
  label,
  formatValue,
  showSplit,
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: CiroWorthPoint }[];
  label?: string | number;
  formatValue: (value: number) => string;
  showSplit?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const rows: { key: string; label: string; color: string; value: number }[] = [
    { key: "value", label: "Ciro", color: CIRO_LINE, value: Number(point?.value ?? payload[0]?.value ?? 0) },
    ...(showSplit && point
      ? [
          { key: "cash", label: "Nakit", color: CASH_LINE, value: point.cash ?? 0 },
          { key: "card", label: "Kart", color: CARD_LINE, value: point.card ?? 0 },
        ]
      : []),
  ];
  return (
    <div className="min-w-[10.5rem] rounded-xl border border-neutral-200/80 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-border dark:bg-card">
      <p className="text-[13px] font-medium text-neutral-900 dark:text-foreground">{label}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} />
            <span className="text-neutral-500 dark:text-muted-foreground">{row.label}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums text-neutral-900 dark:text-foreground">
              {formatValue(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
