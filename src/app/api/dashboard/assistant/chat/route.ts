import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAccessProfileFromToken, hasProduct, toAccessProfile } from "@/lib/auth-user";
import { QR_AGENT_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { fetchDashboardSessionContext } from "@/lib/server/session-context-fetch";

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
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }

  const tokenProfile = getAccessProfileFromToken(accessToken);
  const session = await fetchDashboardSessionContext();
  const profile = session
    ? toAccessProfile({
        packageCode: session.packageCode ?? null,
        products: session.products,
        scopes: session.scopes,
        roles: session.user.role ? [session.user.role] : [],
        provider: session.user.provider,
      })
    : tokenProfile;
  if (!hasProduct(profile, "SMART_ASSISTANT") && !hasProduct(profile, "QR_AGENT")) {
    return NextResponse.json({ message: "Akıllı asistan paketi gerekli" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Geçersiz istek" }, { status: 400 });
  }

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
      const message =
        upstream.data?.message ||
        (typeof upstream.data === "string" ? upstream.data : "") ||
        "Agent error";
      return NextResponse.json(
        { message },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    return NextResponse.json({
      reply: upstream.data.reply ?? "",
      conversationId: upstream.data.conversationId,
    });
  } catch (error) {
    if (error instanceof AxiosError && error.code === "ECONNABORTED") {
      return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
    }
    return NextResponse.json({ message: "Asistan yanıt veremedi" }, { status: 502 });
  }
}
