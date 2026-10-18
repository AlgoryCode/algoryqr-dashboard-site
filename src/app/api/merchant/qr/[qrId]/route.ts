import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildUpstreamAuthHeaders } from "@/lib/auth-user";
import { API_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

async function readAccessToken() {
  const cookieStore = await cookies();
  return readAccessTokenFromCookies(cookieStore);
}

function errorResponse(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED") {
      return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
    }
    if (error.response) {
      return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
    }
  }
  return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
}

export async function PUT(req: Request, context: { params: Promise<{ qrId: string }> }) {
  try {
    const { qrId } = await context.params;
    const accessToken = await readAccessToken();
    if (!accessToken) {
      return NextResponse.json({ message: "Access token yok" }, { status: 401 });
    }
    const body = await req.text();
    const upstream = await axios.put(`${API_BASE_URL}/merchant/qr/${qrId}`, body || undefined, {
      headers: {
        "Content-Type": "application/json",
        ...buildUpstreamAuthHeaders(accessToken),
      },
      validateStatus: () => true,
      timeout: 20_000,
    });
    return NextResponse.json(upstream.data ?? {}, { status: upstream.status });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ qrId: string }> }) {
  try {
    const { qrId } = await context.params;
    const accessToken = await readAccessToken();
    if (!accessToken) {
      return NextResponse.json({ message: "Access token yok" }, { status: 401 });
    }
    const upstream = await axios.delete(`${API_BASE_URL}/merchant/qr/${qrId}`, {
      headers: buildUpstreamAuthHeaders(accessToken),
      validateStatus: () => true,
      timeout: 20_000,
    });
    const data = upstream.data ?? "Deleted Success";
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return errorResponse(error);
  }
}
