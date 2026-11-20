import type { Tone } from "@/components/dashboard/tone";
import { normalizeOrderStatus } from "@/lib/order-flow";
import type { StaffRole } from "@/lib/personnel-management-api";

/**
 * One place that decides which colour a badge or filter chip wears.
 * The colours are the sidebar icon colours (see `tone.tsx`), so a page never invents its own.
 *
 *   green   money in, healthy, ready, active, available
 *   red     money out, late, cancelled, deleted, failed
 *   orange  waiting for someone: pending, debt, needs attention
 *   blue    in progress or a neutral category: confirmed, waiter, sale
 *   violet  being worked on, or a secondary category: preparing, QR, order
 *   teal    on the way, outside, support roles: courier, tip, online
 *   muted   finished or switched off: delivered, inactive, manual
 *
 * Filter rule: five options or fewer are chips (`FilterChips`), longer lists are a select.
 */
export type BadgeTone = Tone | "muted";

export const ENTRY_TYPE_TONE = { GELIR: "green", GIDER: "red", BORC: "orange" } as const satisfies Record<string, Tone>;

export const ENTRY_SOURCE_TONE = {
  BILL_SALE: "blue",
  ORDER_SALE: "violet",
  CONSOLE_SESSION: "orange",
  BILL_TIP: "teal",
  MANUAL: "muted",
} as const satisfies Record<string, BadgeTone>;

export const STAFF_ROLE_TONE: Record<StaffRole, Tone> = {
  WAITER: "blue",
  KITCHEN: "orange",
  COURIER: "teal",
};

/** Where an order came from. */
export const ORDER_CHANNEL_TONE = {
  QR: "violet",
  WAITER: "blue",
  ONLINE: "teal",
  PHONE: "orange",
  UBER_EATS: "green",
  YEMEKSEPETI: "red",
} as const satisfies Record<string, Tone>;

/** Products that need a look. */
export const PRODUCT_FLAG_TONE = {
  "no-photo": "orange",
  unassigned: "violet",
  unavailable: "red",
} as const satisfies Record<string, Tone>;

/** Order list tabs wear the colour of the status they show; "all" and "served" stay neutral. */
export const ORDER_TAB_TONE: Record<
  "open" | "late" | "pending" | "preparing" | "ready" | "served" | "cancelled" | "all",
  Tone | undefined
> = {
  open: "blue",
  late: "red",
  pending: "orange",
  preparing: "violet",
  ready: "green",
  served: undefined,
  cancelled: "red",
  all: undefined,
};

/** Waiting for the business = orange, confirmed = blue, cancelled = red (same as orders). */
export const RESERVATION_STATUS_TONE = { PENDING: "orange", ACTIVE: "blue", CANCELED: "red" } as const satisfies Record<
  string,
  Tone
>;

/** Booked by the guest online = violet (like QR orders); entered by the staff = teal. */
export const RESERVATION_SOURCE_TONE = { online: "violet", panel: "teal" } as const satisfies Record<string, Tone>;

export const ACTIVE_TONE: Record<"active" | "inactive", BadgeTone> = { active: "green", inactive: "muted" };

/** Colour of an order status badge; finished orders stay neutral so open work stands out. */
export function orderStatusTone(status: string | null | undefined): BadgeTone {
  switch (normalizeOrderStatus(status)) {
    case "PENDING":
      return "orange";
    case "CONFIRMED":
      return "blue";
    case "PREPARING":
      return "violet";
    case "READY":
      return "green";
    case "AWAITING_COURIER":
    case "ON_THE_WAY":
      return "teal";
    case "CANCELLED":
    case "REJECTED":
      return "red";
    default:
      return "muted";
  }
}
