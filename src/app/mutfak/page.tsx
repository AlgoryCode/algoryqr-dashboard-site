import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { parseBranchScope } from "@/lib/branch-scope";
import { STAFF_SITE_ORIGIN } from "@/lib/config";
import { readAccessTokenFromCookies, readRefreshTokenFromCookies } from "@/lib/server/auth-cookies";
import OwnerKitchenView from "@/views/panel/OwnerKitchenView";

export const metadata: Metadata = {
  title: "Mutfak",
  robots: { index: false, follow: false },
};

export default async function KitchenPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const cookieStore = await cookies();
  if (!readAccessTokenFromCookies(cookieStore) && !readRefreshTokenFromCookies(cookieStore)) {
    redirect(STAFF_SITE_ORIGIN);
  }
  const branch = parseBranchScope((await searchParams).branch);
  return <OwnerKitchenView initialBranchId={branch === "all" ? null : branch} />;
}
