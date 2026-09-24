import { describe, expect, it } from "vitest";

import {
  ACCOUNT_CARD,
  DASHBOARD_HUB_GRID,
  DASHBOARD_SURFACE,
  DASHBOARD_TILE_SQUARE,
  DASHBOARD_TYPE_HINT,
  DASHBOARD_TYPE_KPI,
  DASHBOARD_TYPE_META,
  DASHBOARD_TYPE_SECTION,
  DASHBOARD_TYPE_TILE,
  DASHBOARD_TYPE_TITLE,
  DASHBOARD_PANEL_LG,
} from "./dashboard-surface";

describe("dashboard-surface", () => {
  it("matches the branch square card chrome", () => {
    expect(DASHBOARD_TILE_SQUARE).toBe(
      `group flex aspect-square flex-col items-center justify-center gap-3 ${ACCOUNT_CARD} p-4 transition-colors hover:bg-muted/40`,
    );
    expect(DASHBOARD_SURFACE).toBe(ACCOUNT_CARD);
    expect(DASHBOARD_HUB_GRID).toContain("grid-cols-2");
    expect(ACCOUNT_CARD).toContain("shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_6px_rgba(15,23,42,0.05)]");
    expect(ACCOUNT_CARD).toContain("border-[#ececea]");
  });

  it("keeps the closed type scale", () => {
    expect(DASHBOARD_TYPE_TITLE).toContain("text-2xl");
    expect(DASHBOARD_TYPE_SECTION).toContain("text-base");
    expect(DASHBOARD_TYPE_HINT).toContain("text-sm");
    expect(DASHBOARD_TYPE_TILE).toContain("text-sm");
    expect(DASHBOARD_TYPE_META).toContain("text-xs");
    expect(DASHBOARD_TYPE_KPI).toContain("text-3xl");
    expect(DASHBOARD_PANEL_LG).toContain("border-[#ececea]");
    expect(DASHBOARD_PANEL_LG).toContain("p-6");
  });
});
