import { API_BASE_URL } from "@/lib/config";
import type { AssistantUsageOutcome, AssistantUsageTopic } from "@/lib/assistant-usage";

/**
 * Logs one dashboard assistant question to qr-service for the Asistan report. Sends topic, outcome
 * and timing only, never the question. Failures are ignored: the chat must not depend on it.
 */
export async function logAssistantUsage(input: {
  accessToken: string;
  merchantId: number | null;
  branchId: number;
  topic: AssistantUsageTopic;
  outcome: AssistantUsageOutcome;
  responseMs: number;
}): Promise<void> {
  if (!API_BASE_URL) return;
  try {
    await fetch(`${API_BASE_URL}/analytics/assistant-usage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(input.merchantId != null ? { "X-Merchant-Id": String(input.merchantId) } : {}),
      },
      body: JSON.stringify({
        branchId: input.branchId,
        topic: input.topic,
        outcome: input.outcome,
        responseMs: Math.max(0, Math.min(600_000, Math.round(input.responseMs))),
      }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Usage logging is best effort.
  }
}
