import { z } from "zod";

import { ApiError } from "@/lib/api/errors";

/**
 * Oyun & Cihaz Takip (hourly device rental). The backend paths still say "console" for compatibility.
 * Times from the API are local (Istanbul) date-times without a zone.
 */

const moneySchema = z.union([z.number(), z.string()]);
const nullableMoney = moneySchema.nullable().optional();

export const DEVICE_TYPES = [
  "PLAYSTATION",
  "XBOX",
  "NINTENDO",
  "PC",
  "VR",
  "SIMULATOR",
  "BILLIARDS",
  "OTHER",
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];
const deviceTypeSchema = z.enum(DEVICE_TYPES);

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  PLAYSTATION: "PlayStation",
  XBOX: "Xbox",
  NINTENDO: "Nintendo",
  PC: "PC",
  VR: "VR",
  SIMULATOR: "Simülatör",
  BILLIARDS: "Bilardo / masa",
  OTHER: "Diğer",
};

/** Types played with controllers, where a 4-controller rate makes sense. */
export const CONTROLLER_TYPES: ReadonlySet<DeviceType> = new Set(["PLAYSTATION", "XBOX", "NINTENDO"]);

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "BALANCE"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
const paymentSchema = z.enum(PAYMENT_METHODS);
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  TRANSFER: "Havale",
  BALANCE: "Bakiye",
};

const reservationStatusSchema = z.enum(["BOOKED", "STARTED", "CANCELLED", "NO_SHOW"]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  BOOKED: "Bekleniyor",
  STARTED: "Başladı",
  CANCELLED: "İptal",
  NO_SHOW: "Gelmedi",
};

const reservationSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  consoleId: z.number(),
  consoleName: z.string().nullable().optional(),
  customerId: z.number().nullable().optional(),
  customerName: z.string(),
  phone: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: reservationStatusSchema,
  sessionId: z.number().nullable().optional(),
});

const consoleSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  deviceType: deviceTypeSchema.catch("OTHER"),
  hourlyRate: nullableMoney,
  multiHourlyRate: nullableMoney,
  effectiveHourlyRate: nullableMoney,
  effectiveMultiHourlyRate: nullableMoney,
  busy: z.boolean(),
  nextReservation: reservationSchema.nullable().optional(),
});

const rateSchema = z.object({
  branchId: z.number(),
  defaultHourlyRate: nullableMoney,
  defaultMultiHourlyRate: nullableMoney,
  minimumMinutes: z.number(),
  roundingMinutes: z.number(),
  loyaltyEveryMinutes: z.number().nullable().optional(),
  loyaltyRewardMinutes: z.number().nullable().optional(),
});

const typeRateSchema = z.object({
  deviceType: deviceTypeSchema,
  hourlyRate: nullableMoney,
  multiHourlyRate: nullableMoney,
});

const tariffSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  deviceType: deviceTypeSchema.nullable().optional(),
  days: z.array(z.number()),
  startTime: z.string(),
  endTime: z.string(),
  adjustPercent: moneySchema,
});

const itemSchema = z.object({
  id: z.number(),
  menuProductId: z.number().nullable().optional(),
  name: z.string(),
  unitPrice: moneySchema,
  quantity: z.number(),
  lineTotal: moneySchema,
});

const segmentSchema = z.object({
  consoleId: z.number(),
  consoleName: z.string().nullable().optional(),
  deviceType: deviceTypeSchema.catch("OTHER"),
  hourlyRate: moneySchema,
  controllerCount: z.number(),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
});

const sessionSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  consoleId: z.number(),
  consoleName: z.string().nullable().optional(),
  deviceType: deviceTypeSchema.nullable().optional().catch(null),
  customerId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  hourlyRate: moneySchema,
  controllerCount: z.number().default(2),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  pausedAt: z.string().nullable().optional(),
  paused: z.boolean().default(false),
  plannedMinutes: z.number().nullable().optional(),
  playedSeconds: z.number().default(0),
  durationMinutes: z.number(),
  timeAmount: nullableMoney,
  itemsAmount: nullableMoney,
  grossAmount: nullableMoney,
  discountAmount: nullableMoney,
  loyaltyMinutesUsed: z.number().nullable().optional(),
  amount: nullableMoney,
  paymentMethod: paymentSchema.nullable().optional(),
  active: z.boolean(),
  reservationId: z.number().nullable().optional(),
  items: z.array(itemSchema).default([]),
  segments: z.array(segmentSchema).default([]),
});

const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    content: z.array(item),
    page: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
  });

const sessionPageSchema = pageOf(sessionSchema);

