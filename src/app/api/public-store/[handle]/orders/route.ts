import { NextResponse } from "next/server";

import { proxyPublicStoreRequest } from "@/lib/server/public-store-proxy";
import { parseStoreHandle } from "@/lib/store-public";

export async function POST(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  const { handle } = await context.params;
  const parsed = parseStoreHandle(decodeURIComponent(handle));
  if (!parsed) {
    return NextResponse.json({ message: "Mağaza bulunamadı" }, { status: 404 });
  }
  return proxyPublicStoreRequest(
    request,
    `/store/public/${parsed.storeNo}/${encodeURIComponent(parsed.token)}/orders`,
    "POST",
  );
}
