import type { Metadata } from "next";

import StaffWaiterView from "@/views/staff/StaffWaiterView";

export const metadata: Metadata = {
  title: "Garson",
  robots: { index: false, follow: false },
};

export default function WaiterStaffPage() {
  return <StaffWaiterView />;
}