const quoteSchema = z.object({
  sessionId: z.number(),
  playedSeconds: z.number(),
  durationMinutes: z.number(),
  timeAmount: moneySchema,
  itemsAmount: moneySchema,
  grossAmount: moneySchema,
  customerId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerBalance: nullableMoney,
  loyaltyMinutesAvailable: z.number(),
  loyaltyMinutesUsable: z.number(),
  loyaltyValue: moneySchema,
});

const productSchema = z.object({
  menuProductId: z.number(),
  menuId: z.number().nullable().optional(),
  name: z.string(),
  price: moneySchema,
  imageUrl: z.string().nullable().optional(),
});

const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  balance: moneySchema,
  freeMinutes: z.number(),
  loyaltyProgressMinutes: z.number(),
  totalMinutes: z.number(),
  totalSpent: moneySchema,
});
const customerPageSchema = pageOf(customerSchema);

const txnSchema = z.object({
  id: z.number(),
  type: z.enum(["TOPUP", "SPEND", "ADJUST"]),
  amount: moneySchema,
  paymentMethod: paymentSchema.nullable().optional(),
  sessionId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});
const txnPageSchema = pageOf(txnSchema);

const reportSchema = z.object({
  branchId: z.number(),
  from: z.string(),
  to: z.string(),
  sessions: z.number(),
  playedMinutes: z.number(),
  timeRevenue: moneySchema,
  itemsRevenue: moneySchema,
  discounts: moneySchema,
  revenue: moneySchema,
  averageSessionMinutes: moneySchema,
  averageSessionAmount: moneySchema,
  occupancyPercent: moneySchema,
  devices: z.array(
    z.object({
      consoleId: z.number(),
      consoleName: z.string().nullable().optional(),
      deviceType: deviceTypeSchema.nullable().optional().catch(null),
      sessions: z.number(),
      playedMinutes: z.number(),
      revenue: moneySchema,
      occupancyPercent: moneySchema,
    }),
  ),
  hours: z.array(
    z.object({ hour: z.number(), playedMinutes: z.number(), sessionsStarted: z.number(), revenue: moneySchema }),
  ),
  payments: z.array(z.object({ paymentMethod: paymentSchema, sessions: z.number(), amount: moneySchema })),
});

export type GameConsole = z.infer<typeof consoleSchema>;
export type ConsoleRate = z.infer<typeof rateSchema>;
export type TypeRate = z.infer<typeof typeRateSchema>;
export type Tariff = z.infer<typeof tariffSchema>;
export type ConsoleSession = z.infer<typeof sessionSchema>;
export type SessionItem = z.infer<typeof itemSchema>;
export type ConsoleSessionPage = z.infer<typeof sessionPageSchema>;
export type SessionQuote = z.infer<typeof quoteSchema>;
export type ProductOption = z.infer<typeof productSchema>;
export type DeviceCustomer = z.infer<typeof customerSchema>;
export type DeviceCustomerPage = z.infer<typeof customerPageSchema>;
export type CustomerTxn = z.infer<typeof txnSchema>;
export type CustomerTxnPage = z.infer<typeof txnPageSchema>;
export type Reservation = z.infer<typeof reservationSchema>;
export type DeviceReport = z.infer<typeof reportSchema>;

export type ConsolePayload = {
  name: string;
  deviceType: DeviceType;
  hourlyRate: string | null;
  multiHourlyRate: string | null;
};
export type RatePayload = {
  defaultHourlyRate: string | null;
  defaultMultiHourlyRate: string | null;
  minimumMinutes: number;
  roundingMinutes: number;
  loyaltyEveryMinutes: number | null;
  loyaltyRewardMinutes: number | null;
};
export type TypeRatePayload = { deviceType: DeviceType; hourlyRate: string | null; multiHourlyRate: string | null };
export type TariffPayload = {
  name: string;
  deviceType: DeviceType | null;
  days: number[];
  startTime: string;
  endTime: string;
  adjustPercent: string;
};
export type StartSessionPayload = {
  customerName?: string;
  note?: string;
  customerId?: number;
  plannedMinutes?: number;
  controllerCount?: number;
};
export type FinishPayload = {
  paymentMethod: PaymentMethod;
  discountAmount?: string;
  discountPercent?: string;
  useLoyaltyMinutes?: boolean;
};
export type AddItemPayload =
  | { menuProductId: number; quantity: number }
  | { name: string; unitPrice: string; quantity: number };
export type CustomerPayload = { name: string; phone?: string; note?: string };
export type ReservationPayload = {
  consoleId: number;
  customerId?: number;
  customerName?: string;
  phone?: string;
  note?: string;
  startsAt: string;
  durationMinutes: number;
};

