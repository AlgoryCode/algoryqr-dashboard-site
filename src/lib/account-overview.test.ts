import { describe, expect, it } from "vitest";

import {
  filterOpenUserSessions,
  parsePaymentMethodsPayload,
  parsePurchasesPayload,
} from "@/lib/account-overview";

describe("account-overview parsers", () => {
  it("parses purchase arrays and wrapped content", () => {
    expect(parsePurchasesPayload([{ id: 1, packageName: "Pro", packageCode: "PRO", usable: true, expired: false }])).toHaveLength(1);
    expect(parsePurchasesPayload({ content: [{ id: 2, packageName: "Starter", packageCode: "STARTER", usable: true, expired: false }] })).toHaveLength(1);
  });

  it("normalizes payment methods", () => {
    const methods = parsePaymentMethodsPayload({
      items: [{ id: 9, alias: "İş kartı", brand: "visa", last4: "4242" }],
    });
    expect(methods).toEqual([
      {
        id: "9",
        cardAlias: "İş kartı",
        brand: "visa",
        lastFour: "4242",
        expiryMonth: null,
        expiryYear: null,
      },
    ]);
  });

  it("filters open sessions", () => {
    const open = filterOpenUserSessions([
      {
        sessionId: "a",
        loggedInAt: null,
        lastActivityAt: null,
        accessExpiresAt: null,
        refreshExpiresAt: null,
        revoked: false,
        revokedAt: null,
        expired: false,
        active: true,
        current: true,
        ipAddress: null,
        userAgent: null,
        device: null,
        deviceType: null,
        provider: null,
      },
      {
        sessionId: "b",
        loggedInAt: null,
        lastActivityAt: null,
        accessExpiresAt: null,
        refreshExpiresAt: null,
        revoked: true,
        revokedAt: null,
        expired: false,
        active: true,
        current: false,
        ipAddress: null,
        userAgent: null,
        device: null,
        deviceType: null,
        provider: null,
      },
    ]);
    expect(open.map((row) => row.sessionId)).toEqual(["a"]);
  });
});
