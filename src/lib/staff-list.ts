import { readList, writeList } from "@/lib/filter-params";
import type { StaffRole } from "@/lib/personnel-management-api";

export const STAFF_PAGE_SIZE = 20;

export const STAFF_STATUSES = ["all", "active", "inactive"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const STAFF_ROLES: StaffRole[] = ["WAITER", "KITCHEN", "COURIER"];

/** "none" stands for staff that are not tied to a branch. */
export const NO_BRANCH = "none";

export type StaffListFilters = {
  query: string;
  /** Branch ids and "none" for staff without a branch; empty means every branch. */
  branches: string[];
  /** Empty means every role. */
  roles: StaffRole[];
  status: StaffStatus;
  /** 1-based; the server counts from 0. */
  page: number;
};

export const EMPTY_STAFF_FILTERS: StaffListFilters = {
  query: "",
  branches: [],
  roles: [],
  status: "all",
  page: 1,
};

export function parseStaffFilters(params: URLSearchParams): StaffListFilters {
  const status = params.get("durum");
  const page = Number(params.get("sayfa"));
  // The branch detail page still links here with ?branch=<id>.
  const legacyBranch = Number(params.get("branch"));
  const branches = readList(params, "sube").filter((value) => value === NO_BRANCH || Number(value) > 0);
  if (branches.length === 0 && Number.isSafeInteger(legacyBranch) && legacyBranch > 0) branches.push(String(legacyBranch));
  return {
    query: params.get("ara") ?? "",
    branches,
    roles: readList(params, "rol", STAFF_ROLES),
    status: STAFF_STATUSES.includes(status as StaffStatus) ? (status as StaffStatus) : "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeStaffFilters(filters: StaffListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("ara", filters.query.trim());
  writeList(params, "sube", filters.branches);
  writeList(params, "rol", filters.roles);
  if (filters.status !== "all") params.set("durum", filters.status);
  if (filters.page > 1) params.set("sayfa", String(filters.page));
  return params;
}

/** Arguments for `listMerchantStaffPage`; several roles and branches go as comma-separated lists. */
export function staffPageParams(filters: StaffListFilters) {
  return {
    page: filters.page - 1,
    size: STAFF_PAGE_SIZE,
    q: filters.query.trim(),
    roles: filters.roles,
    branches: filters.branches,
    active: filters.status === "all" ? null : filters.status === "active",
  };
}

/** Filters a phone user cannot see without opening the filter sheet: only the branch select. */
export function hiddenStaffFilterCount(filters: StaffListFilters): number {
  return filters.branches.length > 0 ? 1 : 0;
}

export function isStaffListNarrowed(filters: StaffListFilters): boolean {
  return (
    filters.query.trim() !== "" || filters.branches.length > 0 || filters.roles.length > 0 || filters.status !== "all"
  );
}

/** Two letters for the avatar: first letters of the first two words, or the first two letters of one word. */
export function staffInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [[...words[0]][0], [...words[1]][0]];
  return letters.join("").toLocaleUpperCase("tr");
}
