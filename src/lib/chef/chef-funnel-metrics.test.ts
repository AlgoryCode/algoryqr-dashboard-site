import { describe, expect, it } from "vitest";

import type { MenuAnalyticsReportResponse } from "@/lib/api";

import { computeChefFunnelMetrics } from "./chef-funnel-metrics";

describe("computeChefFunnelMetrics", () => {
  it("aggregates CHEF_* steps from sample journeys", () => {
    const visits: MenuAnalyticsReportResponse = {
      from: "2026-01-01",
      to: "2026-01-07",
      kpis: {
        sessions: 1,
        menuOpens: 1,
        productViews: 0,
        categoryViews: 0,
        avgProductsPerSession: 0,
      },
      daily: [],
      hourly: [],
      devices: [],
      topProducts: [],
      topCategories: [],
      categoryProductTree: [],
      sampleJourneys: [
        {
          sessionId: "s1",
          startedAt: "2026-01-01T10:00:00",
          steps: [
            { type: "CHEF_CHAT_OPEN", name: "", at: "2026-01-01T10:00:01" },
            { type: "CHEF_RECOMMENDATION_SHOWN", name: "", at: "2026-01-01T10:00:05" },
            { type: "CHEF_PRODUCT_ADD", name: "", at: "2026-01-01T10:00:10" },
            { type: "ORDER_SUBMITTED", name: "", at: "2026-01-01T10:01:00" },
          ],
        },
      ],
      funnel: { menuOpens: 1, categoryViews: 0, productViews: 0 },
    };

    const metrics = computeChefFunnelMetrics(visits);
    expect(metrics.chatOpens).toBe(1);
    expect(metrics.recommendationShown).toBe(1);
    expect(metrics.productAdds).toBe(1);
    expect(metrics.ordersSubmitted).toBe(1);
    expect(metrics.recommendationToAddRate).toBe(1);
  });
});
