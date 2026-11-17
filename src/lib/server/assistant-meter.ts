import { allowanceFromUsage, type AssistantAllowance, type MeteredUsage } from "@/lib/assistant-usage";
import { API_BASE_URL } from "@/lib/config";

const FEATURE = "ASSISTANT_QUESTION";

type Caller = { accessToken: string; merchantId: number | null };

export type QuestionCharge =
  | { kind: "charged"; allowance: AssistantAllowance }
  | { kind: "limit"; allowance: AssistantAllowance; message: string }
  | { kind: "unavailable" };

function headers(caller: Caller, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${caller.accessToken}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(caller.merchantId != null ? { "X-Merchant-Id": String(caller.merchantId) } : {}),
  };
}

function isUsage(value: unknown): value is MeteredUsage {
  return typeof value === "object" && value !== null && typeof (value as MeteredUsage).used === "number";
}

/** Today's assistant allowance as qr-service meters it, or null when it cannot be read. */
export async function fetchAssistantUsage(caller: Caller): Promise<MeteredUsage | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/usage/${FEATURE}`, {
      headers: headers(caller),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return isUsage(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * Charges one question before the assistant is asked. `key` is made here and never leaves the
 * server, so a retried request is charged once and only this route can give the question back.
 */
export async function chargeAssistantQuestion(caller: Caller, key: string): Promise<QuestionCharge> {
  if (!API_BASE_URL) return { kind: "unavailable" };
  try {
    const response = await fetch(`${API_BASE_URL}/usage/${FEATURE}/consume`, {
      method: "POST",
      headers: headers(caller, true),
      body: JSON.stringify({ idempotencyKey: key, reference: "dashboard-chat" }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && isUsage(data)) {
      return { kind: "charged", allowance: allowanceFromUsage(data) };
    }
    const denial = data as { code?: string; message?: string; limit?: number | null; used?: number | null } | null;
    if (response.status === 403 && denial?.code === "LIMIT_REACHED") {
      const limit = typeof denial.limit === "number" ? denial.limit : 0;
      const used = typeof denial.used === "number" ? denial.used : limit;
      return {
        kind: "limit",
        allowance: { limit, used, remaining: Math.max(0, limit - used) },
        message: denial.message || `Bugünkü ${limit} ücretsiz sorunuzu kullandınız.`,
      };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Gives a charged question back (the assistant did not answer). Returns the allowance after it. */
export async function refundAssistantQuestion(caller: Caller, key: string): Promise<AssistantAllowance | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/usage/${FEATURE}/release`, {
      method: "POST",
      headers: headers(caller, true),
      body: JSON.stringify({ idempotencyKey: key }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const data: unknown = await response.json().catch(() => null);
    return response.ok && isUsage(data) ? allowanceFromUsage(data) : null;
  } catch {
    return null;
  }
}
