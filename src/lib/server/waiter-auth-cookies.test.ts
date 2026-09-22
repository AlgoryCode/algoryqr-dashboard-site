import { describe, expect, it } from "vitest";

import {
  parseStaffApp,
  STAFF_COOKIE_NAMES,
  staffAppFromRequest,
} from "./waiter-auth-cookies";

describe("staff app cookies", () => {
  it("keeps waiter, kitchen and courier cookie names apart", () => {
    expect(STAFF_COOKIE_NAMES.waiter.access).toBe("waiter_access");
    expect(STAFF_COOKIE_NAMES.kitchen.access).toBe("kitchen_access");
    expect(STAFF_COOKIE_NAMES.courier.access).toBe("courier_access");
    expect(STAFF_COOKIE_NAMES.waiter.access).not.toBe(STAFF_COOKIE_NAMES.kitchen.access);
    expect(STAFF_COOKIE_NAMES.waiter.refresh).not.toBe(STAFF_COOKIE_NAMES.kitchen.refresh);
    expect(STAFF_COOKIE_NAMES.waiter.id).not.toBe(STAFF_COOKIE_NAMES.kitchen.id);
    expect(STAFF_COOKIE_NAMES.courier.access).not.toBe(STAFF_COOKIE_NAMES.waiter.access);
    expect(STAFF_COOKIE_NAMES.courier.access).not.toBe(STAFF_COOKIE_NAMES.kitchen.access);
  });

  it("reads the staff app from body first, then header", () => {
    const kitchenHeader = new Request("http://localhost/api/waiter/auth/me", {
      headers: { "x-staff-app": "kitchen" },
    });
    expect(staffAppFromRequest(kitchenHeader)).toBe("kitchen");
    expect(staffAppFromRequest(kitchenHeader, "waiter")).toBe("waiter");
    expect(staffAppFromRequest(kitchenHeader, "courier")).toBe("courier");
    expect(staffAppFromRequest(new Request("http://localhost/api/waiter/auth/me"))).toBe("waiter");
  });

  it("ignores unknown app values", () => {
    expect(parseStaffApp("owner")).toBeNull();
    expect(parseStaffApp("kitchen")).toBe("kitchen");
    expect(parseStaffApp("courier")).toBe("courier");
  });
});
