import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getMerchantIdFromAccessToken } from "@/lib/auth-user";
import { API_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { clientContextHeaders } from "@/lib/server/client-headers";
import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

type BranchListResponse = {
  content?: Array<{ id: number; printKitchenEnabled?: boolean }>;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    let branchId = url.searchParams.get("branchId");

    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
    }

    if (!branchId) {
      const userId = getMerchantIdFromAccessToken(accessToken);
      const branches = await axios.get<BranchListResponse>(`${API_BASE_URL}/branches`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...clientContextHeaders(request),
        },
        validateStatus: () => true,
        timeout: 20_000,
      });
      if (branches.status >= 400) {
        return NextResponse.json(branches.data ?? { message: "Subeler alinamadi" }, {
          status: branches.status,
        });
      }
      const first = branches.data?.content?.[0];
      if (!first) {
        return NextResponse.json({
          merchantId: userId ?? null,
          branchId: null,
          printKitchenEnabled: false,
          devices: [],
        });
      }
      branchId = String(first.id);
    }

    return proxyAuthenticatedRequest(
      request,
      `/print-agent/manage/settings?branchId=${encodeURIComponent(branchId)}`,
      "GET",
    );
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
    }
    return NextResponse.json({ message: "Sunucu hatasi" }, { status: 500 });
  }
}
