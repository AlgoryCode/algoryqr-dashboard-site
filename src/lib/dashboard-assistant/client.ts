import { readAssistantSalesCache } from "@/lib/dashboard-assistant/sales-cache";
import { formatSalesContextForAgent } from "@/lib/dashboard-assistant/sales-snapshot";

export type DashboardAssistantReply = {
  reply: string;
  conversationId: string;
};

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
    | (DashboardAssistantReply & { message?: unknown })
    | { message?: unknown }
    | null;

  if (!response.ok) {
    const err =
      data && typeof data.message === "string" && data.message.trim()
        ? data.message.trim()
        : "Asistan yanıt veremedi";
    throw new Error(err);
  }

  if (!data || !("reply" in data) || typeof data.reply !== "string" || !data.conversationId) {
    throw new Error("Asistan yanıt veremedi");
  }

  return { reply: data.reply, conversationId: data.conversationId };
}
