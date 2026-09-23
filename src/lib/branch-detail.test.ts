import { describe, expect, it } from "vitest";

import type { BranchItem } from "@/lib/branch";
import {
  branchMetaLine,
  branchStatusLabel,
  compareBranchIds,
  formatBranchAmount,
  formatCancelPercent,
  formatManagerShort,
  formatScore,
  weeklyRevenueBars,
} from "@/lib/branch-detail";

describe("branch detail formatting", () => {
  it("formats money, score, and cancel rate", () => {
    expect(formatBranchAmount(18420.4)).toBe("₺18.420");
    expect(formatScore(4.62)).toBe("4,6");
    expect(formatScore(0)).toBe("—");
    expect(formatCancelPercent(0.021)).toBe("%2,1");
    expect(formatCancelPercent(2.1)).toBe("%2,1");
    expect(formatCancelPercent(null)).toBe("—");
  });

  it("builds the header line", () => {
    expect(formatManagerShort("Cem", "Tarık")).toBe("Cem T.");
    expect(formatManagerShort("Cem", null)).toBe("Cem");
    expect(branchStatusLabel(true)).toBe("Açık");
    expect(branchMetaLine(["Moda Cd. No:12", "Açık", "Müdür: Cem T."])).toBe(
      "Moda Cd. No:12 · Açık · Müdür: Cem T.",
    );
  });

  it("marks the tallest day and keeps the current branch first", () => {
    const bars = weeklyRevenueBars(
      ["2026-09-17", "2026-09-18"],
      [
        { date: "2026-09-17", revenue: 100 },
        { date: "2026-09-18T00:00:00", revenue: 400 },
      ],
    );
    expect(bars.map((bar) => bar.peak)).toEqual([false, true]);
    expect(bars[1]?.height).toBe(100);
    expect(compareBranchIds(branches(), 2).slice(0, 2)).toEqual([2, 1]);
  });
});

function branches(): BranchItem[] {
  return [
    { id: 2, userId: 1, name: "Kadıköy", grandfathered: false, active: true, menus: [] },
    { id: 1, userId: 1, name: "Beşiktaş", grandfathered: false, active: true, menus: [] },
    { id: 3, userId: 1, name: "Üsküdar", grandfathered: false, active: true, menus: [] },
  ];
}
