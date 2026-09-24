import type { MenuAnalyticsReportResponse } from "@/lib/api";

import { activeWindow } from "./chart-config";

export function buildTrafficView(visits: MenuAnalyticsReportResponse) {
  const devices = visits.devices ?? [];
  const deviceSum = devices.reduce((sum, row) => sum + row.value, 0);
  const products = visits.topProducts ?? [];
  const peakProductViews = Math.max(...products.map((row) => row.views), 1);
  const categories = visits.topCategories ?? [];

  return {
    hourly: activeWindow(
      (visits.hourly ?? []).map((row) => ({
        label: String(row.hour).padStart(2, "0"),
        value: row.views,
      })),
    ),
    deviceTotal: deviceSum.toLocaleString("tr-TR"),
    deviceRows: devices.map((row, index) => ({
      label: row.name,
      value: row.value.toLocaleString("tr-TR"),
      percent: (row.value / (deviceSum || 1)) * 100,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    })),
    topProducts: products.slice(0, 6).map((row, index) => ({
      name: row.name,
      value: row.views.toLocaleString("tr-TR"),
      active: index === 0,
      share: (row.views / peakProductViews) * 100,
    })),
    categoryBars: categories.slice(0, 8).map((row) => ({
      label: row.name.slice(0, 12),
      value: row.views,
    })),
  };
}
