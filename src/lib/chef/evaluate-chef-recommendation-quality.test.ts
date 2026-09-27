import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { MenuProductApiItem } from "@/lib/api";

import {
  formatChefQualityReport,
  runChefRecommendationQualitySuite,
  type ChefQualityTurn,
} from "./evaluate-chef-recommendation-quality";

type SuiteFile = {
  catalogId?: string;
  catalog: MenuProductApiItem[];
  turns: ChefQualityTurn[];
};

function loadSuite(): SuiteFile {
  const path = join(process.cwd(), "docs/chef-recommendation-quality-scenarios.json");
  return JSON.parse(readFileSync(path, "utf8")) as SuiteFile;
}

describe("chef recommendation quality suite", () => {
  const suite = loadSuite();

  it("does not depend on a hardcoded restaurant or food-name lexicon", () => {
    expect(suite.catalogId).toBe("any-menu");
    expect(suite.turns.some((turn) => (turn.agentProductIds?.length ?? 0) > 0)).toBe(true);
  });

  it("scores agent-first turns at 100%", () => {
    const report = runChefRecommendationQualitySuite(suite);
    if (report.failedChecks > 0) {
      throw new Error(formatChefQualityReport(report));
    }
    expect(report.score).toBe(1);
  });

  it("keeps agent dessert ids and does not invent sushi", () => {
    const report = runChefRecommendationQualitySuite(suite);
    const dessert = report.turns.find((turn) => turn.id === "agent-reads-menu-dessert");
    const sushi = report.turns.find((turn) => turn.id === "no-lexicon-when-menu-has-no-matching-text");
    expect(dessert?.productIds.sort()).toEqual([101, 102]);
    expect(sushi?.productIds).toEqual([]);
  });
});