async function request<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      data != null && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "Cihaz takip isteği başarısız";
    throw new ApiError(response.status, message, data);
  }
  if (response.status === 204) {
    return undefined as z.infer<TSchema>;
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(response.status, "Cihaz takip yanıtı okunamadı");
  }
  return parsed.data;
}

const BASE = "/api/console";
const post = (body?: unknown): RequestInit => ({
  method: "POST",
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });

// ---- Devices and rates --------------------------------------------------------------------------------------

export const listConsoles = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/consoles`, z.array(consoleSchema));
export const createConsole = (branchId: number, payload: ConsolePayload) =>
  request(`${BASE}/branches/${branchId}/consoles`, consoleSchema, post(payload));
export const updateConsole = (consoleId: number, payload: ConsolePayload) =>
  request(`${BASE}/consoles/${consoleId}`, consoleSchema, put(payload));
export async function deleteConsole(consoleId: number): Promise<void> {
  await request(`${BASE}/consoles/${consoleId}`, z.unknown(), { method: "DELETE" });
}

export const getRate = (branchId: number) => request(`${BASE}/branches/${branchId}/rate`, rateSchema);
export const updateRate = (branchId: number, payload: RatePayload) =>
  request(`${BASE}/branches/${branchId}/rate`, rateSchema, put(payload));
export const getTypeRates = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/type-rates`, z.array(typeRateSchema));
export const updateTypeRates = (branchId: number, rates: TypeRatePayload[]) =>
  request(`${BASE}/branches/${branchId}/type-rates`, z.array(typeRateSchema), put({ rates }));
export const listTariffs = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/tariffs`, z.array(tariffSchema));
export const createTariff = (branchId: number, payload: TariffPayload) =>
  request(`${BASE}/branches/${branchId}/tariffs`, tariffSchema, post(payload));
export const updateTariff = (tariffId: number, payload: TariffPayload) =>
  request(`${BASE}/tariffs/${tariffId}`, tariffSchema, put(payload));
export async function deleteTariff(tariffId: number): Promise<void> {
  await request(`${BASE}/tariffs/${tariffId}`, z.unknown(), { method: "DELETE" });
}

// ---- Sessions -----------------------------------------------------------------------------------------------

export const startSession = (consoleId: number, payload: StartSessionPayload) =>
  request(`${BASE}/consoles/${consoleId}/sessions`, sessionSchema, post(payload));
export const pauseSession = (sessionId: number) =>
  request(`${BASE}/sessions/${sessionId}/pause`, sessionSchema, post());
export const resumeSession = (sessionId: number) =>
  request(`${BASE}/sessions/${sessionId}/resume`, sessionSchema, post());
export const transferSession = (sessionId: number, payload: { consoleId?: number; controllerCount?: number }) =>
  request(`${BASE}/sessions/${sessionId}/transfer`, sessionSchema, post(payload));
export const extendSession = (sessionId: number, minutes: number) =>
  request(`${BASE}/sessions/${sessionId}/extend`, sessionSchema, post({ minutes }));
export const addSessionItem = (sessionId: number, payload: AddItemPayload) =>
  request(`${BASE}/sessions/${sessionId}/items`, sessionSchema, post(payload));
export const removeSessionItem = (sessionId: number, itemId: number) =>
  request(`${BASE}/sessions/${sessionId}/items/${itemId}`, sessionSchema, { method: "DELETE" });
export const quoteSession = (sessionId: number) => request(`${BASE}/sessions/${sessionId}/quote`, quoteSchema);
export const finishSession = (sessionId: number, payload?: FinishPayload) =>
  request(`${BASE}/sessions/${sessionId}/finish`, sessionSchema, post(payload));
export const listActiveSessions = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/sessions/active`, z.array(sessionSchema));
export const listSessionHistory = (branchId: number, page = 0) =>
  request(`${BASE}/branches/${branchId}/sessions?page=${page}&size=20`, sessionPageSchema);
