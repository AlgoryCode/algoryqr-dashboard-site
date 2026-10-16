"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, Plus, Search } from "lucide-react";

import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { ChoiceBadges, StaffBranchAssignForm } from "@/components/dashboard/staff/StaffRosterControls";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { formatBranchCode, formatBranchListLabel, type BranchItem } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  assignMerchantStaffBranch,
  createMerchantStaff,
  listMerchantStaff,
  MERCHANT_STAFF_QUERY_KEY,
  parseStaffRole,
  STAFF_ROLE_LABEL,
  WaiterApiError,
  type MenuWaiterMember,
  type StaffRole,
} from "@/lib/personnel-management-api";
import { cn } from "@/lib/utils";

type AssignmentFilter = "all" | "assigned" | "unassigned";
type ActivityFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | StaffRole;

const ASSIGNMENT_OPTIONS: ReadonlyArray<{ value: AssignmentFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "assigned", label: "Şubeli" },
  { value: "unassigned", label: "Şubesiz" },
];

const ACTIVITY_OPTIONS: ReadonlyArray<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Pasif" },
];

const ROLE_FILTER_OPTIONS: ReadonlyArray<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "WAITER", label: "Garson" },
  { value: "KITCHEN", label: "Mutfak" },
  { value: "COURIER", label: "Kurye" },
];

const CREATE_ROLE_OPTIONS: ReadonlyArray<{ value: StaffRole; label: string }> = [
  { value: "WAITER", label: "Garson" },
  { value: "KITCHEN", label: "Mutfak" },
  { value: "COURIER", label: "Kurye" },
];

function matchesSearch(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLocaleLowerCase("tr").includes(query);
}

function branchLabel(branches: BranchItem[], branchId?: number | null): string {
  if (branchId == null) return "Şubesiz";
  const branch = branches.find((item) => item.id === branchId);
  return branch ? formatBranchListLabel(branch) : formatBranchCode(branchId);
}

