/**
 * qr-service sends the merchant's entitlement version on every response. It goes up whenever the
 * plan changes (purchase, renewal, expiry, an admin grant), so a higher number than the one the
 * loaded plan came with means the plan on screen is stale.
 */
export const ENTITLEMENT_VERSION_HEADER = "X-Entitlement-Version";

let seen: number | null = null;
let onChange: (() => void) | null = null;

/** Registers what to do when the version moves (reload the plan). */
export function onEntitlementVersionChange(listener: () => void) {
  onChange = listener;
}

/** Feeds a response header value; calls the listener when the version went up since the last one. */
export function noteEntitlementVersion(raw: unknown): boolean {
  const value = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(value)) return false;
  const changed = seen != null && value > seen;
  if (seen == null || value > seen) seen = value;
  if (changed) onChange?.();
  return changed;
}

/** Forgets the version, e.g. on sign-out, so the next account starts fresh. */
export function resetEntitlementVersion() {
  seen = null;
}
