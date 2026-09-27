import type { Metadata } from "next";

import StaffLoginView from "@/views/staff/StaffLoginView";

export const metadata: Metadata = {
  title: "Personel girişi",
  robots: { index: false, follow: false },
};

export default function StaffGatePage() {
  return <StaffLoginView />;
}
