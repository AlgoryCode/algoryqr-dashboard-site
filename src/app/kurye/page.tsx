import type { Metadata } from "next";

import StaffCourierView from "@/views/staff/StaffCourierView";

export const metadata: Metadata = {
  title: "Kurye",
  robots: { index: false, follow: false },
};

export default function CourierStaffPage() {
  return <StaffCourierView />;
}
