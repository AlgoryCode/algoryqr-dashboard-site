import { redirect } from "next/navigation";

import { STAFF_SITE_ORIGIN } from "@/lib/config";

export default function WaiterStaffPage() {
  redirect(STAFF_SITE_ORIGIN);
}
