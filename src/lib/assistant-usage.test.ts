import { describe, expect, it } from "vitest";

import {
  allowanceFromUsage,
  classifyAssistantTopic,
  isAllowanceExhausted,
  type MeteredUsage,
} from "./assistant-usage";

const usage = (over: Partial<MeteredUsage>): MeteredUsage => ({
  feature: "ASSISTANT_QUESTION",
  period: "2026-11-17",
  used: 0,
  limit: 5,
  remaining: 5,
  unlimited: false,
  resetsAt: "2026-11-17T21:00:00Z",
  ...over,
});

describe("classifyAssistantTopic", () => {
  it.each([
    ["Bu hafta ciro ne kadar?", "REVENUE"],
    ["Dün kaç SİPARİŞ geldi?", "ORDERS"],
    ["En çok satan ürün hangisi?", "PRODUCTS"],
    ["Hangi garson daha çok bahşiş aldı?", "STAFF"],
    ["Menüm kaç kez görüntülendi?", "MENU"],
    ["Merhaba, nasılsın?", "GENERAL"],
  ] as const)("%s → %s", (message, topic) => {
    expect(classifyAssistantTopic(message)).toBe(topic);
  });

  it("prefers staff over revenue when both are asked", () => {
    expect(classifyAssistantTopic("Personel bazında ciro")).toBe("STAFF");
  });
});

describe("allowanceFromUsage", () => {
  it("has no limit on plans with the assistant", () => {
    const allowance = allowanceFromUsage(usage({ used: 40, limit: null, remaining: null, unlimited: true }));
    expect(allowance).toEqual({ limit: null, used: 40, remaining: null });
    expect(isAllowanceExhausted(allowance)).toBe(false);
  });

  it("counts down the free daily questions", () => {
    expect(allowanceFromUsage(usage({ used: 0 })).remaining).toBe(5);
    expect(allowanceFromUsage(usage({ used: 3 })).remaining).toBe(2);
  });

  it("is exhausted at the limit and never goes negative", () => {
    const allowance = allowanceFromUsage(usage({ used: 7 }));
    expect(allowance.remaining).toBe(0);
    expect(isAllowanceExhausted(allowance)).toBe(true);
  });
});
