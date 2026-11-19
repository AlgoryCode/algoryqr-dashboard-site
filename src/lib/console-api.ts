import { z } from "zod";

import { ApiError } from "@/lib/api/errors";

const moneySchema = z.union([z.number(), z.string()]);

const consoleSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  hourlyRate: moneySchema.nullable().optional(),
  effectiveHourlyRate: moneySchema.nullable().optional(),
  busy: z.boolean(),
});

const rateSchema = z.object({
  branchId: z.number(),
  defaultHourlyRate: moneySchema.nullable().optional(),
});

const sessionSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  consoleId: z.number(),
  consoleName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  hourlyRate: moneySchema,
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  durationMinutes: z.number(),
  amount: moneySchema.nullable().optional(),
  active: z.boolean(),
});

const sessionPageSchema = z.object({
  content: z.array(sessionSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
});

export type GameConsole = z.infer<typeof consoleSchema>;
export type ConsoleRate = z.infer<typeof rateSchema>;
export type ConsoleSession = z.infer<typeof sessionSchema>;
export type ConsoleSessionPage = z.infer<typeof sessionPageSchema>;

export type ConsolePayload = { name: string; hourlyRate: string | null };
export type StartSessionPayload = { customerName?: string; note?: string };

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
        : "Konsol isteği başarısız";
    throw new ApiError(response.status, message, data);
  }
  if (response.status === 204) {
    return undefined as z.infer<TSchema>;
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(response.status, "Konsol yanıtı okunamadı");
  }
  return parsed.data;
}

export function listConsoles(branchId: number): Promise<GameConsole[]> {
  return request(`/api/console/branches/${branchId}/consoles`, z.array(consoleSchema));
}

export function createConsole(branchId: number, payload: ConsolePayload): Promise<GameConsole> {
  return request(`/api/console/branches/${branchId}/consoles`, consoleSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateConsole(consoleId: number, payload: ConsolePayload): Promise<GameConsole> {
  return request(`/api/console/consoles/${consoleId}`, consoleSchema, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteConsole(consoleId: number): Promise<void> {
  await request(`/api/console/consoles/${consoleId}`, z.unknown(), { method: "DELETE" });
}

export function getRate(branchId: number): Promise<ConsoleRate> {
  return request(`/api/console/branches/${branchId}/rate`, rateSchema);
}

export function updateRate(branchId: number, defaultHourlyRate: string | null): Promise<ConsoleRate> {
  return request(`/api/console/branches/${branchId}/rate`, rateSchema, {
    method: "PUT",
    body: JSON.stringify({ defaultHourlyRate }),
  });
}

export function startSession(consoleId: number, payload: StartSessionPayload): Promise<ConsoleSession> {
  return request(`/api/console/consoles/${consoleId}/sessions`, sessionSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function finishSession(sessionId: number): Promise<ConsoleSession> {
  return request(`/api/console/sessions/${sessionId}/finish`, sessionSchema, { method: "POST" });
}

export function listActiveSessions(branchId: number): Promise<ConsoleSession[]> {
  return request(`/api/console/branches/${branchId}/sessions/active`, z.array(sessionSchema));
}

export function listSessionHistory(branchId: number, page = 0): Promise<ConsoleSessionPage> {
  return request(`/api/console/branches/${branchId}/sessions?page=${page}&size=20`, sessionPageSchema);
}

/**
 * Reads a rate typed the Turkish way ("120,50", "1.250") or plainly ("120.5"). Empty means no rate.
 * Returns undefined when the text is not a non-negative amount.
 */
export function parseRateInput(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return normalized;
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
