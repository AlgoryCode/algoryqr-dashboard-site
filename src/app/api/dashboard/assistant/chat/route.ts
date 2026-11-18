import axios, { AxiosError } from "axios";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import {
  ASSISTANT_DAILY_LIMIT_CODE,
  classifyAssistantTopic,
  type AssistantUsageOutcome,
} from "@/lib/assistant-usage";
import { QR_AGENT_API_KEY, QR_AGENT_BASE_URL } from "@/lib/config";
import {
  answerQuickPrompt,
  QUICK_PROMPT_IDS,
  type QuickPromptId,
} from "@/lib/dashboard-assistant/quick-answers";
import { formatSalesContextForAgent } from "@/lib/dashboard-assistant/sales-snapshot";
import { resolveAssistantCaller } from "@/lib/server/assistant-access";
import { AssistantSalesError, loadAssistantSales } from "@/lib/server/assistant-sales";
import { chargeAssistantQuestion, refundAssistantQuestion } from "@/lib/server/assistant-meter";
import { logAssistantUsage } from "@/lib/server/assistant-usage-log";

const postBodySchema = z.object({
  message: z.string().trim().min(1).max(1_000),
  branchId: z.number().int().positive(),
  menuId: z.number().int().positive().nullable().optional(),
  conversationId: z.string().trim().min(1).max(100).optional(),
  /** A ready-made chip; answered from the sales summary without the agent or a question charge. */
  promptId: z.enum(QUICK_PROMPT_IDS as [QuickPromptId, ...QuickPromptId[]]).optional(),
});

type AgentChatResponse = {
  reply?: string;
  conversationId?: string;
  message?: string;
};

export async function POST(request: Request) {
  const caller = await resolveAssistantCaller();
  if (!caller.ok) {
    return NextResponse.json({ message: caller.message }, { status: caller.status });
  }
  const { accessToken, merchantId } = caller;

  const json = await request.json().catch(() => null);
  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Geçersiz istek" }, { status: 400 });
  }

  const { branchId } = parsed.data;
  const menuId = parsed.data.menuId ?? null;
  const startedAt = Date.now();
  const logUsage = (outcome: AssistantUsageOutcome) => {
    const responseMs = Date.now() - startedAt;
    // Logged after the response is sent, so the chat never waits on it.
    after(() =>
      logAssistantUsage({
        accessToken,
        merchantId,
        branchId,
        topic: classifyAssistantTopic(parsed.data.message),
        outcome,
        responseMs,
      }),
    );
  };

  if (parsed.data.promptId) {
    try {
      const sales = await loadAssistantSales(caller, branchId, menuId);
      const reply = answerQuickPrompt(parsed.data.promptId, sales);
      if (reply) {
        logUsage("ANSWERED");
        return NextResponse.json({ reply, conversationId: parsed.data.conversationId ?? null, allowance: null });
      }
    } catch (error) {
      if (error instanceof AssistantSalesError) {
        return NextResponse.json({ message: error.message }, { status: error.status === 401 ? 401 : 502 });
      }
      return NextResponse.json({ message: "Satış raporu alınamadı" }, { status: 502 });
    }
    // Not enough data for the ready answer: the agent takes it as a normal question.
  }

  // qr-service charges the question first; one that is not answered is given back below.
  const chargeKey = crypto.randomUUID();
  const charge = await chargeAssistantQuestion(caller, chargeKey);
  if (charge.kind === "limit") {
    return NextResponse.json(
      { message: charge.message, code: ASSISTANT_DAILY_LIMIT_CODE, allowance: charge.allowance },
      { status: 429 },
    );
  }
  if (charge.kind === "unavailable") {
    // Without the meter the free limit cannot be held, so the question is refused.
    return NextResponse.json(
      { message: "Asistan şu an kullanılamıyor, biraz sonra tekrar deneyin." },
      { status: 503 },
    );
  }
  const refund = () => refundAssistantQuestion(caller, chargeKey);

  try {
    // Built here with the owner's token; the agent also reads qr-service itself with the same token.
    const salesContext = await loadAssistantSales(caller, branchId, menuId)
      .then(formatSalesContextForAgent)
      .catch(() => "");
    const upstream = await axios.post<AgentChatResponse>(
      `${QR_AGENT_BASE_URL}/api/v1/business/chat`,
      {
        branchId,
        menuId,
        message: parsed.data.message,
        conversationId: parsed.data.conversationId,
        ...(salesContext ? { salesContext } : {}),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Token": accessToken,
          ...(QR_AGENT_API_KEY ? { "X-Agent-Key": QR_AGENT_API_KEY } : {}),
        },
        validateStatus: () => true,
        timeout: 90_000,
      },
    );

    if (upstream.status >= 400) {
      logUsage("FAILED");
      await refund();
      const message =
        upstream.data?.message ||
        (typeof upstream.data === "string" ? upstream.data : "") ||
        "Agent error";
      return NextResponse.json(
        { message },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    const reply = upstream.data.reply ?? "";
    const answered = reply.trim().length > 0;
    logUsage(answered ? "ANSWERED" : "FAILED");
    const allowance = answered ? charge.allowance : ((await refund()) ?? charge.allowance);
    return NextResponse.json({
      reply,
      conversationId: upstream.data.conversationId,
      allowance,
    });
  } catch (error) {
    logUsage("FAILED");
    await refund();
    if (error instanceof AxiosError && error.code === "ECONNABORTED") {
      return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
    }
    return NextResponse.json({ message: "Asistan yanıt veremedi" }, { status: 502 });
  }
}
