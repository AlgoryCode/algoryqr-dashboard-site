import { NextResponse } from "next/server";

import { resolveAssistantAccess } from "@/lib/server/assistant-access";

/** Today's dashboard assistant allowance for the signed-in merchant. */
export async function GET() {
  const access = await resolveAssistantAccess();
  if (!access.ok) {
    return NextResponse.json({ message: access.message }, { status: access.status });
  }
  return NextResponse.json(
    { entitled: access.entitled, allowance: access.allowance },
    { headers: { "Cache-Control": "no-store" } },
  );
}
