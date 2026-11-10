"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CircleDot, Loader2, Plus, UserRoundCog, UsersRound } from "lucide-react";

import { StaffBranchAssignForm } from "@/components/dashboard/staff/StaffRosterControls";
import { StaffListHead, StaffRow } from "@/components/dashboard/staff/StaffRow";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { FilterChips } from "@/components/dashboard/FilterChips";
import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { ListPagination } from "@/components/dashboard/ListPagination";
import { ListCard, ListMessage, ListSkeleton } from "@/components/dashboard/ListLayout";
import { ListToolbar } from "@/components/dashboard/ListToolbar";
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
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { STAFF_ROLE_TONE } from "@/lib/badge-tones";
import { formatBranchCode, type BranchItem } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  assignMerchantStaffBranch,
  createMerchantStaff,
  listMerchantStaffPage,
  MERCHANT_STAFF_QUERY_KEY,
  parseStaffRole,
  STAFF_ROLE_LABEL,
  WaiterApiError,
  type MenuWaiterMember,
  type StaffRole,
} from "@/lib/personnel-management-api";
import {
  EMPTY_STAFF_FILTERS,
  isStaffListNarrowed,
  NO_BRANCH,
  parseStaffFilters,
  serializeStaffFilters,
  STAFF_PAGE_SIZE,
  STAFF_ROLES,
  staffPageParams,
  type StaffListFilters,
  type StaffStatus,
} from "@/lib/staff-list";
import { type Tone } from "@/components/dashboard/tone";

const STATUS_CHIPS: ReadonlyArray<{ value: StaffStatus; label: string; tone?: Tone }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif", tone: "green" },
  { value: "inactive", label: "Pasif" },
];

const CREATE_ROLE_OPTIONS = STAFF_ROLES.map((role) => ({
  value: role,
  label: STAFF_ROLE_LABEL[role],
  tone: STAFF_ROLE_TONE[role],
}));

function branchLabel(branches: BranchItem[], branchId?: number | null): string | null {
  if (branchId == null) return null;
  const branch = branches.find((item) => item.id === branchId);
  return branch ? branch.name : formatBranchCode(branchId);
}

