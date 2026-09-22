import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export default function HomePage() {
  redirect(DASHBOARD_ROUTES.root);
}
