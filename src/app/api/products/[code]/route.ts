import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import {
  fetchProductServiceProductByCode,
  isProductServiceConfigured,
} from "@/lib/server/product-service-catalog";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;

    if (isProductServiceConfigured()) {
      const product = await fetchProductServiceProductByCode(code);
      return NextResponse.json(product);
    }

    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Access token yok" }, { status: 401 });
    }
    const upstream = await axios.get(`${API_BASE_URL}/products/${encodeURIComponent(code)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      validateStatus: () => true,
      timeout: 20_000,
    });
    return NextResponse.json(upstream.data ?? {}, { status: upstream.status });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      const failed = error as { status?: number; data?: unknown };
      return NextResponse.json(failed.data ?? {}, { status: failed.status ?? 502 });
    }
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
    }
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
