import { ASSISTANT_DAILY_LIMIT_CODE, type AssistantAllowance } from "@/lib/assistant-usage";
import type { QuickPrompt, QuickPromptId } from "@/lib/dashboard-assistant/quick-answers";

export type DashboardAssistantReply = {
  reply: string;
  /** Null after an instant chip answer that did not open a conversation yet. */
  conversationId: string | null;
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

export type AssistantSalesChips = { prompts: QuickPrompt[]; branchName: string | null };

/** The chips for a branch; the server reads the sales summary and adds the ones the data suggests. */
export async function getDashboardAssistantChips(
  branchId: number,
  menuId: number | null,
): Promise<AssistantSalesChips> {
  const params = new URLSearchParams({ branchId: String(branchId) });
  if (menuId != null) params.set("menuId", String(menuId));
  const response = await fetch(`/api/dashboard/assistant/sales?${params}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { prompts?: QuickPrompt[]; branchName?: string | null; message?: unknown }
    | null;
  if (!response.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Satış raporu alınamadı");
  }
  return { prompts: data?.prompts ?? [], branchName: data?.branchName ?? null };
}

export async function postDashboardAssistantMessage(
  message: string,
  branchId: number,
  menuId: number | null,
  options?: { conversationId?: string; promptId?: QuickPromptId },
): Promise<DashboardAssistantReply> {
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
      promptId: options?.promptId,
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

  if (!data || !("reply" in data) || typeof data.reply !== "string") {
    throw new Error("Asistan yanıt veremedi");
  }

  return {
    reply: data.reply,
    conversationId: typeof data.conversationId === "string" ? data.conversationId : null,
    allowance: readAllowance(data.allowance),
  };
}
