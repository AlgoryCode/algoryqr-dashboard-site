export type StaffCountBand = "1_5" | "6_15" | "16_30" | "31_plus";
export type BranchCountBand = "1" | "2_3" | "4_10" | "11_plus";

const DEMO_SETUP_DONE_PREFIX = "algory_demo_setup_done_";
const DEMO_SETUP_STAFF_PREFIX = "algory_demo_setup_staff_";
const DEMO_SETUP_BRANCH_PREFIX = "algory_demo_setup_branches_";

export const STAFF_COUNT_OPTIONS: ReadonlyArray<{ id: StaffCountBand; label: string; hint: string }> = [
  { id: "1_5", label: "1–5 kişi", hint: "Küçük ekip" },
  { id: "6_15", label: "6–15 kişi", hint: "Orta ölçekli işletme" },
  { id: "16_30", label: "16–30 kişi", hint: "Geniş servis ekibi" },
  { id: "31_plus", label: "31+ kişi", hint: "Büyük operasyon" },
];

export const BRANCH_COUNT_OPTIONS: ReadonlyArray<{ id: BranchCountBand; label: string; hint: string }> = [
  { id: "1", label: "1 şube", hint: "Tek lokasyon" },
  { id: "2_3", label: "2–3 şube", hint: "Birkaç lokasyon" },
  { id: "4_10", label: "4–10 şube", hint: "Büyüyen zincir" },
  { id: "11_plus", label: "11+ şube", hint: "Geniş şube ağı" },
];

export function demoSetupDoneKey(userId: string | number): string {
  return `${DEMO_SETUP_DONE_PREFIX}${userId}`;
}

export function demoSetupStaffKey(userId: string | number): string {
  return `${DEMO_SETUP_STAFF_PREFIX}${userId}`;
}

export function demoSetupBranchKey(userId: string | number): string {
  return `${DEMO_SETUP_BRANCH_PREFIX}${userId}`;
}

export function isDemoSetupDone(userId: string | number | null | undefined): boolean {
  if (userId == null || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(demoSetupDoneKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markDemoSetupDone(
  userId: string | number,
  staffBand?: StaffCountBand | null,
  branchBand?: BranchCountBand | null,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(demoSetupDoneKey(userId), "1");
    if (staffBand) {
      window.localStorage.setItem(demoSetupStaffKey(userId), staffBand);
    }
    if (branchBand) {
      window.localStorage.setItem(demoSetupBranchKey(userId), branchBand);
    }
  } catch {
    /* ignore */
  }
}

export function readDemoSetupStaffBand(userId: string | number): StaffCountBand | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(demoSetupStaffKey(userId));
    if (value === "1_5" || value === "6_15" || value === "16_30" || value === "31_plus") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function readDemoSetupBranchBand(userId: string | number): BranchCountBand | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(demoSetupBranchKey(userId));
    if (value === "1" || value === "2_3" || value === "4_10" || value === "11_plus") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}
