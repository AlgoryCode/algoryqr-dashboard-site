import { notFound } from "next/navigation";

import { PublicStoreView } from "@/views/store/PublicStoreView";
import { fetchPublicStore } from "@/lib/public-store-fetch";

export const dynamic = "force-dynamic";

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const result = await fetchPublicStore(decodeURIComponent(handle));
  if (result.status !== "ok") notFound();
  return <PublicStoreView data={result.data} />;
}
