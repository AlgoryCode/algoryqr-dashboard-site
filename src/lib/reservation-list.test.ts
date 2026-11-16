import { describe, expect, it } from "vitest";

import type { MenuReservationApiItem } from "@/lib/api";
import {
  EMPTY_RESERVATION_FILTERS,
  filterReservations,
  isReservationListNarrowed,
  parseReservationFilters,
  reservationDateRange,
  reservationDayLabel,
  reservationLink,
  reservationSource,
  reservationStats,
  serializeReservationFilters,
  sortReservations,
} from "@/lib/reservation-list";

const NOW = new Date("2026-11-10T12:00:00");

function reservation(id: number, overrides: Partial<MenuReservationApiItem> = {}): MenuReservationApiItem {
  return {
    id,
    menuId: 1,
    customerName: `Misafir ${id}`,
    partySize: 2,
    reservationAt: "2026-11-10T19:00:00",
    status: "PENDING",
    deviceType: "MOBILE",
    ...overrides,
  };
}

describe("address round trip", () => {
  it("keeps the address empty for the defaults", () => {
    expect(serializeReservationFilters(EMPTY_RESERVATION_FILTERS).toString()).toBe("");
  });

  it("restores every filter", () => {
    const filters = {
      query: "ayşe",
      branches: [5, 7],
      when: "week" as const,
      day: "",
      statuses: ["PENDING" as const, "ACTIVE" as const],
      sources: ["panel" as const],
      page: 2,
    };
    expect(parseReservationFilters(serializeReservationFilters(filters))).toEqual(filters);
  });

  it("restores a chosen day and reads the old ?branch= link", () => {
    const parsed = parseReservationFilters(new URLSearchParams("gun=2026-12-31&branch=4"));
    expect(parsed).toMatchObject({ when: "day", day: "2026-12-31", branches: [4] });
  });

  it("ignores values it does not know", () => {
    expect(parseReservationFilters(new URLSearchParams("zaman=x&durum=y&kaynak=z&gun=yarin&sayfa=0"))).toEqual(
      EMPTY_RESERVATION_FILTERS,
    );
  });
});

describe("time window", () => {
  it("maps each window to server days", () => {
    expect(reservationDateRange({ when: "upcoming", day: "" }, NOW)).toEqual({ from: "2026-11-10" });
    expect(reservationDateRange({ when: "tomorrow", day: "" }, NOW)).toEqual({ from: "2026-11-11", to: "2026-11-11" });
    expect(reservationDateRange({ when: "week", day: "" }, NOW)).toEqual({ from: "2026-11-10", to: "2026-11-16" });
    expect(reservationDateRange({ when: "past", day: "" }, NOW)).toEqual({ to: "2026-11-09" });
    expect(reservationDateRange({ when: "all", day: "" }, NOW)).toEqual({});
    expect(reservationDateRange({ when: "day", day: "2026-12-01" }, NOW)).toEqual({ from: "2026-12-01", to: "2026-12-01" });
  });

  it("counts a changed window as narrowing", () => {
    expect(isReservationListNarrowed(EMPTY_RESERVATION_FILTERS)).toBe(false);
    expect(isReservationListNarrowed({ ...EMPTY_RESERVATION_FILTERS, when: "all" })).toBe(true);
  });
});

describe("list", () => {
  const items = [
    reservation(1, { status: "PENDING", partySize: 4, phone: "0555 111 22 33" }),
    reservation(2, { status: "ACTIVE", deviceType: "PANEL", reservationAt: "2026-11-10T18:00:00" }),
    reservation(3, { status: "CANCELED", partySize: 6, note: "Doğum günü" }),
  ];

  it("filters by several statuses, source and text", () => {
    expect(filterReservations(items, { ...EMPTY_RESERVATION_FILTERS, statuses: ["PENDING", "ACTIVE"] }).map((i) => i.id)).toEqual([1, 2]);
    expect(filterReservations(items, { ...EMPTY_RESERVATION_FILTERS, sources: ["panel"] }).map((i) => i.id)).toEqual([2]);
    expect(filterReservations(items, { ...EMPTY_RESERVATION_FILTERS, query: "05551112233" }).map((i) => i.id)).toEqual([1]);
    expect(filterReservations(items, { ...EMPTY_RESERVATION_FILTERS, query: "doğum" }).map((i) => i.id)).toEqual([3]);
  });

  it("tells panel bookings from online ones", () => {
    expect(reservationSource(items[1])).toBe("panel");
    expect(reservationSource(items[0])).toBe("online");
  });

  it("counts statuses and the guests who will come", () => {
    expect(reservationStats(items)).toEqual({ PENDING: 1, ACTIVE: 1, CANCELED: 1, guests: 6 });
  });

  it("sorts soonest first or newest first", () => {
    expect(sortReservations(items.slice(0, 2), true).map((i) => i.id)).toEqual([2, 1]);
    expect(sortReservations(items.slice(0, 2), false).map((i) => i.id)).toEqual([1, 2]);
  });
});

describe("labels and link", () => {
  it("names nearby days", () => {
    expect(reservationDayLabel("2026-11-10T20:00:00", NOW)).toBe("Bugün");
    expect(reservationDayLabel("2026-11-11T09:00:00", NOW)).toBe("Yarın");
    expect(reservationDayLabel("2026-11-09T09:00:00", NOW)).toBe("Dün");
  });

  it("points at the public booking page", () => {
    expect(reservationLink("tavsan-coffee", 9)).toBe("https://qr.algorycode.com/tavsan-coffee/menu/rezervasyon");
    expect(reservationLink(null, 9)).toBe("https://qr.algorycode.com/9/menu/rezervasyon");
  });
});
