import type { NextResponse } from "next/server";

import {
  clearDemoOnboardingCookies,
  setPersonalDemoTrialCookie,
  setDemoSetupDoneCookie,
} from "@/lib/server/demo-onboarding-cookies";
import {
  fetchPersonalDemoStatus,
  getPersonalDemoSetupState,
  isPersonalDemoAccount,
} from "@/lib/server/demo-onboarding-gate";

/** Marks the session as a personal demo trial (setup gate) when applicable. */
export async function applyPersonalDemoTrialCookie(response: NextResponse, accessToken: string | undefined) {
  if (!accessToken) {
    clearDemoOnboardingCookies(response);
    return;
  }
  const status = await fetchPersonalDemoStatus(accessToken);
  if (isPersonalDemoAccount(status)) {
    setPersonalDemoTrialCookie(response);
    if (getPersonalDemoSetupState(status) === true) {
      setDemoSetupDoneCookie(response);
    }
    return;
  }
  clearDemoOnboardingCookies(response);
}
