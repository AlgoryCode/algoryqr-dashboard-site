import axios, { AxiosError } from "axios";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import {
  ASSISTANT_DAILY_LIMIT_CODE,
  classifyAssistantTopic,
  type AssistantUsageOutcome,
} from "@/lib/assistant-usage";
import { QR_AGENT_BASE_URL } from "@/lib/config";
import { resolveAssistantCaller } from "@/lib/server/assistant-access";
import { chargeAssistantQuestion, refundAssistantQuestion } from "@/lib/server/assistant-meter";
import { logAssistantUsage } from "@/lib/server/assistant-usage-log";

const postBodySchema = z.object({
  message: z.string().trim().min(1).max(1_000),
  branchId: z.number().int().positive(),
  menuId: z.number().int().positive().nullable().optional(),
  conversationId: z.string().trim().min(1).max(100).optional(),
  salesContext: z.string().trim().min(1).max(48_000),
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

  const startedAt = Date.now();
  // Logged after the response is sent, so the chat never waits on it.
  const logUsage = (outcome: AssistantUsageOutcome) => {
    const responseMs = Date.now() - startedAt;
    after(() =>
      logAssistantUsage({
        accessToken,
        merchantId,
        branchId: parsed.data.branchId,
        topic: classifyAssistantTopic(parsed.data.message),
        outcome,
        responseMs,
      }),
    );
  };

  try {
    const upstream = await axios.post<AgentChatResponse>(
      `${QR_AGENT_BASE_URL}/api/v1/business/chat`,
      {
        branchId: parsed.data.branchId,
        message: parsed.data.message,
        conversationId: parsed.data.conversationId,
        salesContext: parsed.data.salesContext,
      },
      {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
        timeout: 60_000,
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
