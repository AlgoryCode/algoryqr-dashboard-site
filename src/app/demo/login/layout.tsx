import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Demo giriş",
  description: "AlgoryQR deneme hesabınıza giriş yapın.",
  path: "/demo/login",
  noIndex: true,
});

export default function DemoLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