export const listProducts = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/products`, z.array(productSchema));

// ---- Customers ----------------------------------------------------------------------------------------------

export const searchCustomers = (q: string, page = 0, size = 20) =>
  request(`${BASE}/customers?q=${encodeURIComponent(q)}&page=${page}&size=${size}`, customerPageSchema);
export const createCustomer = (payload: CustomerPayload) => request(`${BASE}/customers`, customerSchema, post(payload));
export const updateCustomer = (customerId: number, payload: CustomerPayload) =>
  request(`${BASE}/customers/${customerId}`, customerSchema, put(payload));
export async function deleteCustomer(customerId: number): Promise<void> {
  await request(`${BASE}/customers/${customerId}`, z.unknown(), { method: "DELETE" });
}
export const topUpCustomer = (customerId: number, payload: { amount: string; paymentMethod: PaymentMethod; note?: string }) =>
  request(`${BASE}/customers/${customerId}/top-up`, customerSchema, post(payload));
export const adjustCustomer = (
  customerId: number,
  payload: { balanceDelta?: string; freeMinutesDelta?: number; note?: string },
) => request(`${BASE}/customers/${customerId}/adjust`, customerSchema, post(payload));
export const customerTransactions = (customerId: number, page = 0) =>
  request(`${BASE}/customers/${customerId}/transactions?page=${page}&size=20`, txnPageSchema);

// ---- Reservations -------------------------------------------------------------------------------------------

export const listReservations = (branchId: number, from: string, to: string) =>
  request(`${BASE}/branches/${branchId}/reservations?from=${from}&to=${to}`, z.array(reservationSchema));
export const createReservation = (branchId: number, payload: ReservationPayload) =>
  request(`${BASE}/branches/${branchId}/reservations`, reservationSchema, post(payload));
export const cancelReservation = (reservationId: number) =>
  request(`${BASE}/reservations/${reservationId}/cancel`, reservationSchema, post());
export const noShowReservation = (reservationId: number) =>
  request(`${BASE}/reservations/${reservationId}/no-show`, reservationSchema, post());
export const startReservation = (reservationId: number, controllerCount?: number) =>
  request(`${BASE}/reservations/${reservationId}/start`, sessionSchema, post(controllerCount ? { controllerCount } : {}));

// ---- Report -------------------------------------------------------------------------------------------------

export const getReport = (branchId: number, from: string, to: string) =>
  request(`${BASE}/branches/${branchId}/report?from=${from}&to=${to}`, reportSchema);

// ---- Formatting helpers -------------------------------------------------------------------------------------

/**
 * Reads an amount typed the Turkish way ("120,50", "1.250") or plainly ("120.5"). Empty means none.
 * Returns undefined when the text is not a non-negative amount.
 */
export function parseRateInput(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(trimmed)
      ? trimmed.replace(/\./g, "")
      : trimmed;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return normalized;
}

/** Shows a stored amount in an input the Turkish way. */
export function rateInputValue(value: number | string | null | undefined): string {
  return value == null || value === "" ? "" : String(value).replace(".", ",");
}

export function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatTl(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)} ₺`;
}

export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest} dk`;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

/** 0:05:09 / 1:30:00 style stopwatch text. */
export function formatStopwatch(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatClock(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/**
 * Seconds played by now: what the server counted when it answered, plus the time since then unless the
 * session is paused.
 */
export function livePlayedSeconds(session: Pick<ConsoleSession, "playedSeconds" | "paused" | "active">, fetchedAt: number, now: number) {
  if (!session.active || session.paused) return session.playedSeconds;
  return session.playedSeconds + Math.max(0, Math.floor((now - fetchedAt) / 1000));
}

/** Seconds left of the planned time (negative once it is over), or null without a plan. */
export function remainingSeconds(plannedMinutes: number | null | undefined, playedSeconds: number): number | null {
  if (plannedMinutes == null) return null;
  return plannedMinutes * 60 - playedSeconds;
}

/** "12 dk kaldı" / "5 dk aşıldı". */
export function formatRemaining(seconds: number): string {
  if (seconds >= 0) {
    return `${formatStopwatch(seconds)} kaldı`;
  }
  return `${formatDuration(Math.ceil(-seconds / 60))} aşıldı`;
}

/** yyyy-MM-dd of a date in local time. */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const DAY_LABELS: Record<number, string> = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 7: "Paz" };

export function formatDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "Her gün";
  if (sorted.join(",") === "1,2,3,4,5") return "Hafta içi";
  if (sorted.join(",") === "6,7") return "Hafta sonu";
  return sorted.map((day) => DAY_LABELS[day] ?? String(day)).join(", ");
}

/** The amount after a discount given as TL or percent, never below zero. Mirrors the server for the dialog. */
export function applyDiscount(base: number, kind: "amount" | "percent", raw: string): number {
  const parsed = parseRateInput(raw);
  if (parsed == null) return Math.max(base, 0);
  const value = Number(parsed);
  const discount = kind === "percent" ? Math.round(base * Math.min(value, 100)) / 100 : value;
  return Math.max(Math.round((base - Math.min(discount, base)) * 100) / 100, 0);
}
