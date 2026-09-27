import type { Metadata } from "next";

import StaffKitchenView from "@/views/staff/StaffKitchenView";

export const metadata: Metadata = {
  title: "Mutfak",
  robots: { index: false, follow: false },
};

export default function KitchenStaffPage() {
  return <StaffKitchenView />;
}
