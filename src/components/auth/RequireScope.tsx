"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { hasScope, type AccessProfile, type ProductScope } from "@/lib/auth-user";

function resolveAllowed(
  profile: AccessProfile | null | undefined,
  scope?: ProductScope,
  anyOf?: ProductScope[],
): boolean {
  if (scope) return hasScope(profile, scope);
  if (anyOf && anyOf.length > 0) {
    return anyOf.some((item) => hasScope(profile, item));
  }
  return true;
}

export function useRequireScope(scope?: ProductScope, anyOf?: ProductScope[]) {
  const { data: profile, isLoading, isError, refetch } = useAccessProfile();
  return {
    allowed: resolveAllowed(profile, scope, anyOf),
    isLoading,
    isError,
    retry: refetch,
    profile,
  };
}

const defaultLoading = (
  <div className="flex items-center justify-center py-20 text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
);

export function RequireScope({
  scope,
  anyOf,
  children,
  fallback = null,
  loading = defaultLoading,
}: {
  scope?: ProductScope;
  anyOf?: ProductScope[];
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}) {
  const { allowed, isLoading, isError, retry } = useRequireScope(scope, anyOf);
  if (isLoading) return loading;
  if (isError) {
    return (
      <AccessLoadError
        title="Erişim bilgileri alınamadı"
        description="Paket ve yetki bilgileriniz doğrulanamadı. Lütfen tekrar deneyin."
        onRetry={() => void retry()}
      />
    );
  }
  return allowed ? children : fallback;
}
