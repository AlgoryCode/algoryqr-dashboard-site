import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildUpstreamAuthHeaders, resolveSessionMerchantId } from "@/lib/auth-user";
import { API_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

export async function GET(
  req: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const { merchantId: rawMerchantId } = await context.params;
    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);

    if (!accessToken) {
      return NextResponse.json({ message: "Access token yok" }, { status: 401 });
    }

    const sessionMerchantId = resolveSessionMerchantId(accessToken, cookieStore);
    if (sessionMerchantId == null) {
      return NextResponse.json({ message: "Token içinde merchantId yok" }, { status: 401 });
    }

    const requested = rawMerchantId === "me" ? sessionMerchantId : Number(rawMerchantId);
    if (!Number.isInteger(requested) || requested !== sessionMerchantId) {
      return NextResponse.json({ message: "QR kayıtları bu işletmeye ait değil" }, { status: 403 });
    }

    const searchParams = new URL(req.url).searchParams;
    const includeImage = searchParams.get("includeImage") === "true" ? "true" : "false";
    const page = searchParams.get("page") ?? "0";
    const size = searchParams.get("size") ?? "5";
    const scope = searchParams.get("scope") ?? "ALL";

    const upstream = await axios.get(`${API_BASE_URL}/merchant/${sessionMerchantId}/qr`, {
      headers: buildUpstreamAuthHeaders(accessToken),
      params: { includeImage, page, size, scope },
      validateStatus: () => true,
      timeout: 20_000,
    });

    return NextResponse.json(upstream.data ?? { content: [], page: 0, size: 5, totalElements: 0, totalPages: 0, hasNext: false }, { status: upstream.status });
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
      }
      if (error.response) {
        return NextResponse.json(error.response.data ?? [], { status: error.response.status });
      }
    }
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
