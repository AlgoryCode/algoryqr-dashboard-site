import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Paket seçin",
  description: "Aktif paketiniz yok. AlgoryQR paketlerini ve modüllerini seçip satın alın.",
  path: "/magaza",
  noIndex: true,
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
