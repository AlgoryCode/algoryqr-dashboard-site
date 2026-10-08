import { NextResponse } from "next/server";

import { getServerFlowEntries } from "@/lib/flow-log";

export async function GET() {
  return NextResponse.json({ entries: getServerFlowEntries() });
}