export default function MenuUsersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();
  const { accessLoading, accessError, retryAccess, canUseWaiterPanel } = useWaiterPanelAccess();
  const branchesQuery = useBranches(canUseWaiterPanel && !accessLoading);
  const branches = useMemo(() => branchesQuery.data?.content ?? [], [branchesQuery.data]);

  // Filters live in the address, so a trip to a staff account and back lands on the same list.
  const filters = useMemo(() => parseStaffFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const listTop = useRef<HTMLDivElement | null>(null);

  // The top bar's "Yeni → Personel" shortcut arrives as ?yeni=1.
  const createRequested = searchParams.get("yeni") === "1";
  const [createClicked, setCreateOpen] = useState(false);
  const createOpen = createClicked || createRequested;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("WAITER");
  const [assignTarget, setAssignTarget] = useState<MenuWaiterMember | null>(null);

  const pageParams = staffPageParams(filters);
  const usersQuery = useQuery({
    queryKey: [...MERCHANT_STAFF_QUERY_KEY, "page", pageParams],
    enabled: canUseWaiterPanel && !accessLoading,
    queryFn: () => listMerchantStaffPage(pageParams),
    placeholderData: keepPreviousData,
  });

  const staffPage = usersQuery.data;
  const members = staffPage?.items ?? [];
  const totalElements = staffPage?.totalElements ?? 0;
  const totalPages = staffPage?.totalPages ?? 0;
  const narrowed = isStaffListNarrowed(filters);

  const update = (patch: Partial<StaffListFilters>) => {
    const current = parseStaffFilters(new URLSearchParams(window.location.search));
    const query = serializeStaffFilters({ ...current, page: 1, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearAll = () => update(EMPTY_STAFF_FILTERS);

  // The last page can disappear after a delete or a filter change; step back to the real last one.
  useEffect(() => {
    if (totalPages > 0 && filters.page > totalPages) {
      const current = parseStaffFilters(new URLSearchParams(window.location.search));
      const query = serializeStaffFilters({ ...current, page: totalPages }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [filters.page, totalPages, pathname, router]);

  const createMutation = useMutation({
    mutationFn: () =>
      createMerchantStaff({
        username: username.trim(),
        password,
        displayName: displayName.trim(),
        staffRole,
      }),
    onSuccess: async () => {
      setUsername("");
      setPassword("");
      setDisplayName("");
      setStaffRole("WAITER");
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      router.replace(pathname);
      notify("info", "Personel eklendi. Şubeye atamak için listeden “Şubeye ata”yı kullanın.");
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

  const resetCreateForm = () => {
    setUsername("");
    setPassword("");
    setDisplayName("");
    setStaffRole("WAITER");
  };

  // ?yeni=1 keeps the dialog open on its own, so closing must drop it from the address too.
  const closeCreate = () => {
    setCreateOpen(false);
    resetCreateForm();
    if (createRequested) router.replace(pathname, { scroll: false });
  };

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (accessLoading || (canUseWaiterPanel && branchesQuery.isLoading && !branchesQuery.data)) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personeller" hint="Garson, mutfak ve kurye hesapları" />
        <DashboardLoadingState label="Personel hazırlanıyor..." />
      </div>
    );
  }

  const branchOptions = [
    ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
    { value: NO_BRANCH, label: "Şubesiz" },
  ];
  const roleOptions = STAFF_ROLES.map((role) => ({ value: role, label: STAFF_ROLE_LABEL[role], tone: STAFF_ROLE_TONE[role] }));

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title="Personeller"
        hint="Garson, mutfak ve kurye hesapları. Önce eklenir, sonra şubeye atanır."
        action={
          <Button
            type="button"
            size="sm"
            className="h-9 w-full shrink-0 gap-1.5 sm:w-auto"
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
      ) : (
        <ListCard label="Personel listesi">
          <ListToolbar
            query={filters.query}
            onQueryChange={(query) => update({ query })}
            searchPlaceholder="Ad veya kullanıcı adı ara"
            searchLabel="Personel ara"
            searching={usersQuery.isFetching && !usersQuery.isPending}
            narrowed={narrowed}
            onClear={clearAll}
            filters={
              <>
                <FilterMenu
                  label="Rol"
                  icon={UserRoundCog}
                  multiple
                  values={filters.roles}
                  options={roleOptions}
                  onValuesChange={(roles) => update({ roles })}
                />
                <FilterMenu
                  label="Şube"
                  icon={Building2}
                  tone="teal"
                  multiple
                  values={filters.branches}
                  options={branchOptions}
                  onValuesChange={(selected) => update({ branches: selected })}
                />
                <FilterMenu
                  label="Durum"
                  icon={CircleDot}
                  value={filters.status}
                  emptyValue="all"
                  options={STATUS_CHIPS}
                  onChange={(status) => update({ status })}
                />
              </>
            }
          />

          <div ref={listTop} className="scroll-mt-20" />
          {usersQuery.isPending ? (
            <ListSkeleton round />
          ) : usersQuery.isError ? (
            <ListMessage
              title={usersQuery.error instanceof Error ? usersQuery.error.message : "Personel alınamadı."}
              action={{ label: "Tekrar dene", onClick: () => void usersQuery.refetch() }}
            />
          ) : members.length === 0 ? (
            narrowed ? (
              <ListMessage
                title="Bu filtrelerle eşleşen personel yok"
                action={{ label: "Filtreleri temizle", onClick: clearAll }}
              />
            ) : (
              <ListMessage
                icon={UsersRound}
                title="Henüz personel yok"
                description="Garson, mutfak veya kurye hesabı ekleyin; sonra bir şubeye atayın."
                action={{ label: "Yeni personel", onClick: () => setCreateOpen(true), variant: "default" }}
              />
            )
          ) : (
            <>
              <StaffListHead />
              <ul className="divide-y divide-border">
                {members.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    href={DASHBOARD_ROUTES.menuUserDetail(member.id, member.branchId)}
                    branchName={branchLabel(branches, member.branchId)}
                    onAssign={() => setAssignTarget(member)}
                  />
                ))}
              </ul>
              <ListPagination
                page={Math.min(filters.page, Math.max(totalPages, 1))}
                pageSize={STAFF_PAGE_SIZE}
                total={totalElements}
                unit="personel"
                onPage={(next) => {
                  update({ page: next });
                  listTop.current?.scrollIntoView({ block: "start" });
                }}
              />
            </>
          )}
        </ListCard>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) setCreateOpen(true);
          else closeCreate();
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
              <FilterChips<StaffRole>
                label="Rol"
                showLabel={false}
                value={staffRole}
                options={CREATE_ROLE_OPTIONS}
                onChange={setStaffRole}
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
                onClick={closeCreate}
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
