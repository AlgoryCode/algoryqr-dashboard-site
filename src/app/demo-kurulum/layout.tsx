import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Demo Kurulum",
  description: "Deneme ortamınız hazırlanıyor. Menü, şube ve örnek veriler oluşturuluyor.",
  path: "/demo-kurulum",
  noIndex: true,
});

export default function DemoSetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
