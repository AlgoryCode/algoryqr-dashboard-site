import { ASSISTANT_DAILY_LIMIT_CODE, type AssistantAllowance } from "@/lib/assistant-usage";
import { readAssistantSalesCache } from "@/lib/dashboard-assistant/sales-cache";
import { formatSalesContextForAgent } from "@/lib/dashboard-assistant/sales-snapshot";

export type DashboardAssistantReply = {
  reply: string;
  conversationId: string;
  allowance: AssistantAllowance | null;
};

/** Thrown when a plan without the assistant has used today's free questions. */
export class AssistantLimitError extends Error {
  constructor(
    message: string,
    readonly allowance: AssistantAllowance | null,
  ) {
    super(message);
    this.name = "AssistantLimitError";
  }
}

function readAllowance(value: unknown): AssistantAllowance | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<AssistantAllowance>;
  if (typeof row.used !== "number") return null;
  return {
    limit: typeof row.limit === "number" ? row.limit : null,
    used: row.used,
    remaining: typeof row.remaining === "number" ? row.remaining : null,
  };
}

export async function getDashboardAssistantAllowance(): Promise<{
  entitled: boolean;
  allowance: AssistantAllowance | null;
}> {
  const response = await fetch("/api/dashboard/assistant/allowance", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { entitled?: unknown; allowance?: unknown; message?: unknown }
    | null;
  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string" && data.message.trim() ? data.message : "Asistan hakkı okunamadı",
    );
  }
  return { entitled: data?.entitled === true, allowance: readAllowance(data?.allowance) };
}

export function salesContextFromCache(branchId: number, menuId: number | null): string {
  const cache = readAssistantSalesCache(branchId, menuId);
  if (!cache) return "";
  return formatSalesContextForAgent(cache);
}

export async function postDashboardAssistantMessage(
  message: string,
  branchId: number,
  menuId: number | null,
  options?: { conversationId?: string; salesContext?: string },
): Promise<DashboardAssistantReply> {
  const salesContext =
    options?.salesContext?.trim() || salesContextFromCache(branchId, menuId);
  const response = await fetch("/api/dashboard/assistant/chat", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      branchId,
      menuId,
      conversationId: options?.conversationId,
      salesContext,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | (Omit<DashboardAssistantReply, "allowance"> & { message?: unknown; allowance?: unknown })
    | { message?: unknown; code?: unknown; allowance?: unknown }
    | null;

  if (!response.ok) {
    if (data && "code" in data && data.code === ASSISTANT_DAILY_LIMIT_CODE) {
      throw new AssistantLimitError(
        typeof data.message === "string" ? data.message : "Bugünkü ücretsiz sorularınız bitti.",
        readAllowance(data.allowance),
      );
    }
    const err =
      data && typeof data.message === "string" && data.message.trim()
        ? data.message.trim()
        : "Asistan yanıt veremedi";
    throw new Error(err);
  }

  if (!data || !("reply" in data) || typeof data.reply !== "string" || !data.conversationId) {
    throw new Error("Asistan yanıt veremedi");
  }

  return {
    reply: data.reply,
    conversationId: data.conversationId,
    allowance: readAllowance(data.allowance),
  };
}
