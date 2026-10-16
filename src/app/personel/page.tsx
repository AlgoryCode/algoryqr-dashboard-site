import { redirect } from "next/navigation";

import { STAFF_SITE_ORIGIN } from "@/lib/config";

export default function StaffGatePage() {
  redirect(STAFF_SITE_ORIGIN);
}
