import { describe, expect, it } from "vitest";

import { bodyForRequest, setApiFixtureMode } from "./fixtures";

describe("bodyForRequest", () => {
  it("returns an owner session for the access context path", () => {
    setApiFixtureMode("ready");
    const body = bodyForRequest("/api/access/context") as { decision: string; user: { email: string } };
    expect(body.decision).toBe("ALLOW");
    expect(body.user.email).toBe("ayse@ornek.com");
  });

  it("returns no cards while setup is incomplete", () => {
    setApiFixtureMode("setup");
    expect(bodyForRequest("/account/payment-methods")).toEqual({ items: [] });
    setApiFixtureMode("ready");
  });
});
