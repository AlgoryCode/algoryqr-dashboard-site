import { NextResponse } from "next/server";
import { z } from "zod";

import { BASE_QUICK_PROMPTS, insightPrompts } from "@/lib/dashboard-assistant/quick-answers";
import { resolveAssistantCaller } from "@/lib/server/assistant-access";
import { AssistantSalesError, loadAssistantSales } from "@/lib/server/assistant-sales";

const querySchema = z.object({
  branchId: z.coerce.number().int().positive(),
  menuId: z.coerce.number().int().positive().optional(),
});

/** Loads the branch's sales summary on the server and returns the chips to show, data-driven ones included. */
export async function GET(request: Request) {
  const caller = await resolveAssistantCaller();
  if (!caller.ok) {
    return NextResponse.json({ message: caller.message }, { status: caller.status });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    branchId: url.searchParams.get("branchId"),
    menuId: url.searchParams.get("menuId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Geçersiz istek" }, { status: 400 });
  }

  try {
    const sales = await loadAssistantSales(caller, parsed.data.branchId, parsed.data.menuId ?? null);
    return NextResponse.json({
      branchName: sales.branchName,
      fetchedAt: sales.fetchedAt,
      prompts: [...insightPrompts(sales), ...BASE_QUICK_PROMPTS],
    });
  } catch (error) {
    const message = error instanceof AssistantSalesError ? error.message : "Satış raporu alınamadı";
    const status = error instanceof AssistantSalesError && error.status === 401 ? 401 : 502;
    return NextResponse.json({ message, prompts: BASE_QUICK_PROMPTS }, { status });
  }
}
