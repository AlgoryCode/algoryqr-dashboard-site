import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get("accessToken")?.value?.trim() ||
    cookieStore.get("algory_access_token")?.value?.trim() ||
    null;
  const refreshToken =
    cookieStore.get("refreshToken")?.value?.trim() ||
    cookieStore.get("algory_refresh_token")?.value?.trim() ||
    null;

  if (accessToken || refreshToken) {
    redirect(DASHBOARD_ROUTES.overview);
  }

  redirect("/login");
}
