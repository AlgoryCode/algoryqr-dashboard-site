import { describe, expect, it } from "vitest";

import {
  branchMetaLine,
  branchStatusLabel,
  formatBranchAmount,
  formatCancelPercent,
  formatManagerShort,
  formatScore,
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
});
