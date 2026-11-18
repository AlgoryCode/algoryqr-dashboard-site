---
name: spark-metric-card
description: Build a KPI card with a soft, fading trend line (label, big value, delta, colored sparkline that fades in from the left, optional hint or split rows) in the AlgoryQR member dashboard. Use when adding or restyling metric/stat/KPI cards in Raporlar, Akıllı raporlar, Genel bakış or any dashboard screen that shows a number with its daily trend, e.g. "Sipariş", "Ort. sepet", channel revenue cards.
---

# Spark metric card ("fade" KPI card)

The card the team likes: a label, a large value, an optional change (+12%), and under it a colored
trend line that fades in from the left, ends in a dot, and has a soft gradient fill. It first
appeared on the smart report's channel cards ("Masa / QR ₺134.400 · 496 sipariş · %100").

Do not draw a new SVG. Reuse the pieces below.

## Pieces

| Piece | File | Use it for |
|---|---|---|
| `FadeLineSpark` | `src/components/dashboard/smart-report/charts/FadeLineSpark.tsx` | The fading line itself (`values`, `color`, `className`) |
| `SparkKpiStrip` with `spark="fade"` | `src/components/dashboard/smart-report/charts/SparkKpiStrip.tsx` | A grid of report KPI cards with delta and split rows (Raporlar tabs) |
| `MetricTile` | `src/components/dashboard/smart-report/charts/ZentraOverview.tsx` | A single card with label, value, trend badge, spark and one hint line (smart report) |
| `KpiStatCards` | `src/components/dashboard/smart-report/charts/KpiStatCards.tsx` | A 2–4 column row of the same card, falling back to a progress bar when there is no series |

## Recipe: a report KPI row

```tsx
import { SparkKpiStrip } from "@/components/dashboard/smart-report/charts/SparkKpiStrip";
import type { SparkKpi } from "@/components/dashboard/smart-report/shadcn-spark";

const items: SparkKpi[] = [
  {
    title: "Sipariş",
    value: orders.toLocaleString("tr-TR"),
    delta: pctDelta(orders, priorOrders), // number | null, percent
    icon: "users",
    series: dailyOrders,                   // one number per day, oldest first
    splits: [{ label: "Kalem / sipariş", value: "2,4" }],
  },
  { title: "Ort. sepet", value: money(aov), delta: pctDelta(aov, priorAov), icon: "wallet", series: dailyAov },
];

<SparkKpiStrip spark="fade" items={items} />;
```

Build the items in a pure function next to the others in `src/components/dashboard/smart-report/shadcn-spark.ts`
(see `buildCiroSparkKpis`) so they can be unit-tested without rendering.

## Rules

- **Series**: one value per day, oldest first. Pass `[]` when the period has a single point or is all zero
  (see `trend()` in `shadcn-spark.ts`); the card then shows no line instead of a flat one.
- **Color**: leave `color` unset and cards take `--chart-1…5` by position. Set `SparkKpi.color` (or `sparkColor`
  on `MetricTile`) only when a metric has a fixed meaning, e.g. a channel keeps its color across screens.
  Use `hsl(var(--chart-N))` tokens, never hex values, so both themes work.
- **Delta**: percent change against the previous equal period from `pctDelta` in `chart-config.ts`; `null` hides it.
- **Hint / splits**: keep to short facts ("496 sipariş · %100", "En yoğun gün · Cmt"). At most two split rows.
- **Text**: Turkish labels in sentence case ("Ort. sepet", not "ORT. SEPET"); numbers with `tr-TR` formatting
  and money through the screen's `formatMoney`.
- The plain dark line (`spark="line"`, the default) stays for screens that have not been moved to this style;
  switch a screen by adding `spark="fade"`, not by changing the default.

## Where it is used

- Raporlar → Ciro → Genel bakış: `ciro-layout.tsx` (`Sipariş`, `Ort. sepet`).
- Akıllı rapor → Kanallar: `BranchReportDashboard.tsx` via `MetricTile`.

## Check

1. `npx tsc --noEmit -p .` and `npx vitest run src/components/dashboard/smart-report`.
2. Open the screen with a branch that has orders. When local data has none, render the strip with sample
   series on a throwaway page under `src/app/demo/` and delete the page afterwards.
