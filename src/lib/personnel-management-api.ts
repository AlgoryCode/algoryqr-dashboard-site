export type StaffRole = "WAITER" | "KITCHEN" | "COURIER";

export type MenuOwnerSummary = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type MenuWaiterMember = {
  id: number;
  branchId?: number | null;
  username: string;
  displayName: string;
  staffRole?: StaffRole | null;
  active: boolean;
  commissionEnabled?: boolean;
  commissionType?: "PERCENT" | "FIXED" | null;
  commissionScope?: "PER_ITEM" | "BILL_TOTAL" | null;
  commissionValue?: number | string | null;
  createdAt?: string | null;
};

export type MenuUsersResponse = {
  owner?: MenuOwnerSummary | null;
  waiters: MenuWaiterMember[];
};

type MerchantStaffListResponse = {
  staff?: MenuWaiterMember[] | null;
  waiters?: MenuWaiterMember[] | null;
  page?: number | null;
  size?: number | null;
  totalElements?: number | null;
  totalPages?: number | null;
  hasNext?: boolean | null;
};

export type MerchantStaffPageParams = {
  /** 0 tabanlı sayfa numarası */
  page: number;
  size: number;
  /** Ad / kullanıcı adında DB LIKE araması */
  q?: string;
  assignment?: "all" | "assigned" | "unassigned";
  branchId?: number | null;
  active?: boolean | null;
  role?: StaffRole | null;
};

export type MerchantStaffPage = {
  items: MenuWaiterMember[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type MenuCustomerItem = {
  customerId: number;
  menuId?: number | null;
  businessId?: number | null;
  menuName?: string | null;
  menuDeleted?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  joinedAt?: string | null;
  memberSince?: string | null;
};

export class PersonnelManagementApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Kept as a compatibility alias for owner dashboard views.
export { PersonnelManagementApiError as WaiterApiError };

export const MERCHANT_STAFF_QUERY_KEY = ["merchant-staff"] as const;

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  WAITER: "Garson",
  KITCHEN: "Mutfak",
  COURIER: "Kurye",
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function messageFromUnknown(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function ownerFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: "same-origin" });
}

export function parseStaffRole(value: unknown): StaffRole {
  const role = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (role === "KITCHEN") return "KITCHEN";
  if (role === "COURIER") return "COURIER";
  return "WAITER";
}

function normalizeStaffMember(member: MenuWaiterMember): MenuWaiterMember {
  const branchId =
    typeof member.branchId === "number" && Number.isFinite(member.branchId) && member.branchId > 0
      ? member.branchId
      : null;
  return { ...member, branchId, staffRole: parseStaffRole(member.staffRole) };
}

function normalizeUsersResponse(data: MenuUsersResponse): MenuUsersResponse {
  return {
    owner: data.owner ?? null,
    waiters: Array.isArray(data.waiters) ? data.waiters.map(normalizeStaffMember) : [],
  };
}

export async function listMerchantStaff(): Promise<MenuWaiterMember[]> {
  const response = await ownerFetch("/api/staff/panel/staff", {
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<MerchantStaffListResponse & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(response.status, data.message || "Personel alınamadı");
  }
  const rows = Array.isArray(data.staff)
    ? data.staff
    : Array.isArray(data.waiters)
      ? data.waiters
      : [];
  return rows.map(normalizeStaffMember);
}

export async function listMerchantStaffPage(params: MerchantStaffPageParams): Promise<MerchantStaffPage> {
  const search = new URLSearchParams();
  search.set("page", String(Math.max(0, params.page)));
  search.set("size", String(params.size));
  const q = params.q?.trim();
  if (q) search.set("q", q);
  if (params.assignment && params.assignment !== "all") search.set("assignment", params.assignment);
  if (params.branchId != null && params.branchId > 0) search.set("branchId", String(params.branchId));
  if (params.active != null) search.set("active", String(params.active));
  if (params.role) search.set("role", params.role);

  const response = await ownerFetch(`/api/staff/panel/staff?${search.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<MerchantStaffListResponse & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(response.status, data.message || "Personel alınamadı");
  }
  const rows = Array.isArray(data.staff) ? data.staff : [];
  const size = typeof data.size === "number" && data.size > 0 ? data.size : params.size;
  const totalElements = typeof data.totalElements === "number" ? data.totalElements : rows.length;
  const totalPages =
    typeof data.totalPages === "number" ? data.totalPages : Math.ceil(totalElements / Math.max(size, 1));
  const page = typeof data.page === "number" ? data.page : params.page;
  return {
    items: rows.map(normalizeStaffMember),
    page,
    size,
    totalElements,
    totalPages,
    hasNext: typeof data.hasNext === "boolean" ? data.hasNext : page + 1 < totalPages,
  };
}

export async function createMerchantStaff(payload: {
  username: string;
  password: string;
  displayName: string;
  staffRole?: StaffRole;
}): Promise<MenuWaiterMember> {
  const response = await ownerFetch("/api/staff/panel/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<MenuWaiterMember & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(response.status, data.message || "Personel eklenemedi");
  }
  return normalizeStaffMember(data);
}

export async function assignMerchantStaffBranch(
  staffId: number,
  branchId: number | null,
): Promise<MenuWaiterMember> {
  const response = await ownerFetch(`/api/staff/panel/staff/${staffId}/branch`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ branchId }),
  });
  const data = await parseJson<MenuWaiterMember & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(
      response.status,
      data.message || "Şube ataması yapılamadı",
    );
  }
  return normalizeStaffMember(data);
}

export async function updateMerchantStaff(
  staffId: number,
  payload: {
    displayName?: string;
    active?: boolean;
    password?: string;
    commissionEnabled?: boolean;
    commissionType?: "PERCENT" | "FIXED";
    commissionScope?: "PER_ITEM" | "BILL_TOTAL";
    commissionValue?: number;
  },
): Promise<MenuWaiterMember> {
  const response = await ownerFetch(`/api/staff/panel/staff/${staffId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<MenuWaiterMember & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(
      response.status,
      data.message || "Personel güncellenemedi",
    );
  }
  return normalizeStaffMember(data);
}

export async function listMenuUsers(branchId: number): Promise<MenuUsersResponse> {
  const response = await ownerFetch(`/api/staff/panel/branch/${branchId}/staff`, {
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<MenuUsersResponse & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(response.status, data.message || "Personeller alınamadı");
  }
  return normalizeUsersResponse(data);
}

export async function createMenuWaiter(
  branchId: number,
  payload: { username: string; password: string; displayName: string; staffRole?: StaffRole },
): Promise<MenuWaiterMember> {
  const response = await ownerFetch(`/api/staff/panel/branch/${branchId}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<MenuWaiterMember & { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(response.status, data.message || "Kullanıcı eklenemedi");
  }
  return normalizeStaffMember(data);
}

export async function listBusinessCustomers(): Promise<MenuCustomerItem[]> {
  const response = await ownerFetch("/api/staff/panel/customers/my", {
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<MenuCustomerItem[] | { message?: string }>(response);
  if (!response.ok) {
    throw new PersonnelManagementApiError(
      response.status,
      messageFromUnknown(data, "Müşteriler alınamadı"),
    );
  }
  return Array.isArray(data) ? data : [];
}
