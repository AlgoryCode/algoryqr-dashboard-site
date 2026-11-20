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
  publicToken: z.string().nullable().optional(),
  maintenance: z.boolean().nullable().optional().transform((value) => value === true),
  maintenanceNote: z.string().nullable().optional(),
  maintenanceSince: z.string().nullable().optional(),
  purchaseCost: nullableMoney,
  purchasedOn: z.string().nullable().optional(),
  games: z
    .array(z.object({ id: z.number(), name: z.string() }))
    .nullable()
    .optional()
    .transform((value) => value ?? []),
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
  packageId: z.number().nullable().optional(),
  packageName: z.string().nullable().optional(),
  packageMinutes: z.number().nullable().optional(),
  packagePrice: nullableMoney,
  gameId: z.number().nullable().optional(),
  gameName: z.string().nullable().optional(),
  membershipMinutesUsed: z.number().nullable().optional(),
  tierDiscountAmount: nullableMoney,
  bonusUsed: nullableMoney,
  extensionRequestMinutes: z.number().nullable().optional(),
  extensionRequestedAt: z.string().nullable().optional(),
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
  packageName: z.string().nullable().optional(),
  membershipMinutesAvailable: z.number().nullable().optional(),
  membershipMinutesUsed: z.number().nullable().optional(),
  membershipValue: nullableMoney,
  tierName: z.string().nullable().optional(),
  tierDiscountPercent: nullableMoney,
  tierDiscountAmount: nullableMoney,
  bonusBalance: nullableMoney,
  bonusUsed: nullableMoney,
  manualDiscount: nullableMoney,
  loyaltyMinutesUsed: z.number().nullable().optional(),
  loyaltyDiscount: nullableMoney,
  totalDiscount: nullableMoney,
  amount: nullableMoney,
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
  bonusBalance: nullableMoney,
  referralCode: z.string().nullable().optional(),
  referredById: z.number().nullable().optional(),
  visits: z.number().nullable().optional(),
  lastVisitAt: z.string().nullable().optional(),
  tierName: z.string().nullable().optional(),
  tierDiscountPercent: nullableMoney,
  membershipMinutes: z.number().nullable().optional(),
});
const customerPageSchema = pageOf(customerSchema);

const txnSchema = z.object({
  id: z.number(),
  /** TOPUP, SPEND, ADJUST (paid balance) or GIFT, REFERRAL (bonus balance); unknown kinds still parse. */
  type: z.string(),
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
  games: z
    .array(
      z.object({
        gameId: z.number().nullable().optional(),
        gameName: z.string().nullable().optional(),
        sessions: z.number(),
        playedMinutes: z.number(),
      }),
    )
    .nullable()
    .optional()
    .transform((value) => value ?? []),
});

// ---- v3: games, packages, maintenance, programme, shifts, tournaments, profitability -----------------------

export const MAINTENANCE_KINDS = ["REPAIR", "CONTROLLER", "EXPENSE", "OTHER"] as const;
export type MaintenanceKind = (typeof MAINTENANCE_KINDS)[number];
export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  REPAIR: "Onarım",
  CONTROLLER: "Kol",
  EXPENSE: "Masraf",
  OTHER: "Diğer",
};

const gameSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  genre: z.string().nullable().optional(),
  maxPlayers: z.number().nullable().optional(),
  consoleIds: z
    .array(z.number())
    .nullable()
    .optional()
    .transform((value) => value ?? []),
});

const packageSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  deviceType: deviceTypeSchema.nullable().optional().catch(null),
  minutes: z.number(),
  price: moneySchema,
  days: z
    .array(z.number())
    .nullable()
    .optional()
    .transform((value) => value ?? []),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  active: z.boolean(),
  availableNow: z.boolean().nullable().optional().transform((value) => value !== false),
});

const maintenanceLogSchema = z.object({
  id: z.number(),
  consoleId: z.number(),
  kind: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  cost: nullableMoney,
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
});

const insightsSchema = z.object({
  lapsedDays: z.number(),
  top: z.array(customerSchema),
  lapsed: z.array(customerSchema),
});

const tierSchema = z.object({
  id: z.number().nullable().optional(),
  name: z.string(),
  minSpent: moneySchema,
  discountPercent: moneySchema,
});

const programSchema = z.object({
  referralRewardAmount: nullableMoney,
  referralWelcomeAmount: nullableMoney,
  tiers: z
    .array(tierSchema)
    .nullable()
    .optional()
    .transform((value) => value ?? []),
});

const planSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: moneySchema,
  minutes: z.number(),
  periodDays: z.number(),
  deviceType: deviceTypeSchema.nullable().optional().catch(null),
  active: z.boolean(),
});

const membershipSchema = z.object({
  id: z.number(),
  customerId: z.number(),
  planId: z.number().nullable().optional(),
  planName: z.string().nullable().optional(),
  deviceType: deviceTypeSchema.nullable().optional().catch(null),
  minutesTotal: z.number(),
  minutesLeft: z.number(),
  price: nullableMoney,
  paymentMethod: paymentSchema.nullable().optional().catch(null),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  cancelled: z.boolean(),
  usable: z.boolean(),
});

const paymentTotalSchema = z.object({
  paymentMethod: paymentSchema.nullable().optional().catch(null),
  count: z.number(),
  amount: moneySchema,
});
const paymentTotals = z
  .array(paymentTotalSchema)
  .nullable()
  .optional()
  .transform((value) => value ?? []);

const shiftSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  staffId: z.number().nullable().optional(),
  staffName: z.string().nullable().optional(),
  openedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  openingCash: nullableMoney,
  sessions: z.number(),
  sessionsTotal: nullableMoney,
  sessionPayments: paymentTotals,
  topUps: paymentTotals,
  memberships: paymentTotals,
  tournamentFees: paymentTotals,
  cashIn: nullableMoney,
  expectedCash: nullableMoney,
  countedCash: nullableMoney,
  difference: nullableMoney,
  note: z.string().nullable().optional(),
});
const shiftPageSchema = pageOf(shiftSchema);

export const TOURNAMENT_STATUSES = ["REGISTRATION", "RUNNING", "FINISHED", "CANCELLED"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  REGISTRATION: "Kayıt açık",
  RUNNING: "Sürüyor",
  FINISHED: "Bitti",
  CANCELLED: "İptal",
};

const tournamentPlayerSchema = z.object({
  id: z.number(),
  customerId: z.number().nullable().optional(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  paid: z.boolean(),
  paymentMethod: paymentSchema.nullable().optional().catch(null),
  paidAt: z.string().nullable().optional(),
});

const tournamentMatchSchema = z.object({
  id: z.number(),
  round: z.number(),
  position: z.number(),
  player1Id: z.number().nullable().optional(),
  player1Name: z.string().nullable().optional(),
  player2Id: z.number().nullable().optional(),
  player2Name: z.string().nullable().optional(),
  winnerId: z.number().nullable().optional(),
  score: z.string().nullable().optional(),
  ready: z.boolean(),
});

const tournamentSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  gameName: z.string().nullable().optional(),
  startsAt: z.string(),
  entryFee: nullableMoney,
  prizeNote: z.string().nullable().optional(),
  maxPlayers: z.number(),
  status: z.enum(TOURNAMENT_STATUSES),
  winnerPlayerId: z.number().nullable().optional(),
  winnerName: z.string().nullable().optional(),
  playerCount: z.number(),
  paidCount: z.number(),
  collected: nullableMoney,
  rounds: z.number(),
  players: z
    .array(tournamentPlayerSchema)
    .nullable()
    .optional()
    .transform((value) => value ?? []),
  matches: z
    .array(tournamentMatchSchema)
    .nullable()
    .optional()
    .transform((value) => value ?? []),
});

const profitRowSchema = z.object({
  consoleId: z.number(),
  consoleName: z.string().nullable().optional(),
  deviceType: deviceTypeSchema.nullable().optional().catch(null),
  purchaseCost: nullableMoney,
  purchasedOn: z.string().nullable().optional(),
  playedMinutes: z.number(),
  revenue: moneySchema,
  maintenanceCost: moneySchema,
  net: moneySchema,
  paybackPercent: nullableMoney,
  paidBack: z.boolean(),
  last30Revenue: nullableMoney,
  estimatedPaybackDays: z.number().nullable().optional(),
});

