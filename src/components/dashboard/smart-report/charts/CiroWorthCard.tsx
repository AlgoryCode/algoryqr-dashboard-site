"use client";

import { useId } from "react";
import { ArrowDown, ArrowUp, Wallet } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

import type { CiroWorthPoint } from "../shadcn-charts";

const CIRO_LINE = "#22c55e";

const WORTH_CONFIG = {
  value: { label: "Ciro", color: CIRO_LINE },
} satisfies ChartConfig;

export function CiroWorthCard({
  total,
  delta,
  points,
  formatValue,
}: {
  total: string;
  delta: number | null;
  points: CiroWorthPoint[];
  formatValue: (value: number) => string;
}) {
  return (
    <Card className="overflow-hidden pb-1">
      <WorthHeader total={total} delta={delta} />
      <WorthChart points={points} formatValue={formatValue} />
    </Card>
  );
}

function WorthHeader({ total, delta }: { total: string; delta: number | null }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-normal leading-none text-neutral-600">Ciro</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
          <Wallet className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
        <p className="text-[2rem] font-bold leading-none tracking-tight text-neutral-950">{total}</p>
        <DeltaCaption value={delta} />
      </div>
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
}: {
  points: CiroWorthPoint[];
  formatValue: (value: number) => string;
}) {
  const gradientId = useId().replace(/:/g, "");
  if (points.length < 2) return null;
  return (
    <ChartContainer config={WORTH_CONFIG} className="mt-2 aspect-auto h-[140px] w-full">
      <AreaChart data={points} margin={{ top: 18, right: 20, left: 20, bottom: 0 }}>
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
          content={<WorthTooltip formatValue={formatValue} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CIRO_LINE}
          strokeWidth={2.25}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4.5, fill: CIRO_LINE, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function WorthTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[10.5rem] rounded-xl border border-neutral-200/80 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
      <p className="text-[13px] font-medium text-neutral-900">{label}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-[#22c55e]" />
        <span className="text-neutral-500">Cirom</span>
        <span className="ml-auto pl-4 font-medium tabular-nums text-neutral-900">
          {formatValue(Number(payload[0]?.value ?? 0))}
        </span>
      </div>
    </div>
  );
}
