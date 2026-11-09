import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

const LEGACY_DASHBOARD_REDIRECTS: Record<string, string> = {
  analitik: DASHBOARD_ROUTES.reportsHub,
  "restoran-duzeni": DASHBOARD_ROUTES.restaurantLayout,
  "waiter-orders": DASHBOARD_ROUTES.overview,
  garson: DASHBOARD_ROUTES.overview,
  "garson/mutfak": DASHBOARD_ROUTES.overview,
  "siparis-paneli": DASHBOARD_ROUTES.overview,
  users: DASHBOARD_ROUTES.menuUsers,
  customers: DASHBOARD_ROUTES.menuCustomers,
};

function toQueryString(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function DashboardCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const pathKey = slug.join("/");
  const target = LEGACY_DASHBOARD_REDIRECTS[pathKey];
  if (target) {
    const query = toQueryString(await searchParams);
    redirect(`${target}${query}`);
  }

  return null;
}
