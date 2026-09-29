/** AlgoryQR demo / Ultimate deneme paketi — authservice `DemoAccountSupport` ile hizalı. */
export const DEMO_TRIAL_DAYS = 15;
export const DEMO_TRIAL_PACKAGE_CODE = "ULTIMATE_TRIAL_PACKAGE";
export const DEMO_TRIAL_PACKAGE_NAME = "Algory Ultimate Deneme Sürümü";
export const DEMO_TRIAL_ACCOUNT_LABEL = "AlgoryQR Deneme Sürümü";
export const DEMO_TRIAL_SHORT_LABEL = "Deneme sürümü";

export function demoTrialSubtitle(daysLeft: number | null): string {
  if (daysLeft == null) {
    return `${DEMO_TRIAL_ACCOUNT_LABEL} aktif; örnek veriler sunum amaçlıdır.`;
  }
  if (daysLeft === 0) {
    return `${DEMO_TRIAL_PACKAGE_NAME} bugün sona eriyor.`;
  }
  return `${DEMO_TRIAL_PACKAGE_NAME} · ${daysLeft} gün kaldı`;
}
