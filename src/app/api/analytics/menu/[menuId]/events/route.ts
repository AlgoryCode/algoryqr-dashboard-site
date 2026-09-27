import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { clientContextHeaders } from "@/lib/server/client-headers";

type RouteParams = { params: Promise<{ menuId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { menuId } = await params;

  try {
    const body = await request.text();
    const parsed = body ? JSON.parse(body) : {};

    const upstream = await axios.post(
      `${API_BASE_URL}/analytics/menu/${encodeURIComponent(menuId)}/events`,
      parsed,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...clientContextHeaders(request),
        },
        validateStatus: () => true,
        timeout: 10_000,
      },
    );

    if (upstream.status >= 400) {
      console.error(
        JSON.stringify({
          event: "menu_analytics_ingest_fallback",
          menuId,
          status: upstream.status,
          chefEvents: Array.isArray(parsed.events)
            ? (parsed.events as { type?: string }[])
                .filter((item) => item.type?.startsWith("CHEF_"))
                .map((item) => item.type)
            : [],
        }),
      );
      if (upstream.status === 404 || upstream.status === 400) {
        return new NextResponse(null, { status: 204 });
      }
    }

    if (upstream.status === 204 || upstream.data == null || upstream.data === "") {
      return new NextResponse(null, { status: upstream.status });
    }
    return NextResponse.json(upstream.data ?? {}, { status: upstream.status });
  } catch (error) {
    if (error instanceof AxiosError && error.code === "ECONNABORTED") {
      return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
    }
    console.error(
      JSON.stringify({
        event: "menu_analytics_ingest_error",
        menuId,
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
    return new NextResponse(null, { status: 204 });
  }
}
