import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildUpstreamAuthHeaders, resolveSessionUserId } from "@/lib/auth-user";
import { API_BASE_URL, MENU_APP_ORIGIN } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxy(req: Request, method: string, path: string[]) {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return NextResponse.json({ message: "Access token yok" }, { status: 401 });
  }
  const suffix = path.length > 0 ? `/${path.join("/")}` : "";
  const url = `${API_BASE_URL}/features${suffix}`;
  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const headers: Record<string, string> = {
    ...buildUpstreamAuthHeaders(accessToken),
    ...(req.headers.get("x-forwarded-for")
      ? { "X-Forwarded-For": req.headers.get("x-forwarded-for") as string }
      : {}),
  };
  let data: unknown = undefined;
  if (method !== "GET" && method !== "DELETE") {
    if (isMultipart) {
      data = Buffer.from(await req.arrayBuffer());
      headers["Content-Type"] = contentType;
    } else if (method !== "POST" || req.headers.get("content-length") !== "0") {
      const text = await req.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          return NextResponse.json({ message: "Geçersiz JSON" }, { status: 400 });
        }
      }
      headers["Content-Type"] = "application/json";
    }
  }
  if (suffix === "/QR_MENU/qrs" && data && typeof data === "object") {
    const userId = resolveSessionUserId(accessToken, cookieStore);
    const body = data as Record<string, unknown>;
    const details = body.details;
    data = {
      ...body,
      userId,
      ...(details && typeof details === "object" && body.type === "menu"
        ? { details: { ...(details as Record<string, unknown>), publicOrigin: MENU_APP_ORIGIN } }
        : {}),
    };
  }
  try {
    const upstream = await axios.request({
      url,
      method,
      data,
      headers,
      validateStatus: () => true,
      timeout: 20_000,
    });
    if (
      upstream.status === 204 ||
      upstream.status === 205 ||
      upstream.data == null ||
      upstream.data === ""
    ) {
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
      console.error("[features-proxy] upstream unavailable", url, error.code ?? error.message);
      return NextResponse.json({ message: "API sunucusuna bağlanılamadı" }, { status: 502 });
    }
    console.error("[features-proxy] unexpected error", url, error);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function GET(req: Request, context: RouteContext) {
  return proxy(req, "GET", (await context.params).path ?? []);
}

export async function POST(req: Request, context: RouteContext) {
  return proxy(req, "POST", (await context.params).path ?? []);
}

export async function PUT(req: Request, context: RouteContext) {
  return proxy(req, "PUT", (await context.params).path ?? []);
}

export async function DELETE(req: Request, context: RouteContext) {
  return proxy(req, "DELETE", (await context.params).path ?? []);
}
