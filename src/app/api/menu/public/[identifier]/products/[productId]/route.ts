import { NextResponse } from "next/server";

import {
  publicMenuCachedJson,
  readPublicMenuUpstreamJson,
} from "@/lib/public-menu-server-cache";

export async function GET(
  _req: Request,
  context: { params: Promise<{ identifier: string; productId: string }> },
) {
  try {
    const { identifier, productId } = await context.params;
    const { upstream, data } = await readPublicMenuUpstreamJson(
      `/menu/public/${identifier}/products/${productId}`,
    );
    return publicMenuCachedJson(data, upstream.status);
  } catch (error) {
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
