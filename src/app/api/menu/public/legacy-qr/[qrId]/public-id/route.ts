import { NextResponse } from "next/server";

import { readPublicMenuUpstreamJson } from "@/lib/public-menu-server-cache";

export async function GET(
  _req: Request,
  context: { params: Promise<{ qrId: string }> },
) {
  try {
    const { qrId } = await context.params;
    const trimmed = qrId?.trim() ?? "";
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      return NextResponse.json({ message: "Menü bulunamadı" }, { status: 404 });
    }

    const { upstream, data } = await readPublicMenuUpstreamJson(
      `/menu/public/legacy-qr/${encodeURIComponent(trimmed)}/public-id`,
    );
    return NextResponse.json(data ?? {}, { status: upstream.status });
  } catch (error) {
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
