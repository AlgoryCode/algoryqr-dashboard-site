import { describe, expect, it } from "vitest";

import { createRateLimiter, isSameOriginRequest } from "./request-guards";
import { hasUnsafeApiPath } from "./upstream-path-guard";

function request(headers: Record<string, string>): Request {
  return new Request("http://app.test/api/translate", { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("accepts same-origin browser requests", () => {
    expect(
      isSameOriginRequest(request({ "sec-fetch-site": "same-origin", origin: "http://app.test", host: "app.test" })),
    ).toBe(true);
  });

  it("rejects cross-site browser requests", () => {
    expect(isSameOriginRequest(request({ "sec-fetch-site": "cross-site", host: "app.test" }))).toBe(false);
    expect(isSameOriginRequest(request({ origin: "https://evil.example", host: "app.test" }))).toBe(false);
  });

  it("uses the forwarded host behind a proxy", () => {
    expect(
      isSameOriginRequest(
        request({ origin: "https://panel.example.com", host: "10.0.0.5:3000", "x-forwarded-host": "panel.example.com" }),
      ),
    ).toBe(true);
  });

  it("lets non-browser callers through (rate limits cover them)", () => {
    expect(isSameOriginRequest(request({ host: "app.test" }))).toBe(true);
  });
});

describe("createRateLimiter", () => {
  it("enforces the budget per key", () => {
    const consume = createRateLimiter({ windowMs: 60_000, budget: 10 });
    expect(consume("a", 6)).toBe(true);
    expect(consume("a", 5)).toBe(false);
    expect(consume("a", 4)).toBe(true);
    expect(consume("b", 10)).toBe(true);
  });
});

describe("hasUnsafeApiPath", () => {
  it("allows normal API paths", () => {
    expect(hasUnsafeApiPath("/api/menu/12/products")).toBe(false);
    expect(hasUnsafeApiPath("/api/menu/public/aya-roof/products/5")).toBe(false);
    expect(hasUnsafeApiPath("/api/products/PKG.PRO")).toBe(false);
  });

  it("rejects dot segments and encoded separators", () => {
    expect(hasUnsafeApiPath("/api/stock/..%2Fadmin")).toBe(true);
    expect(hasUnsafeApiPath("/api/menu/%2e%2e/products")).toBe(true);
    expect(hasUnsafeApiPath("/api/menu/%252e%252e/products")).toBe(true);
    expect(hasUnsafeApiPath("/api/menu/a%2Fb/products")).toBe(true);
    expect(hasUnsafeApiPath("/api/menu/a%5Cb/products")).toBe(true);
    expect(hasUnsafeApiPath("/api/branches/./x")).toBe(true);
  });
});
