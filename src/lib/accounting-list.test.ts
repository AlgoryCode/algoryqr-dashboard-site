import { describe, expect, it } from "vitest";

import {
  EMPTY_ACCOUNTING_FILTERS,
  entryTypeLabel,
  accountingTypeParam,
  formatAccountingAmount,
  hiddenAccountingFilterCount,
  isAccountingNarrowed,
  parseAccountingFilters,
  serializeAccountingFilters,
  signedAmountPrefix,
  sourceTypeLabel,
} from "@/lib/accounting-list";

const NOW = new Date("2026-11-10T12:00:00");

describe("address round trip", () => {
  it("keeps the address empty for the defaults", () => {
    expect(serializeAccountingFilters(EMPTY_ACCOUNTING_FILTERS, NOW).toString()).toBe("");
  });

  it("restores type, search, a custom range and the page", () => {
    const filters = {
      query: "kira",
      types: ["GELIR" as const, "GIDER" as const],
      range: { from: "2026-11-01", to: "2026-11-05" },
      page: 3,
    };
    expect(parseAccountingFilters(serializeAccountingFilters(filters, NOW), NOW)).toEqual(filters);
  });

  it("uses short names for the date presets", () => {
    const week = parseAccountingFilters(new URLSearchParams("tarih=7g"), NOW);
    expect(week.range).toEqual({ from: "2026-11-04", to: "2026-11-10" });
    expect(serializeAccountingFilters(week, NOW).get("tarih")).toBe("7g");
  });

  it("ignores values it does not know and swaps a reversed range", () => {
    expect(parseAccountingFilters(new URLSearchParams("tur=x&sayfa=0&bas=dun"), NOW)).toEqual(EMPTY_ACCOUNTING_FILTERS);
    // An older link with one comma-joined value still works.
    expect(parseAccountingFilters(new URLSearchParams("tur=GELIR,BORC"), NOW).types).toEqual(["GELIR", "BORC"]);
    expect(parseAccountingFilters(new URLSearchParams("bas=2026-11-09&bit=2026-11-01"), NOW).range).toEqual({
      from: "2026-11-01",
      to: "2026-11-09",
    });
  });
});

describe("filter state", () => {
  it("knows when anything narrows the list", () => {
    expect(isAccountingNarrowed(EMPTY_ACCOUNTING_FILTERS)).toBe(false);
    expect(isAccountingNarrowed({ ...EMPTY_ACCOUNTING_FILTERS, types: ["BORC"] })).toBe(true);
    expect(isAccountingNarrowed({ ...EMPTY_ACCOUNTING_FILTERS, query: " a " })).toBe(true);
  });

  it("counts the date filter as the one filter the phone sheet holds", () => {
    expect(hiddenAccountingFilterCount(EMPTY_ACCOUNTING_FILTERS)).toBe(0);
    expect(hiddenAccountingFilterCount({ ...EMPTY_ACCOUNTING_FILTERS, range: { from: "2026-11-01", to: "2026-11-02" } })).toBe(1);
  });
});

describe("labels and amounts", () => {
  it("names the types and sources", () => {
    expect(entryTypeLabel("GELIR")).toBe("Gelir");
    expect(entryTypeLabel("BORC")).toBe("Borç");
    expect(sourceTypeLabel("BILL_TIP")).toBe("Bahşiş");
    expect(sourceTypeLabel("CONSOLE_SESSION")).toBe("Cihaz kiralama");
    expect(sourceTypeLabel("OTHER")).toBe("OTHER");
  });

  it("signs money in and out but not debt", () => {
    expect(signedAmountPrefix("GELIR")).toBe("+");
    expect(signedAmountPrefix("GIDER")).toBe("−");
    expect(signedAmountPrefix("BORC")).toBe("");
  });

  it("formats lira and survives bad input", () => {
    expect(formatAccountingAmount(1850, "TRY")).toBe("₺1.850,00");
    expect(formatAccountingAmount("12.5", "TRY")).toBe("₺12,50");
    expect(formatAccountingAmount(undefined)).toBe("—");
    expect(formatAccountingAmount(10, "lira")).toBe("10.00 lira");
  });
});

describe("accountingTypeParam", () => {
  it("sends all, one or several types", () => {
    expect(accountingTypeParam([])).toBe("all");
    expect(accountingTypeParam(["GIDER"])).toBe("GIDER");
    expect(accountingTypeParam(["GELIR", "GIDER"])).toBe("GELIR,GIDER");
  });
});