function StatusTag({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        active
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

export default function MenuUsersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchFromQuery = Number(searchParams.get("branch"));
  const initialBranchId =
    Number.isFinite(branchFromQuery) && branchFromQuery > 0 ? branchFromQuery : null;
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();
  const { accessLoading, accessError, retryAccess, canUseWaiterPanel } = useWaiterPanelAccess();
  const branchesQuery = useBranches(canUseWaiterPanel && !accessLoading);
  const branches = branchesQuery.data?.content ?? [];

  const [search, setSearch] = useState("");
  const [assignment, setAssignment] = useState<AssignmentFilter>(initialBranchId ? "assigned" : "all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [branchFilter, setBranchFilter] = useState<number | "all">(initialBranchId ?? "all");
  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("WAITER");
  const [assignTarget, setAssignTarget] = useState<MenuWaiterMember | null>(null);

  const usersQuery = useQuery({
    queryKey: MERCHANT_STAFF_QUERY_KEY,
    enabled: canUseWaiterPanel && !accessLoading,
    queryFn: listMerchantStaff,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createMerchantStaff({
        username: username.trim(),
        password,
        displayName: displayName.trim(),
        staffRole,
      }),
    onSuccess: async (created) => {
      setUsername("");
      setPassword("");
      setDisplayName("");
      setStaffRole("WAITER");
      setCreateOpen(false);
      setAssignment("all");
      setActivity("all");
      setRoleFilter("all");
      setBranchFilter("all");
      setSearch("");
      queryClient.setQueryData<MenuWaiterMember[]>(MERCHANT_STAFF_QUERY_KEY, (current) => {
        const staff = current ?? [];
        if (staff.some((member) => member.id === created.id)) return staff;
        return [...staff, created];
      });
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      router.replace(DASHBOARD_ROUTES.menuUsers);
      notify("info", "Personel eklendi. Şubeye atamak için Ata’yı kullanın.");
    },
    onError: (err) => {
      notify("danger", err instanceof WaiterApiError ? err.message : "Personel eklenemedi.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ staffId, branchId }: { staffId: number; branchId: number | null }) =>
      assignMerchantStaffBranch(staffId, branchId),
    onSuccess: async (_data, vars) => {
      setAssignTarget(null);
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      await queryClient.invalidateQueries({ queryKey: ["branchDetailUsers"] });
      notify("info", vars.branchId == null ? "Personel şubeden çıkarıldı." : "Personel şubeye atandı.");
    },
    onError: (err) => {
      notify("danger", err instanceof WaiterApiError ? err.message : "Şube ataması yapılamadı.");
    },
  });

  const waiters = usersQuery.data ?? [];
  const query = search.trim().toLocaleLowerCase("tr");

  const filteredWaiters = useMemo(
    () =>
      waiters.filter((member) => {
        const assigned = member.branchId != null;
        if (assignment === "assigned" && !assigned) return false;
        if (assignment === "unassigned" && assigned) return false;
        if (assignment === "assigned" && branchFilter !== "all" && member.branchId !== branchFilter) {
          return false;
        }
        if (activity === "active" && !member.active) return false;
        if (activity === "inactive" && member.active) return false;
        if (roleFilter !== "all" && parseStaffRole(member.staffRole) !== roleFilter) return false;
        return matchesSearch(
          [
            member.displayName,
            member.username,
            STAFF_ROLE_LABEL[parseStaffRole(member.staffRole)],
            branchLabel(branches, member.branchId),
          ].join(" "),
          query,
        );
      }),
    [activity, assignment, branchFilter, branches, query, roleFilter, waiters],
  );

  const resetCreateForm = () => {
    setUsername("");
    setPassword("");
    setDisplayName("");
    setStaffRole("WAITER");
  };

  const hasFilter =
    Boolean(query) ||
    assignment !== "all" ||
    activity !== "all" ||
    roleFilter !== "all";
  const emptyLabel = hasFilter ? "Bu filtreyle eşleşen personel yok." : "Henüz personel yok.";

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (accessLoading || (canUseWaiterPanel && branchesQuery.isLoading && !branchesQuery.data)) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personeller" hint="Ana kullanıcı ve personel hesapları" />
        <DashboardLoadingState label="Personel hazırlanıyor..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title="Personeller"
        hint="Personel önce eklenir, sonra şubeye atanır"
        action={
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={!canUseWaiterPanel}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Yeni personel
          </Button>
        }
      />

      {!canUseWaiterPanel ? (
        <p className="text-sm text-muted-foreground">Personel paneli bu hesapta açık değil.</p>
      ) : usersQuery.isLoading ? (
        <DashboardLoadingState label="Personel yükleniyor..." />
      ) : usersQuery.isError ? (
        <p className="text-sm text-destructive">
          {usersQuery.error instanceof Error ? usersQuery.error.message : "Personel alınamadı."}
        </p>
      ) : (
        <div className="space-y-4">
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Personel</h2>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Personel ara…"
                  className="h-9 pl-9"
                  aria-label="Personel ara"
                />
              </div>
            </div>

            <div className="space-y-2">
              <ChoiceBadges
                label="Şube"
                value={assignment}
                options={ASSIGNMENT_OPTIONS}
                onChange={(value) => setAssignment(value)}
              />
              {assignment === "assigned" && branches.length > 0 ? (
                <div className="max-w-xs">
                  <SearchableSelect
                    value={branchFilter === "all" ? "all" : String(branchFilter)}
                    onValueChange={(next) => {
                      if (next === "all") {
                        setBranchFilter("all");
                        return;
                      }
                      const id = Number(next);
                      if (Number.isFinite(id) && id > 0) setBranchFilter(id);
                    }}
                    options={[
                      { value: "all", label: "Tüm şubeler" },
                      ...branches.map((branch) => ({
                        value: String(branch.id),
                        label: formatBranchListLabel(branch),
                      })),
                    ]}
                    placeholder="Şube seçin"
                    searchPlaceholder="Şube ara..."
                    emptyText="Şube bulunamadı."
                    className="h-9"
                  />
                </div>
              ) : null}
              <ChoiceBadges
                label="Durum"
                value={activity}
                options={ACTIVITY_OPTIONS}
                onChange={(value) => setActivity(value)}
              />
              <ChoiceBadges
                label="Rol"
                value={roleFilter}
                options={ROLE_FILTER_OPTIONS}
                onChange={(value) => setRoleFilter(value)}
              />
            </div>

            {filteredWaiters.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead>Kullanıcı adı</TableHead>
                      <TableHead>Şube</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="w-[90px]">Durum</TableHead>
                      <TableHead className="w-[110px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWaiters.map((member) => {
                      const href = DASHBOARD_ROUTES.menuUserDetail(member.id, member.branchId);
                      return (
                        <TableRow
                          key={member.id}
                          className="cursor-pointer"
                          onClick={() => router.push(href)}
                        >
                          <TableCell className="font-medium">{member.displayName}</TableCell>
                          <TableCell className="text-muted-foreground">@{member.username}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {branchLabel(branches, member.branchId)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {STAFF_ROLE_LABEL[parseStaffRole(member.staffRole)]}
                          </TableCell>
                          <TableCell>
                            <StatusTag active={member.active} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAssignTarget(member);
                                }}
                              >
                                {member.branchId == null ? "Ata" : "Değiştir"}
                              </Button>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni personel</DialogTitle>
            <DialogDescription>
              Hesap önce personele eklenir. Şube atamasını daha sonra listeden yapabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (createMutation.isPending) return;
              createMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <ChoiceBadges
                label="Rol"
                showCaption={false}
                value={staffRole}
                options={CREATE_ROLE_OPTIONS}
                onChange={(value) => setStaffRole(value)}
              />
              <p className="text-xs text-muted-foreground">
                Mutfak ve kurye hesapları, bu özelliği açık olan şubelere atanabilir.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiter-display">Görünen ad</Label>
              <Input
                id="waiter-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiter-username">Kullanıcı adı</Label>
              <Input
                id="waiter-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiter-password">Şifre</Label>
              <Input
                id="waiter-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || !username.trim() || !password || !displayName.trim()
                }
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignTarget != null} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Şube ata</DialogTitle>
            <DialogDescription>
              {assignTarget
                ? `${assignTarget.displayName} hesabını bir şubeye bağlayın veya şubesiz bırakın.`
                : "Personeli bir şubeye bağlayın."}
            </DialogDescription>
          </DialogHeader>
          {assignTarget ? (
            <StaffBranchAssignForm
              staffRole={parseStaffRole(assignTarget.staffRole)}
              branchId={assignTarget.branchId ?? null}
              branches={branches}
              pending={assignMutation.isPending}
              onAssign={(branchId) =>
                assignMutation.mutate({ staffId: assignTarget.id, branchId })
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
