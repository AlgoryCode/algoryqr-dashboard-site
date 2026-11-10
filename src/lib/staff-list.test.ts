import { describe, expect, it } from "vitest";

import {
  EMPTY_STAFF_FILTERS,
  hiddenStaffFilterCount,
  isStaffListNarrowed,
  parseStaffFilters,
  serializeStaffFilters,
  staffInitials,
  staffPageParams,
} from "@/lib/staff-list";

describe("address round trip", () => {
  it("keeps the address empty for the defaults", () => {
    expect(serializeStaffFilters(EMPTY_STAFF_FILTERS).toString()).toBe("");
  });

  it("restores the same filters after leaving the page", () => {
    const filters = {
      query: "ayşe",
      branches: ["5", "none"],
      roles: ["KITCHEN" as const, "COURIER" as const],
      status: "active" as const,
      page: 3,
    };
    expect(parseStaffFilters(serializeStaffFilters(filters))).toEqual(filters);
  });

  it("ignores values it does not know", () => {
    expect(parseStaffFilters(new URLSearchParams("rol=boss&durum=x&sayfa=-1"))).toEqual(EMPTY_STAFF_FILTERS);
  });

  it("still understands the old ?branch= link from the branch page", () => {
    expect(parseStaffFilters(new URLSearchParams("branch=12")).branches).toEqual(["12"]);
  });
});

describe("staffPageParams", () => {
  it("sends the defaults without narrowing", () => {
    expect(staffPageParams(EMPTY_STAFF_FILTERS)).toEqual({
      page: 0,
      size: 20,
      q: "",
      roles: [],
      branches: [],
      active: null,
    });
  });

  it("sends several branches, roles and the status", () => {
    expect(
      staffPageParams({ ...EMPTY_STAFF_FILTERS, branches: ["5", "none"], roles: ["WAITER", "COURIER"], status: "inactive", page: 2 }),
    ).toMatchObject({ page: 1, branches: ["5", "none"], roles: ["WAITER", "COURIER"], active: false });
  });
});

describe("filter state", () => {
  it("counts only the filters the phone sheet holds", () => {
    expect(hiddenStaffFilterCount({ ...EMPTY_STAFF_FILTERS, query: "a", status: "active", roles: ["WAITER"] })).toBe(0);
    expect(hiddenStaffFilterCount({ ...EMPTY_STAFF_FILTERS, branches: ["5"] })).toBe(1);
  });

  it("knows when anything narrows the list", () => {
    expect(isStaffListNarrowed(EMPTY_STAFF_FILTERS)).toBe(false);
    expect(isStaffListNarrowed({ ...EMPTY_STAFF_FILTERS, status: "inactive" })).toBe(true);
  });
});

describe("staffInitials", () => {
  it("uses two words, one word or a fallback", () => {
    expect(staffInitials("Ayşe Yılmaz")).toBe("AY");
    expect(staffInitials("burak")).toBe("BU");
    expect(staffInitials("  İpek   Kaya Demir ")).toBe("İK");
    expect(staffInitials("")).toBe("?");
  });
});
