import { describe, expect, it } from "vitest";

import { clientContextHeaders, trustedClientIp } from "./client-headers";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/menu/public/demo/orders/submit", { headers });
}

describe("trustedClientIp", () => {
  it("ignores a caller-supplied X-Forwarded-For list", () => {
    const incoming = request({
      "x-forwarded-for": "1.2.3.4, 10.0.0.8",
      "x-real-ip": "203.0.113.10",
    });
    expect(trustedClientIp(incoming)).toBe("203.0.113.10");
    expect(clientContextHeaders(incoming)["X-Forwarded-For"]).toBe("203.0.113.10");
  });

  it("prefers the platform proxy header over x-real-ip", () => {
    const incoming = request({
      "cf-connecting-ip": "198.51.100.20",
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "1.2.3.4",
    });
    expect(trustedClientIp(incoming)).toBe("198.51.100.20");
  });

  it("omits the upstream header when no trusted proxy ip is present", () => {
    const incoming = request({ "x-forwarded-for": "1.2.3.4" });
    expect(trustedClientIp(incoming)).toBeNull();
    expect(clientContextHeaders(incoming)["X-Forwarded-For"]).toBeUndefined();
  });
});
