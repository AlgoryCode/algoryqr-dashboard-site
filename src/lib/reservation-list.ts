import type { MenuReservationApiItem, MenuReservationStatus } from "@/lib/api";
import { MENU_APP_ORIGIN } from "@/lib/config";
import { inList, readList, writeList } from "@/lib/filter-params";

export const RESERVATION_PAGE_SIZE = 20;

export const RESERVATION_STATUSES = ["PENDING", "ACTIVE", "CANCELED"] as const satisfies readonly MenuReservationStatus[];

export const RESERVATION_STATUS_LABEL: Record<MenuReservationStatus, string> = {
  PENDING: "Onay bekliyor",
  ACTIVE: "Onaylı",
  CANCELED: "İptal",
};

/** Where a reservation came from: the guest's online form, or the staff entering it in the panel. */
export const RESERVATION_SOURCES = ["online", "panel"] as const;
export type ReservationSource = (typeof RESERVATION_SOURCES)[number];
export const RESERVATION_SOURCE_LABEL: Record<ReservationSource, string> = { online: "Online", panel: "Panelden" };

/** Must match `MenuReservationService.PANEL_DEVICE_TYPE` in qr-service. */
const PANEL_DEVICE_TYPE = "PANEL";

/** Time windows; "day" uses `ReservationListFilters.day`. */
export const RESERVATION_WHENS = ["upcoming", "today", "tomorrow", "week", "past", "all", "day"] as const;
export type ReservationWhen = (typeof RESERVATION_WHENS)[number];

export const RESERVATION_WHEN_LABEL: Record<Exclude<ReservationWhen, "day">, string> = {
  upcoming: "Yaklaşan",
  today: "Bugün",
  tomorrow: "Yarın",
  week: "Önümüzdeki 7 gün",
  past: "Geçmiş",
  all: "Tümü",
};

export type ReservationListFilters = {
  query: string;
  /** Branch ids; empty means every branch. */
  branches: number[];
  when: ReservationWhen;
  /** YYYY-MM-DD, used only when `when` is "day". */
  day: string;
  /** Empty means every status. */
  statuses: MenuReservationStatus[];
  /** Empty means both sources. */
  sources: ReservationSource[];
  /** 1-based. */
  page: number;
};

export const EMPTY_RESERVATION_FILTERS: ReservationListFilters = {
  query: "",
  branches: [],
  when: "upcoming",
  day: "",
  statuses: [],
  sources: [],
  page: 1,
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day as YYYY-MM-DD (the business works in its own time zone, like the browser). */
export function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseReservationFilters(params: URLSearchParams): ReservationListFilters {
  const page = Number(params.get("sayfa"));
  const rawWhen = params.get("zaman") ?? "";
  const day = params.get("gun") ?? "";
  const when: ReservationWhen = DAY_PATTERN.test(day)
    ? "day"
    : RESERVATION_WHENS.includes(rawWhen as ReservationWhen) && rawWhen !== "day"
      ? (rawWhen as ReservationWhen)
      : "upcoming";
  // The branch page links here with ?branch=<id>.
  const legacyBranch = Number(params.get("branch"));
  const branches = readList(params, "sube")
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  if (branches.length === 0 && Number.isSafeInteger(legacyBranch) && legacyBranch > 0) branches.push(legacyBranch);
  return {
    query: params.get("ara") ?? "",
    branches,
    when,
    day: when === "day" ? day : "",
    statuses: readList(params, "durum", RESERVATION_STATUSES),
    sources: readList(params, "kaynak", RESERVATION_SOURCES),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeReservationFilters(filters: ReservationListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("ara", filters.query.trim());
  writeList(params, "sube", filters.branches.map(String));
  if (filters.when === "day" && DAY_PATTERN.test(filters.day)) params.set("gun", filters.day);
  else if (filters.when !== "upcoming" && filters.when !== "day") params.set("zaman", filters.when);
  writeList(params, "durum", filters.statuses);
  writeList(params, "kaynak", filters.sources);
  if (filters.page > 1) params.set("sayfa", String(filters.page));
  return params;
}

export function isReservationListNarrowed(filters: ReservationListFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.branches.length > 0 ||
    filters.when !== "upcoming" ||
    filters.statuses.length > 0 ||
    filters.sources.length > 0
  );
}

/** The `from` / `to` days sent to the server for the time window; a missing end means open-ended. */
export function reservationDateRange(filters: Pick<ReservationListFilters, "when" | "day">, now = new Date()) {
  const today = localDay(now);
  switch (filters.when) {
    case "upcoming":
      return { from: today };
    case "today":
      return { from: today, to: today };
    case "tomorrow": {
      const tomorrow = localDay(addDays(now, 1));
      return { from: tomorrow, to: tomorrow };
    }
    case "week":
      return { from: today, to: localDay(addDays(now, 6)) };
    case "past":
      return { to: localDay(addDays(now, -1)) };
    case "day":
      return DAY_PATTERN.test(filters.day) ? { from: filters.day, to: filters.day } : { from: today };
    default:
      return {};
  }
}

/** Upcoming windows read soonest first; the past and "all" read newest first. */
export function reservationSortsAscending(when: ReservationWhen): boolean {
  return when !== "past" && when !== "all";
}

export function reservationSource(item: Pick<MenuReservationApiItem, "deviceType">): ReservationSource {
  return item.deviceType === PANEL_DEVICE_TYPE ? "panel" : "online";
}

function normalize(value: string) {
  return value.toLocaleLowerCase("tr").replace(/\s+/g, "");
}

export function matchesReservationQuery(item: MenuReservationApiItem, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  return [item.customerName, item.phone, item.email, item.note].some((value) => value && normalize(value).includes(needle));
}

/** Status and source narrow the list; the counts on the tiles are taken before the status filter. */
export function filterReservations(items: MenuReservationApiItem[], filters: ReservationListFilters) {
  return items.filter(
    (item) =>
      inList(filters.statuses, item.status) &&
      inList(filters.sources, reservationSource(item)) &&
      matchesReservationQuery(item, filters.query),
  );
}

export function sortReservations(items: MenuReservationApiItem[], ascending: boolean) {
  return [...items].sort((a, b) => {
    const diff = new Date(a.reservationAt).getTime() - new Date(b.reservationAt).getTime();
    return ascending ? diff : -diff;
  });
}

export type ReservationStats = { PENDING: number; ACTIVE: number; CANCELED: number; guests: number };

/** Counts per status, plus the guests expected (cancelled ones do not come). */
export function reservationStats(items: MenuReservationApiItem[]): ReservationStats {
  const stats: ReservationStats = { PENDING: 0, ACTIVE: 0, CANCELED: 0, guests: 0 };
  for (const item of items) {
    stats[item.status] += 1;
    if (item.status !== "CANCELED") stats.guests += item.partySize;
  }
  return stats;
}

/** "Bugün", "Yarın", "Dün" or a short weekday date, for the day headers in the list. */
export function reservationDayLabel(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = localDay(date);
  if (day === localDay(now)) return "Bugün";
  if (day === localDay(addDays(now, 1))) return "Yarın";
  if (day === localDay(addDays(now, -1))) return "Dün";
  return date.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function reservationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/** The guest-facing booking page of a menu on the public menu site. */
export function reservationLink(publicId: string | null | undefined, menuId: number): string {
  const identifier = publicId?.trim() || String(menuId);
  return `${MENU_APP_ORIGIN}/${encodeURIComponent(identifier)}/menu/rezervasyon`;
}
