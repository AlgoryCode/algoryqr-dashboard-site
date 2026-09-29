import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getUserFromAccessToken } from "@/lib/auth-user";
import { readDemoSetupDoneFromRequest, readDemoTrialAccountFromRequest } from "@/lib/server/demo-onboarding-cookies";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import DemoSetupPageClient from "./DemoSetupPageClient";

export default async function DemoSetupPage() {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get("accessToken")?.value?.trim() ||
    cookieStore.get("algory_access_token")?.value?.trim() ||
    null;

  if (!accessToken) {
    redirect("/login");
  }

  if (!readDemoTrialAccountFromRequest(cookieStore)) {
    redirect(DASHBOARD_ROUTES.root);
  }

  if (readDemoSetupDoneFromRequest(cookieStore)) {
    redirect(DASHBOARD_ROUTES.root);
  }

  const user = getUserFromAccessToken(accessToken);
  const rawId = user?.id;
  const userId = rawId != null ? parseInt(rawId, 10) : null;

  return <DemoSetupPageClient userId={Number.isFinite(userId) ? userId : null} />;
}
