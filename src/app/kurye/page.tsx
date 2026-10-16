import { redirect } from "next/navigation";

import { STAFF_SITE_ORIGIN } from "@/lib/config";

export default function CourierPage() {
  redirect(STAFF_SITE_ORIGIN);
}
