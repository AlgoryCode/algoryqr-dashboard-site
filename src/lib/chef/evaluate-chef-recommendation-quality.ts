import type { MenuProductApiItem } from "@/lib/api";

import { searchChefCatalogByUserQuery } from "@/lib/chef/chef-catalog-search";
import { isPairingUserQuery } from "@/lib/chef/chef-user-query-intent";
import { resolveChefPairingRecommendations } from "@/lib/chef/chef-pairing-recommendations";
import { rankChefRecommendations } from "@/lib/chef/rank-chef-recommendations";
import { mapMenuProductToChefItem } from "@/lib/chef/map-menu-product-to-chef-item";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";

export type ChefQualityExpect = {
  kind?: "category" | "product" | "pairing" | "none" | "agent";
  pairing?: boolean;
  mustIncludeProductIds?: number[];
  mustNotIncludeProductIds?: number[];
  minCount?: number;
  maxCount?: number;
};

export type ChefQualityTurn = {
  id: string;
  userQuery: string;
  agentProductIds?: number[];
  recentlyShownProductIds?: number[];
  cartProductIds?: number[];
  expect: ChefQualityExpect;
};

export type ChefQualityCheck = {
  name: string;
  pass: boolean;
  detail?: string;
};

export type ChefQualityTurnResult = {
  id: string;
  userQuery: string;
  kind: string;
  productIds: number[];
  productNames: string[];
  checks: ChefQualityCheck[];
  passed: number;
  failed: number;
  score: number;
};

export type ChefQualityReport = {
  catalogId?: string;
  turns: ChefQualityTurnResult[];
  passedChecks: number;
  failedChecks: number;
  score: number;
};

function agentItemsFromIds(catalog: MenuProductApiItem[], ids: number[] = []): ChefProductItem[] {
  const byId = new Map(catalog.map((entry) => [entry.productId, entry]));
  return ids
    .map((id) => byId.get(id))
    .filter((entry): entry is MenuProductApiItem => Boolean(entry))
    .map(mapMenuProductToChefItem);
}

function evaluateExpect(
  expect: ChefQualityExpect,
  kind: string,
  products: ChefProductItem[],
): ChefQualityCheck[] {
  const ids = products.map((item) => item.productId);
  const checks: ChefQualityCheck[] = [];

  if (expect.kind) {
    checks.push({
      name: `kind=${expect.kind}`,
      pass: kind === expect.kind,
      detail: `got ${kind}`,
    });
  }
  if (expect.minCount != null) {
    checks.push({
      name: `minCount>=${expect.minCount}`,
      pass: products.length >= expect.minCount,
      detail: `got ${products.length}`,
    });
  }
  if (expect.maxCount != null) {
    checks.push({
      name: `maxCount<=${expect.maxCount}`,
      pass: products.length <= expect.maxCount,
      detail: `got ${products.length}`,
    });
  }
  if (expect.mustIncludeProductIds?.length) {
    const missing = expect.mustIncludeProductIds.filter((id) => !ids.includes(id));
    checks.push({
      name: "mustIncludeProductIds",
      pass: missing.length === 0,
      detail: missing.length ? `missing ${missing.join(",")}` : undefined,
    });
  }
  if (expect.mustNotIncludeProductIds?.length) {
    const leaked = expect.mustNotIncludeProductIds.filter((id) => ids.includes(id));
    checks.push({
      name: "mustNotIncludeProductIds",
      pass: leaked.length === 0,
      detail: leaked.length ? `leaked ${leaked.join(",")}` : undefined,
    });
  }
  return checks;
}

/**
 * Ajan birincil: productIds varsa onlar kullanılır.
 * Boşsa yalnızca bu menünün kategori/ürün metni ile yedek.
 */
export function runChefRecommendationQualityTurn(
  catalog: MenuProductApiItem[],
  turn: ChefQualityTurn,
): ChefQualityTurnResult {
  const cartProductIds = turn.cartProductIds ?? [];
  const agentProducts = agentItemsFromIds(catalog, turn.agentProductIds);
  const pairing = isPairingUserQuery(turn.userQuery);

  let kind = "none";
  let candidates: ChefProductItem[] = [];

  if (pairing) {
    kind = "pairing";
    candidates = resolveChefPairingRecommendations(
      agentProducts,
      catalog,
      turn.userQuery,
      cartProductIds,
    ).products;
  } else if (agentProducts.length > 0) {
    kind = "agent";
    candidates = agentProducts.filter((item) => !cartProductIds.includes(item.productId));
  } else {
    const search = searchChefCatalogByUserQuery(catalog, turn.userQuery, cartProductIds);
    kind = search.kind;
    candidates = search.products;
  }

  const products = rankChefRecommendations(
    candidates,
    catalog,
    cartProductIds,
    turn.recentlyShownProductIds ?? [],
    [],
    { maxPerMainCategory: 6, excludeRecentlyShown: kind === "none" },
  );

  const checks = evaluateExpect(turn.expect, kind, products);
  if (turn.expect.pairing) {
    checks.unshift({ name: "pairing", pass: pairing, detail: pairing ? "detected" : "not pairing" });
  }

  const passed = checks.filter((check) => check.pass).length;
  const failed = checks.length - passed;

  return {
    id: turn.id,
    userQuery: turn.userQuery,
    kind,
    productIds: products.map((item) => item.productId),
    productNames: products.map((item) => item.name),
    checks,
    passed,
    failed,
    score: checks.length === 0 ? 1 : passed / checks.length,
  };
}

export function runChefRecommendationQualitySuite(input: {
  catalogId?: string;
  catalog: MenuProductApiItem[];
  turns: ChefQualityTurn[];
}): ChefQualityReport {
  const turns = input.turns.map((turn) => runChefRecommendationQualityTurn(input.catalog, turn));
  const passedChecks = turns.reduce((sum, turn) => sum + turn.passed, 0);
  const failedChecks = turns.reduce((sum, turn) => sum + turn.failed, 0);
  const total = passedChecks + failedChecks;
  return {
    catalogId: input.catalogId,
    turns,
    passedChecks,
    failedChecks,
    score: total === 0 ? 1 : passedChecks / total,
  };
}

export function formatChefQualityReport(report: ChefQualityReport): string {
  const pct = Math.round(report.score * 100);
  const lines = [
    `Chef recommendation quality: ${pct}% (${report.passedChecks} pass / ${report.failedChecks} fail)`,
    report.catalogId ? `Catalog: ${report.catalogId}` : "",
  ].filter(Boolean);

  for (const turn of report.turns) {
    const mark = turn.failed === 0 ? "PASS" : "FAIL";
    lines.push(
      `- [${mark}] ${turn.id} “${turn.userQuery}” kind=${turn.kind} → ${turn.productNames.join(", ") || "(none)"}`,
    );
    for (const check of turn.checks.filter((row) => !row.pass)) {
      lines.push(`    x ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
    }
  }
  return lines.join("\n");
}
