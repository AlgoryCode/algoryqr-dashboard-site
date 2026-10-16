"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QueryErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function QueryErrorState({
  title = "Veriler yüklenemedi",
  description = "Sunucuyla iletişim kurulamadı. Lütfen tekrar deneyin.",
  onRetry,
  retrying = false,
  className,
}: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-dashed border-destructive/40 px-4 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="mx-auto h-5 w-5 text-destructive" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn("mr-2 h-4 w-4", retrying && "animate-spin")} />
          Tekrar dene
        </Button>
      ) : null}
    </div>
  );
}
