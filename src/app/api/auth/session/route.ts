import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getAccessProfileFromToken,
  normalizeProductCode,
  normalizeProductScope,
  type AccessProfile,
  type PackageCode,
  type ProductCode,
  type ProductScope,
} from "@/lib/auth-user";
import { API_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

type LiveAccessProfile = {
  activePackage?: string | null;
  products?: unknown;
  scopes?: unknown;
};

const PACKAGE_CODES = new Set<string>([
  "FREE_PACKAGE",
  "STARTER_PACKAGE",
  "PRO_PACKAGE",
  "ULTIMATE_PACKAGE",
  "ULTIMATE_TRIAL_PACKAGE",
  "CORPORATE_PACKAGE",
]);

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isPackageCode(value: string): value is PackageCode {
  return PACKAGE_CODES.has(value);
}

function mergeLiveProfile(tokenProfile: AccessProfile, live: LiveAccessProfile): AccessProfile {
  const activePackageRaw = typeof live.activePackage === "string" ? live.activePackage : null;
  const liveProducts = readStringArray(live.products)
    .map(normalizeProductCode)
    .filter((item): item is ProductCode => item != null);
  const liveScopes = readStringArray(live.scopes)
    .map(normalizeProductScope)
    .filter((item): item is ProductScope => item != null);
  const mergedActivePackage =
    activePackageRaw && isPackageCode(activePackageRaw)
      ? activePackageRaw
      : tokenProfile.activePackage;
  return {
    activePackage: mergedActivePackage,
    products: [...new Set([...tokenProfile.products, ...liveProducts])],
    scopes: [...new Set([...tokenProfile.scopes, ...liveScopes])],
    roles: tokenProfile.roles,
    provider: tokenProfile.provider,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }

  const tokenProfile = getAccessProfileFromToken(accessToken);

  try {
    const upstream = await axios.get<LiveAccessProfile>(`${API_BASE_URL}/auth/access-profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: () => true,
      timeout: 20_000,
    });

    if (upstream.status >= 200 && upstream.status < 300 && upstream.data) {
      return NextResponse.json(mergeLiveProfile(tokenProfile, upstream.data));
    }

    console.warn("[auth/session] access-profile upstream returned non-success", {
      status: upstream.status,
    });
  } catch (error) {
    console.warn("[auth/session] access-profile upstream failed; falling back to token claims", error);
  }

  return NextResponse.json(tokenProfile);
}
