import type { DateRangeValue } from "@/components/ui/date-range-filter";
import { dateRangeForPreset, detectDateRangePreset, type DateRangePreset } from "@/components/ui/date-range-filter";
import type { AccountingEntryType, AccountingSourceType } from "@/lib/api";
import { readList, writeList } from "@/lib/filter-params";

export const ACCOUNTING_PAGE_SIZE = 20;

export const ACCOUNTING_TYPES = ["GELIR", "GIDER", "BORC"] as const satisfies readonly AccountingEntryType[];

export type AccountingListFilters = {
  query: string;
  /** Entry types; empty means every type. */
  types: AccountingEntryType[];
  /** An empty range means every date. */
  range: DateRangeValue;
  /** 1-based; the server counts from 0. */
  page: number;
};

export const EMPTY_ACCOUNTING_FILTERS: AccountingListFilters = {
  query: "",
  types: [],
  range: { from: "", to: "" },
  page: 1,
};

export const ENTRY_TYPE_LABEL: Record<AccountingEntryType, string> = {
  GELIR: "Gelir",
  GIDER: "Gider",
  BORC: "Borç",
};

export function entryTypeLabel(type: AccountingEntryType | string): string {
  return ENTRY_TYPE_LABEL[type as AccountingEntryType] ?? String(type);
}

export function sourceTypeLabel(type: AccountingSourceType | string): string {
  switch (type) {
    case "BILL_SALE":
      return "Adisyon satışı";
    case "BILL_TIP":
      return "Bahşiş";
    case "ORDER_SALE":
      return "Sipariş satışı";
    case "CONSOLE_SESSION":
      return "Konsol kiralama";
    case "MANUAL":
      return "Manuel kayıt";
    default:
      return String(type);
  }
}

/** Short names for the date presets in the address; a custom range uses `bas` and `bit`. */
const PRESET_PARAM: Partial<Record<DateRangePreset, string>> = {
  yesterday: "dun",
  today: "bugun",
  "7d": "7g",
  "30d": "30g",
};
const PARAM_PRESET = Object.fromEntries(Object.entries(PRESET_PARAM).map(([preset, param]) => [param, preset])) as Record<
  string,
  Exclude<DateRangePreset, "all" | "custom">
>;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseAccountingFilters(params: URLSearchParams, now = new Date()): AccountingListFilters {
  const page = Number(params.get("sayfa"));
  const preset = PARAM_PRESET[params.get("tarih") ?? ""];
  const from = params.get("bas") ?? "";
  const to = params.get("bit") ?? "";

  let range: DateRangeValue = EMPTY_ACCOUNTING_FILTERS.range;
  if (preset) range = dateRangeForPreset(preset, now);
  else if (DATE_PATTERN.test(from) && DATE_PATTERN.test(to)) range = from <= to ? { from, to } : { from: to, to: from };

  return {
    query: params.get("ara") ?? "",
    types: readList(params, "tur", ACCOUNTING_TYPES),
    range,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeAccountingFilters(filters: AccountingListFilters, now = new Date()): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("ara", filters.query.trim());
  writeList(params, "tur", filters.types);
  const preset = detectDateRangePreset(filters.range, now);
  if (preset === "custom") {
    params.set("bas", filters.range.from);
    params.set("bit", filters.range.to);
  } else if (preset !== "all") {
    const param = PRESET_PARAM[preset];
    if (param) params.set("tarih", param);
  }
  if (filters.page > 1) params.set("sayfa", String(filters.page));
  return params;
}

export function isAccountingNarrowed(filters: AccountingListFilters): boolean {
  return filters.query.trim() !== "" || filters.types.length > 0 || filters.range.from !== "" || filters.range.to !== "";
}

/** The date filter lives in the phone sheet, so only it counts for the Filtre badge. */
export function hiddenAccountingFilterCount(filters: AccountingListFilters): number {
  return filters.range.from !== "" || filters.range.to !== "" ? 1 : 0;
}

/** Money in shows a plus, money out a minus; debt has no sign because it is not paid or received yet. */
export function signedAmountPrefix(type: AccountingEntryType | string): "+" | "−" | "" {
  if (type === "GELIR") return "+";
  if (type === "GIDER") return "−";
  return "";
}

export function formatAccountingAmount(value: number | string | null | undefined, currency = "TRY"): string {
  const amount = Number(value);
  if (value == null || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatAccountingDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** The `type` request parameter: "all", or the chosen types joined with commas. */
export function accountingTypeParam(types: readonly AccountingEntryType[]): string {
  return types.length === 0 ? "all" : types.join(",");
}
