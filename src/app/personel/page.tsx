import type { Metadata } from "next";

import PersonelApp from "@/views/personel/PersonelApp";

export const metadata: Metadata = {
  title: "Personel",
  robots: { index: false, follow: false },
};

export default function StaffGatePage() {
  return <PersonelApp />;
}