const profitabilitySchema = z.object({
  branchId: z.number(),
  purchaseCost: moneySchema,
  revenue: moneySchema,
  maintenanceCost: moneySchema,
  net: moneySchema,
  devices: z.array(profitRowSchema),
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
export type DeviceGame = z.infer<typeof gameSchema>;
export type DevicePackage = z.infer<typeof packageSchema>;
export type MaintenanceLog = z.infer<typeof maintenanceLogSchema>;
export type CustomerInsights = z.infer<typeof insightsSchema>;
export type LoyaltyProgram = z.infer<typeof programSchema>;
export type MembershipPlan = z.infer<typeof planSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type PaymentTotal = z.infer<typeof paymentTotalSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export type ShiftPage = z.infer<typeof shiftPageSchema>;
export type Tournament = z.infer<typeof tournamentSchema>;
export type TournamentPlayer = z.infer<typeof tournamentPlayerSchema>;
export type TournamentMatch = z.infer<typeof tournamentMatchSchema>;
export type Profitability = z.infer<typeof profitabilitySchema>;
export type DeviceProfitRow = z.infer<typeof profitRowSchema>;

export type ConsolePayload = {
  name: string;
  deviceType: DeviceType;
  hourlyRate: string | null;
  multiHourlyRate: string | null;
  purchaseCost?: string | null;
  /** yyyy-MM-dd */
  purchasedOn?: string | null;
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
  packageId?: number;
  gameId?: number;
};
export type FinishPayload = {
  paymentMethod: PaymentMethod;
  discountAmount?: string;
  discountPercent?: string;
  useLoyaltyMinutes?: boolean;
  useMembershipMinutes?: boolean;
  useBonusBalance?: boolean;
};
/** Options the quote is asked for; the same ones go to finish. */
export type QuoteOptions = Omit<FinishPayload, "paymentMethod">;
export type AddItemPayload =
  | { menuProductId: number; quantity: number }
  | { name: string; unitPrice: string; quantity: number };
export type CustomerPayload = { name: string; phone?: string; note?: string; referralCode?: string };
export type GamePayload = { name: string; genre?: string | null; maxPlayers?: number | null };
export type PackagePayload = {
  name: string;
  deviceType: DeviceType | null;
  minutes: number;
  price: string;
  days: number[] | null;
  startTime: string | null;
  endTime: string | null;
  active: boolean;
};
export type ProgramPayload = {
  referralRewardAmount: string | null;
  referralWelcomeAmount: string | null;
  tiers: { name: string; minSpent: string; discountPercent: string }[];
};
export type MembershipPlanPayload = {
  name: string;
  price: string;
  minutes: number;
  periodDays: number;
  deviceType: DeviceType | null;
  active: boolean;
};
export type TournamentPayload = {
  name: string;
  gameName?: string | null;
  /** Local date-time, yyyy-MM-ddTHH:mm:ss */
  startsAt: string;
  entryFee?: string | null;
  prizeNote?: string | null;
  maxPlayers: number;
};
export type TournamentPlayerPayload = {
  customerId?: number;
  name?: string;
  phone?: string;
  paymentMethod?: PaymentMethod;
};
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
export const quoteSession = (sessionId: number, options: QuoteOptions = {}) =>
  request(`${BASE}/sessions/${sessionId}/quote${quoteQuery(options)}`, quoteSchema);
export const approveExtensionRequest = (sessionId: number) =>
  request(`${BASE}/sessions/${sessionId}/extension-request/approve`, sessionSchema, post());
export const dismissExtensionRequest = (sessionId: number) =>
  request(`${BASE}/sessions/${sessionId}/extension-request/dismiss`, sessionSchema, post());
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
export const getCustomer = (customerId: number) => request(`${BASE}/customers/${customerId}`, customerSchema);
export const createCustomer = (payload: CustomerPayload) => request(`${BASE}/customers`, customerSchema, post(payload));
export const updateCustomer = (customerId: number, payload: CustomerPayload) =>
  request(`${BASE}/customers/${customerId}`, customerSchema, put(payload));
export async function deleteCustomer(customerId: number): Promise<void> {
  await request(`${BASE}/customers/${customerId}`, z.unknown(), { method: "DELETE" });
}
export const topUpCustomer = (
  customerId: number,
  payload: { amount: string; paymentMethod: PaymentMethod; note?: string; branchId?: number },
) =>
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

// ---- Devices: QR, games, maintenance ------------------------------------------------------------------------

export const rotateConsoleToken = (consoleId: number) =>
  request(`${BASE}/consoles/${consoleId}/public-token/rotate`, consoleSchema, post());
export const setConsoleGames = (consoleId: number, gameIds: number[]) =>
  request(`${BASE}/consoles/${consoleId}/games`, consoleSchema, put({ gameIds }));
export const startMaintenance = (consoleId: number, payload: { kind?: MaintenanceKind; note?: string }) =>
  request(`${BASE}/consoles/${consoleId}/maintenance`, consoleSchema, post(payload));
export const endMaintenance = (consoleId: number, payload: { cost?: string; note?: string }) =>
  request(`${BASE}/consoles/${consoleId}/maintenance/end`, consoleSchema, post(payload));
export const addConsoleExpense = (consoleId: number, payload: { kind?: MaintenanceKind; cost: string; note?: string }) =>
  request(`${BASE}/consoles/${consoleId}/expenses`, maintenanceLogSchema, post(payload));
export const listMaintenanceLogs = (consoleId: number) =>
  request(`${BASE}/consoles/${consoleId}/maintenance-logs`, z.array(maintenanceLogSchema));

// ---- Game library and packages ------------------------------------------------------------------------------

export const listGames = (branchId: number) => request(`${BASE}/branches/${branchId}/games`, z.array(gameSchema));
export const createGame = (branchId: number, payload: GamePayload) =>
  request(`${BASE}/branches/${branchId}/games`, gameSchema, post(payload));
export const updateGame = (gameId: number, payload: GamePayload) =>
  request(`${BASE}/games/${gameId}`, gameSchema, put(payload));
export async function deleteGame(gameId: number): Promise<void> {
  await request(`${BASE}/games/${gameId}`, z.unknown(), { method: "DELETE" });
}

export const listPackages = (branchId: number, activeOnly = false) =>
  request(`${BASE}/branches/${branchId}/packages?activeOnly=${activeOnly}`, z.array(packageSchema));
export const createPackage = (branchId: number, payload: PackagePayload) =>
  request(`${BASE}/branches/${branchId}/packages`, packageSchema, post(payload));
export const updatePackage = (packageId: number, payload: PackagePayload) =>
  request(`${BASE}/packages/${packageId}`, packageSchema, put(payload));
export async function deletePackage(packageId: number): Promise<void> {
  await request(`${BASE}/packages/${packageId}`, z.unknown(), { method: "DELETE" });
}

// ---- Customer programme -------------------------------------------------------------------------------------

export const customerInsights = (lapsedDays = 30, limit = 20) =>
  request(`${BASE}/customers/insights?lapsedDays=${lapsedDays}&limit=${limit}`, insightsSchema);
export const giftCustomer = (customerId: number, payload: { amount: string; note?: string }) =>
  request(`${BASE}/customers/${customerId}/gift`, customerSchema, post(payload));
export const listMemberships = (customerId: number) =>
  request(`${BASE}/customers/${customerId}/memberships`, z.array(membershipSchema));
export const sellMembership = (
  customerId: number,
  payload: { planId: number; paymentMethod?: PaymentMethod; branchId?: number },
) => request(`${BASE}/customers/${customerId}/memberships`, membershipSchema, post(payload));
export const cancelMembership = (membershipId: number) =>
  request(`${BASE}/memberships/${membershipId}/cancel`, membershipSchema, post());

export const getProgram = () => request(`${BASE}/program`, programSchema);
export const updateProgram = (payload: ProgramPayload) => request(`${BASE}/program`, programSchema, put(payload));

export const listMembershipPlans = (activeOnly = false) =>
  request(`${BASE}/membership-plans?activeOnly=${activeOnly}`, z.array(planSchema));
export const createMembershipPlan = (payload: MembershipPlanPayload) =>
  request(`${BASE}/membership-plans`, planSchema, post(payload));
export const updateMembershipPlan = (planId: number, payload: MembershipPlanPayload) =>
  request(`${BASE}/membership-plans/${planId}`, planSchema, put(payload));
export async function deleteMembershipPlan(planId: number): Promise<void> {
  await request(`${BASE}/membership-plans/${planId}`, z.unknown(), { method: "DELETE" });
}

// ---- Shifts -------------------------------------------------------------------------------------------------

export const openShift = (branchId: number, openingCash: string | null) =>
  request(`${BASE}/branches/${branchId}/shifts`, shiftSchema, post({ openingCash }));
/** The open shift of the signed-in person at the branch, or null (the server answers 204). */
export async function getCurrentShift(branchId: number): Promise<Shift | null> {
  const shift = await request(`${BASE}/branches/${branchId}/shifts/current`, shiftSchema);
  return shift ?? null;
}
export const listShifts = (branchId: number, page = 0) =>
  request(`${BASE}/branches/${branchId}/shifts?page=${page}&size=20`, shiftPageSchema);
export const closeShift = (shiftId: number, payload: { countedCash: string; note?: string }) =>
  request(`${BASE}/shifts/${shiftId}/close`, shiftSchema, post(payload));

// ---- Tournaments --------------------------------------------------------------------------------------------

export const listTournaments = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/tournaments`, z.array(tournamentSchema));
export const getTournament = (tournamentId: number) => request(`${BASE}/tournaments/${tournamentId}`, tournamentSchema);
export const createTournament = (branchId: number, payload: TournamentPayload) =>
  request(`${BASE}/branches/${branchId}/tournaments`, tournamentSchema, post(payload));
export const updateTournament = (tournamentId: number, payload: TournamentPayload) =>
  request(`${BASE}/tournaments/${tournamentId}`, tournamentSchema, put(payload));
export const cancelTournament = (tournamentId: number) =>
  request(`${BASE}/tournaments/${tournamentId}/cancel`, tournamentSchema, post());
export const addTournamentPlayer = (tournamentId: number, payload: TournamentPlayerPayload) =>
  request(`${BASE}/tournaments/${tournamentId}/players`, tournamentSchema, post(payload));
export const removeTournamentPlayer = (tournamentId: number, playerId: number) =>
  request(`${BASE}/tournaments/${tournamentId}/players/${playerId}`, tournamentSchema, { method: "DELETE" });
export const payTournamentPlayer = (tournamentId: number, playerId: number, paymentMethod: PaymentMethod) =>
  request(`${BASE}/tournaments/${tournamentId}/players/${playerId}/pay`, tournamentSchema, post({ paymentMethod }));
export const startTournament = (tournamentId: number) =>
  request(`${BASE}/tournaments/${tournamentId}/start`, tournamentSchema, post());
export const reportMatch = (tournamentId: number, matchId: number, payload: { winnerPlayerId: number; score?: string }) =>
  request(`${BASE}/tournaments/${tournamentId}/matches/${matchId}/result`, tournamentSchema, post(payload));

// ---- Profitability ------------------------------------------------------------------------------------------

export const getProfitability = (branchId: number) =>
  request(`${BASE}/branches/${branchId}/profitability`, profitabilitySchema);

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

/** Query string for the quote endpoint; options left out (or false/empty) are not sent. */
export function quoteQuery(options: QuoteOptions): string {
  const params = new URLSearchParams();
  if (options.useMembershipMinutes) params.set("useMembershipMinutes", "true");
  if (options.useLoyaltyMinutes) params.set("useLoyaltyMinutes", "true");
  if (options.useBonusBalance) params.set("useBonusBalance", "true");
  if (options.discountAmount) params.set("discountAmount", options.discountAmount);
  else if (options.discountPercent) params.set("discountPercent", options.discountPercent);
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** The public page a device's QR code opens. */
export function deviceQrLink(menuOrigin: string, publicToken: string): string {
  return `${menuOrigin.replace(/\/+$/, "")}/cihaz/${encodeURIComponent(publicToken)}`;
}

/**
 * Packages that can be started on a device: active, for its type or for every type. Ones usable right now come
 * first, then by price.
 */
export function packagesForDevice(packages: DevicePackage[], deviceType: DeviceType): DevicePackage[] {
  return packages
    .filter((p) => p.active && (p.deviceType == null || p.deviceType === deviceType))
    .sort((a, b) => Number(b.availableNow) - Number(a.availableNow) || toNumber(a.price) - toNumber(b.price));
}

/** The branch's games with those installed on the device first, each part by name. */
export function gamesForDevice(games: DeviceGame[], consoleId: number): { game: DeviceGame; installed: boolean }[] {
  return games
    .map((game) => ({ game, installed: game.consoleIds.includes(consoleId) }))
    .sort((a, b) => Number(b.installed) - Number(a.installed) || a.game.name.localeCompare(b.game.name, "tr"));
}

/** Matches grouped by round, rounds in order, matches by position. */
export function matchesByRound(matches: TournamentMatch[]): { round: number; matches: TournamentMatch[] }[] {
  const byRound = new Map<number, TournamentMatch[]>();
  for (const match of matches) {
    const list = byRound.get(match.round) ?? [];
    list.push(match);
    byRound.set(match.round, list);
  }
  return Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, list]) => ({ round, matches: [...list].sort((a, b) => a.position - b.position) }));
}

/** "Final", "Yarı final", "Çeyrek final" for the last rounds, otherwise "1. tur". */
export function roundLabel(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Yarı final";
  if (fromEnd === 2) return "Çeyrek final";
  return `${round}. tur`;
}

/** Counted minus expected cash; positive is a surplus. Null when the count is not a valid amount. */
export function cashDifference(expected: number | string | null | undefined, counted: string): number | null {
  const parsed = parseRateInput(counted);
  if (parsed == null) return null;
  return Math.round((Number(parsed) - toNumber(expected)) * 100) / 100;
}

/** Whole days since a local date-time, or null without one. */
export function daysSince(value: string | null | undefined, now: Date): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}
