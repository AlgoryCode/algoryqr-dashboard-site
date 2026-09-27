import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { MenuProductApiItem } from "@/lib/api";
import {
  formatChefQualityReport,
  runChefRecommendationQualitySuite,
  type ChefQualityTurn,
} from "@/lib/chef/evaluate-chef-recommendation-quality";

const path = join(process.cwd(), "docs/chef-recommendation-quality-scenarios.json");
const suite = JSON.parse(readFileSync(path, "utf8")) as {
  catalogId?: string;
  catalog: MenuProductApiItem[];
  turns: ChefQualityTurn[];
};

const report = runChefRecommendationQualitySuite(suite);
const text = formatChefQualityReport(report);
console.log(text);

if (report.failedChecks > 0) {
  process.exitCode = 1;
}
