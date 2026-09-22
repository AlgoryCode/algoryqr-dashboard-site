"use client";

export const PENDING_VERIFICATION_EMAIL_KEY = "algory_pending_verification_email";
export const VERIFY_INTENT_PARAM = "verify";

export function persistPendingVerificationEmail(email: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return;
  }
  sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalized);
}

export function readPendingVerificationEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function clearPendingVerificationEmail(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function buildVerificationLoginUrl(loginHref: string): string {
  const [path, search] = loginHref.split("?");
  const params = new URLSearchParams(search ?? "");
  params.set(VERIFY_INTENT_PARAM, "1");
  return `${path}?${params.toString()}`;
}

export function isVerifyIntent(value: string | null): boolean {
  return value === "1";
}
