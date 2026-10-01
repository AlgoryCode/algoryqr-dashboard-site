import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { trustedForwardedForHeader } from "@/lib/server/client-headers";

/** Storefront endpoints are unauthenticated; the caller IP is forwarded so the backend can rate limit. */
export async function proxyPublicStoreRequest(
  request: Request,
  upstreamPath: string,
  method: "GET" | "POST",
) {
  try {
    const text = method === "GET" ? "" : await request.text();
    let data: unknown;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        return NextResponse.json({ message: "Geçersiz JSON" }, { status: 400 });
      }
    }

    const upstream = await axios.request({
      url: `${API_BASE_URL}${upstreamPath}`,
      method,
      data,
      headers: {
        Accept: "application/json",
        ...(text ? { "Content-Type": "application/json" } : {}),
        ...trustedForwardedForHeader(request),
      },
      validateStatus: () => true,
      timeout: 20_000,
    });

    if (upstream.status === 204 || upstream.data == null || upstream.data === "") {
      return new NextResponse(null, { status: upstream.status });
    }
    return NextResponse.json(upstream.data, { status: upstream.status });
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
      }
      if (error.response) {
        return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
      }
    }
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
