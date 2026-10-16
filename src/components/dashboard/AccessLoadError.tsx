"use client";

import { QueryErrorState } from "@/components/dashboard/QueryErrorState";

export function AccessLoadError({
  title = "Paket bilgileri alınamadı",
  description = "Paketiniz ve ürün haklarınız doğrulanamadı. Lütfen tekrar deneyin.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return <QueryErrorState title={title} description={description} onRetry={onRetry} />;
}
