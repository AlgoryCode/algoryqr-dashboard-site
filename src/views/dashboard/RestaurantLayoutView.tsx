"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { LayoutFloorCanvas } from "@/components/dashboard/restaurant-layout/LayoutFloorCanvas";
import {
  LayoutTableList,
  type LayoutTableRowAction,
} from "@/components/dashboard/restaurant-layout/LayoutTableList";
import { LayoutCapacitySelect } from "@/components/dashboard/restaurant-layout/LayoutCapacitySelect";
import {
  LayoutBranchAssign,
  RestaurantLayoutLibrary,
} from "@/components/dashboard/restaurant-layout/RestaurantLayoutLibrary";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { downloadQrImage, getQrDataUrl } from "@/components/dashboard/qr/qr-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useDashboardPageLabel } from "@/contexts/dashboard-page-label";
import { useBranch, useBranches } from "@/hooks/use-branches";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";
import { resolveSafeReturnUrl } from "@/lib/trial-flow";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import {
  assignCatalogLayout,
  createCatalogArea,
  createCatalogLayout,
  createCatalogTable,
  deleteCatalogArea,
  deleteCatalogLayout,
  deleteCatalogTable,
  listCatalogAreas,
  listCatalogLayouts,
  listCatalogTables,
  OrderingApiError,
  regenerateCatalogTableQr,
  updateCatalogArea,
  updateCatalogLayout,
  updateCatalogTable,
  type CatalogLayout,
  type RestaurantArea,
  type RestaurantTable,
} from "@/lib/ordering-api";
import {
  DEFAULT_LAYOUT_SHAPE,
  DEFAULT_TABLE_CAPACITY,
  isDuplicateAreaName,
  isDuplicateTableName,
  loadStoredFloorLayout,
  mergeTableFloorLayout,
  nextFreeLayoutPosition,
  parseLayoutShape,
  parseTableNumberRange,
  rotateLayout,
  tableNameForNumber,
  allocateTableNumber,
  clampTableCenter,
  isPlacedOnFloor,
  MAX_TABLES_PER_RANGE,
  nextTableNumber,
  resolveTableCapacity,
  tablesInArea,
  unusedSuggestedAreas,
  upsertStoredFloorPlacement,
  type FloorPlacement,
  type LayoutShape,
} from "@/lib/restaurant-layout";
import { TONE_ACTION } from "@/components/dashboard/tone";

function printQr(imgSrc?: string | null, title?: string) {
  const dataUrl = getQrDataUrl(imgSrc ?? undefined);
  if (!dataUrl) return false;
  const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><title>${title || "Masa QR"}</title>
<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif}
img{max-width:90vw;max-height:70vh}p{text-align:center;margin-top:12px}</style></head>
<body><div><img src="${dataUrl}" alt="QR" /><p>${title || ""}</p></div>
<script>window.onload=()=>{window.print();}</script></body></html>`);
  win.document.close();
  return true;
}

type TableFilter = "active" | "passive";
type TableDraft = { name: string; tableNumber: string; shape: LayoutShape; capacity: string };

const LAYOUTS_KEY = ["catalog-layouts"] as const;

const EMPTY_DRAFT: TableDraft = {
  name: "",
  tableNumber: "",
  shape: DEFAULT_LAYOUT_SHAPE,
  capacity: String(DEFAULT_TABLE_CAPACITY),
};

type RestaurantLayoutViewProps = {
  branchId?: number | null;
};

export default function RestaurantLayoutView({ branchId = null }: RestaurantLayoutViewProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const layoutParam = Number(searchParams.get("layout"));
  const layoutId = Number.isFinite(layoutParam) && layoutParam > 0 ? layoutParam : null;
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();

  const { accessLoading: waiterAccessLoading, accessError, retryAccess, canUseWaiterPanel } = useWaiterPanelAccess();
  const accessLoading = waiterAccessLoading;
  const branchQuery = useBranch(branchId, branchId != null && canUseWaiterPanel && !accessLoading);
  const branchesQuery = useBranches(canUseWaiterPanel && !accessLoading);
  useDashboardPageLabel(branchQuery.data?.name);

  const areasQueryKey = ["catalog-layout-areas", layoutId] as const;
  const tablesQueryKey = ["catalog-layout-tables", layoutId] as const;

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [areaName, setAreaName] = useState("");
  const [tableRangeFrom, setTableRangeFrom] = useState("1");
  const [tableCount, setTableCount] = useState("8");
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [customArea, setCustomArea] = useState(false);
  const [detailAreaKeys, setDetailAreaKeys] = useState<string[]>([]);
  const [tableDrafts, setTableDrafts] = useState<Record<string, TableDraft>>({});
  const [openAreaKeys, setOpenAreaKeys] = useState<string[]>([]);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<RestaurantTable[]>([]);
  const [deleteAreaConfirmOpen, setDeleteAreaConfirmOpen] = useState(false);
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<RestaurantArea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [editCapacity, setEditCapacity] = useState(String(DEFAULT_TABLE_CAPACITY));
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [tableFilter, setTableFilter] = useState<TableFilter>("active");
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [storedLayout, setStoredLayout] = useState<Record<number, FloorPlacement>>({});

  const layoutsQuery = useQuery({
    queryKey: LAYOUTS_KEY,
    enabled: canUseWaiterPanel && !accessLoading,
    queryFn: () => listCatalogLayouts(),
  });

  const areasQuery = useQuery({
    queryKey: areasQueryKey,
    enabled: layoutId != null && canUseWaiterPanel && !accessLoading,
    queryFn: () => listCatalogAreas(layoutId as number),
  });

  const tablesQuery = useQuery({
    queryKey: tablesQueryKey,
    enabled: layoutId != null && canUseWaiterPanel && !accessLoading,
    queryFn: () => listCatalogTables(layoutId as number),
  });

  const areas = areasQuery.data ?? [];
  const tables = tablesQuery.data ?? [];
  const tablesWithLayout = useMemo(
    () => tables.map((table) => mergeTableFloorLayout(table, storedLayout[table.id])),
    [storedLayout, tables],
  );
  const assignedTables = useMemo(
    () => tablesWithLayout.filter((table) => table.areaId != null),
    [tablesWithLayout],
  );
  const activeTables = useMemo(() => assignedTables.filter((t) => t.active), [assignedTables]);
  const passiveTables = useMemo(() => assignedTables.filter((t) => !t.active), [assignedTables]);
  const visibleTables = tableFilter === "active" ? activeTables : passiveTables;
  const suggestedAreas = useMemo(() => unusedSuggestedAreas(areas), [areas]);

  const tableRange = useMemo(
    () => {
      const from = Number(tableRangeFrom);
      const count = Number(tableCount);
      const to =
        Number.isInteger(from) && Number.isInteger(count) && count >= 1 ? String(from + count - 1) : "";
      return parseTableNumberRange(tableRangeFrom, to);
    },
    [tableRangeFrom, tableCount],
  );

  const selectedId = selectedIds.length === 1 ? selectedIds[0]! : null;
  const selected = useMemo(
    () => (selectedId == null ? null : (tablesWithLayout.find((t) => t.id === selectedId) ?? null)),
    [selectedId, tablesWithLayout],
  );

  const setSelectedId = (id: number | null) => {
    setSelectedIds(id == null ? [] : [id]);
  };

  useEffect(() => {
    if (layoutId == null) return;
    setStoredLayout(loadStoredFloorLayout(layoutId));
    setSelectedIds([]);
    setAreaFormOpen(false);
    setAreaName("");
    setCustomArea(false);
    setTableCount("8");
    setTableRangeFrom("1");
    setIsEditing(false);
  }, [layoutId]);

  useEffect(() => {
    const nextKeys = areas.map((area) => String(area.id));
    setOpenAreaKeys((prev) => {
      const extra = nextKeys.filter((key) => !prev.includes(key));
      if (extra.length === 0) return prev;
      return [...prev, ...extra];
    });
  }, [areasQuery.data]);

  const invalidateLayout = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalog-layout-tables"] }),
      queryClient.invalidateQueries({ queryKey: ["catalog-layout-areas"] }),
      queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY }),
    ]);
  };

  const openLayout = (id: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("layout", String(id));
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeLayout = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("layout");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const assignMutation = useMutation({
    mutationFn: (payload: { layoutId: number; branchId: number | null }) =>
      assignCatalogLayout(payload.layoutId, payload.branchId),
    onSuccess: async (layout) => {
      await invalidateLayout();
      if (layout.branchName) {
        notify(
          "info",
          layout.menuLinked
            ? `Düzen ${layout.branchName} şubesine bağlandı. Masa QR kodları o şubenin menüsüne bağlandı.`
            : `Düzen ${layout.branchName} şubesine bağlandı. Bu şubede menü olmadığı için QR kodu oluşmadı.`,
        );
        return;
      }
      notify("info", "Düzenin şube bağlantısı kaldırıldı.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Düzen bağlanamadı.");
    },
  });

  const createLayoutMutation = useMutation({
    mutationFn: (name: string) => createCatalogLayout(name),
    onSuccess: async (layout) => {
      await queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
      openLayout(layout.id);
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Düzen oluşturulamadı.");
    },
  });

  const renameLayoutMutation = useMutation({
    mutationFn: (payload: { layoutId: number; name: string }) =>
      updateCatalogLayout(payload.layoutId, { name: payload.name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
      notify("info", "Düzen adı güncellendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Düzen güncellenemedi.");
    },
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: (id: number) => deleteCatalogLayout(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
      notify("info", "Düzen silindi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Düzen silinemedi.");
    },
  });

  const rememberPlacement = (tableId: number, placement: FloorPlacement) => {
    if (layoutId == null) return;
    setStoredLayout(upsertStoredFloorPlacement(layoutId, tableId, placement));
  };

  const createAreaMutation = useMutation({
    mutationFn: async (payload: { name: string; tableNumbers: number[] }) => {
      const area = await createCatalogArea(layoutId as number, payload.name);
      const created: { table: RestaurantTable; placement: FloorPlacement }[] = [];
      const occupied: {
        layoutX?: number | null;
        layoutY?: number | null;
        layoutShape?: string | null;
        capacity?: number | null;
      }[] = [];
      let tableError: string | null = null;

      for (const n of payload.tableNumbers) {
        try {
          const position = nextFreeLayoutPosition(
            occupied,
            DEFAULT_LAYOUT_SHAPE,
            DEFAULT_TABLE_CAPACITY,
          );
          const table = await createCatalogTable(layoutId as number, {
            name: tableNameForNumber(n),
            tableNumber: n,
            areaId: area.id,
            capacity: DEFAULT_TABLE_CAPACITY,
            layoutX: position.x,
            layoutY: position.y,
            layoutRotation: 0,
            layoutShape: DEFAULT_LAYOUT_SHAPE,
          });
          occupied.push({
            layoutX: position.x,
            layoutY: position.y,
            layoutShape: DEFAULT_LAYOUT_SHAPE,
            capacity: DEFAULT_TABLE_CAPACITY,
          });
          created.push({
            table,
            placement: {
              x: position.x,
              y: position.y,
              rotation: 0,
              shape: DEFAULT_LAYOUT_SHAPE,
            },
          });
        } catch (err) {
          tableError = err instanceof OrderingApiError ? err.message : "Masa eklenemedi.";
          break;
        }
      }

      return { area, created, tableError, expected: payload.tableNumbers.length };
    },
    onSuccess: async ({ area, created, tableError, expected }) => {
      for (const item of created) {
        rememberPlacement(item.table.id, item.placement);
      }
      await invalidateLayout();
      setAreaName("");
      setCustomArea(false);
      setTableCount("8");
      setTableRangeFrom("1");
      setAreaFormOpen(false);
      setOpenAreaKeys((prev) =>
        prev.includes(String(area.id)) ? prev : [...prev, String(area.id)],
      );
      setTableFilter("active");
      if (created.length > 0) {
        setSelectedId(created[created.length - 1]!.table.id);
      }
      if (tableError) {
        notify(
          "danger",
          `${area.name} eklendi ama ${created.length}/${expected} masa oluşturulabildi. ${tableError}`,
        );
        return;
      }
      const firstName = created[0]?.table.name ?? tableNameForNumber(1);
      const lastName = created[created.length - 1]?.table.name ?? firstName;
      notify(
        "info",
        created.length === 1
          ? `${area.name} eklendi. ${firstName} oluşturuldu.`
          : `${area.name} eklendi. ${created.length} masa oluşturuldu (${firstName} … ${lastName}).`,
      );
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Alan eklenemedi.");
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: (payload: { areaId: number; name: string }) =>
      updateCatalogArea(layoutId as number, payload.areaId, { name: payload.name }),
    onSuccess: async () => {
      await invalidateLayout();
      setEditingAreaId(null);
      setEditAreaName("");
      notify("info", "Alan adı güncellendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Alan güncellenemedi.");
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (areaId: number) => deleteCatalogArea(layoutId as number, areaId),
    onSuccess: async () => {
      await invalidateLayout();
      setDeleteAreaTarget(null);
      setDeleteAreaConfirmOpen(false);
      notify("info", "Alan silindi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Alan silinemedi.");
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      areaId: number;
      name: string;
      tableNumber?: number;
      capacity?: number;
      layoutX: number;
      layoutY: number;
      layoutShape: LayoutShape;
    }) =>
      createCatalogTable(layoutId as number, {
        name: payload.name,
        tableNumber: payload.tableNumber,
        areaId: payload.areaId,
        capacity: payload.capacity,
        layoutX: payload.layoutX,
        layoutY: payload.layoutY,
        layoutRotation: 0,
        layoutShape: payload.layoutShape,
      }),
    onSuccess: async (table, payload) => {
      rememberPlacement(table.id, {
        x: payload.layoutX,
        y: payload.layoutY,
        rotation: 0,
        shape: payload.layoutShape,
      });
      await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      setTableDrafts((prev) => ({ ...prev, [String(payload.areaId)]: EMPTY_DRAFT }));
      setSelectedId(table.id);
      setTableFilter("active");
      notify("info", "Masa eklendi. Kroki üzerinde sürükleyerek konumlandırabilirsiniz.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Masa eklenemedi.");
    },
  });

  const layoutMutation = useMutation({
    mutationFn: (payload: {
      tableId: number;
      layoutX?: number;
      layoutY?: number;
      layoutRotation?: number;
      layoutShape?: LayoutShape;
      capacity?: number | null;
    }) =>
      updateCatalogTable(layoutId as number, payload.tableId, {
        layoutX: payload.layoutX,
        layoutY: payload.layoutY,
        layoutRotation: payload.layoutRotation,
        layoutShape: payload.layoutShape,
        capacity: payload.capacity,
      }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tablesQueryKey });
      const previous = queryClient.getQueryData<RestaurantTable[]>(tablesQueryKey);
      queryClient.setQueryData<RestaurantTable[]>(tablesQueryKey, (current) =>
        (current ?? []).map((table) =>
          table.id === payload.tableId ? { ...table, ...payload } : table,
        ),
      );
      return { previous };
    },
    onError: (err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tablesQueryKey, context.previous);
      }
      notify("danger", err instanceof OrderingApiError ? err.message : "Konum kaydedilemedi.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      tableId: number;
      active?: boolean;
      name?: string;
      tableNumber?: number | null;
      capacity?: number | null;
      layoutX?: number;
      layoutY?: number;
    }) =>
      updateCatalogTable(layoutId as number, payload.tableId, {
        active: payload.active,
        name: payload.name,
        tableNumber: payload.tableNumber,
        capacity: payload.capacity,
        layoutX: payload.layoutX,
        layoutY: payload.layoutY,
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      setIsEditing(false);
      if (typeof variables.active === "boolean") {
        notify("info", variables.active ? "Masa aktifleştirildi." : "Masa pasifleştirildi.");
        return;
      }
      notify("info", "Masa güncellendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Güncelleme başarısız.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tableIds: number[]) => {
      for (const tableId of tableIds) {
        await deleteCatalogTable(layoutId as number, tableId);
      }
    },
    onSuccess: async (_data, tableIds) => {
      await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      setSelectedIds((prev) => prev.filter((id) => !tableIds.includes(id)));
      setDeleteTargets([]);
      setDeleteConfirmOpen(false);
      notify("info", tableIds.length > 1 ? `${tableIds.length} masa silindi.` : "Masa silindi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "Masa silinemedi.");
    },
  });

  const startEditing = (table: RestaurantTable) => {
    setSelectedIds([table.id]);
    setEditName(table.name);
    setEditTableNumber(table.tableNumber != null ? String(table.tableNumber) : "");
    setEditCapacity(String(resolveTableCapacity(table.capacity)));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditName("");
    setEditTableNumber("");
    setEditCapacity(String(DEFAULT_TABLE_CAPACITY));
  };

  const saveEditing = () => {
    if (!selected || !editName.trim()) return;
    if (isDuplicateTableName(tables, editName, selected.areaId ?? null, selected.id)) {
      notify("danger", "Bu alanda aynı masa adı zaten var.");
      return;
    }
    const capacity = Number(editCapacity) || DEFAULT_TABLE_CAPACITY;
    const clamped = isPlacedOnFloor(selected)
      ? clampTableCenter(
          selected.layoutX ?? 50,
          selected.layoutY ?? 50,
          parseLayoutShape(selected.layoutShape),
          capacity,
        )
      : null;
    if (clamped) {
      rememberPlacement(selected.id, {
        x: clamped.x,
        y: clamped.y,
        rotation: selected.layoutRotation ?? 0,
        shape: parseLayoutShape(selected.layoutShape),
      });
    }
    updateMutation.mutate({
      tableId: selected.id,
      name: editName.trim(),
      tableNumber: editTableNumber.trim() ? Number(editTableNumber) : null,
      capacity,
      ...(clamped ? { layoutX: clamped.x, layoutY: clamped.y } : {}),
    });
  };

  const openDeleteConfirm = (target: RestaurantTable | RestaurantTable[]) => {
    setDeleteTargets(Array.isArray(target) ? target : [target]);
    setDeleteConfirmOpen(true);
  };

  const regenerateMutation = useMutation({
    mutationFn: (tableId: number) => regenerateCatalogTableQr(layoutId as number, tableId),
    onSuccess: async (table: RestaurantTable) => {
      await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      setSelectedId(table.id);
      notify("info", "QR yenilendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof OrderingApiError ? err.message : "QR yenilenemedi.");
    },
  });

  const toggleActive = (table: RestaurantTable) => {
    setSelectedIds([table.id]);
    updateMutation.mutate({
      tableId: table.id,
      active: !table.active,
    });
  };

  const toggleActiveMany = (target: RestaurantTable | RestaurantTable[]) => {
    const list = Array.isArray(target) ? target : [target];
    if (list.length === 0) return;
    if (list.length === 1) {
      toggleActive(list[0]!);
      return;
    }
    const makeActive = !list.every((table) => table.active);
    void (async () => {
      try {
        await Promise.all(
          list
            .filter((table) => table.active !== makeActive)
            .map((table) => updateCatalogTable(layoutId as number, table.id, { active: makeActive })),
        );
        await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
        notify("info", makeActive ? "Masalar aktifleştirildi." : "Masalar pasifleştirildi.");
      } catch (err) {
        notify("danger", err instanceof OrderingApiError ? err.message : "Güncelleme başarısız.");
      }
    })();
  };

  const getRowActions = (table: RestaurantTable): LayoutTableRowAction[] => [
    {
      key: "download",
      label: `${table.name} indir`,
      icon: <Download className="h-4 w-4" />,
      disabled: !table.qrImageBase64,
      onClick: () => {
        setSelectedId(table.id);
        downloadQrImage(table.qrImageBase64!, `masa-${table.name}`);
      },
    },
    {
      key: "print",
      label: `${table.name} yazdır`,
      icon: <Printer className="h-4 w-4" />,
      disabled: !table.qrImageBase64,
      onClick: () => {
        setSelectedId(table.id);
        printQr(table.qrImageBase64, table.name);
      },
    },
    {
      key: "regenerate",
      label: `${table.name} QR yenile`,
      icon:
        regenerateMutation.isPending && selected?.id === table.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        ),
      disabled: regenerateMutation.isPending || table.menuId == null,
      onClick: () => {
        setSelectedId(table.id);
        setRegenerateConfirmOpen(true);
      },
    },
    {
      key: "edit",
      label: `${table.name} düzenle`,
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => startEditing(table),
    },
    {
      key: "delete",
      label: `${table.name} sil`,
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      onClick: () => openDeleteConfirm(table),
    },
  ];

  const draftFor = (areaId: number): TableDraft => tableDrafts[String(areaId)] ?? EMPTY_DRAFT;

  const setDraft = (areaId: number, patch: Partial<TableDraft>) => {
    setTableDrafts((prev) => ({
      ...prev,
      [String(areaId)]: { ...EMPTY_DRAFT, ...prev[String(areaId)], ...patch },
    }));
  };

  const submitArea = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isDuplicateAreaName(areas, trimmed)) {
      notify("danger", "Bu alan adı zaten var.");
      return;
    }
    if (!tableRange.ok) {
      notify("danger", tableRange.error);
      return;
    }
    createAreaMutation.mutate({ name: trimmed, tableNumbers: tableRange.numbers });
  };

  const persistTableLayout = (
    table: RestaurantTable,
    patch: Partial<FloorPlacement> & { capacity?: number | null },
  ) => {
    const shape = patch.shape ?? parseLayoutShape(table.layoutShape);
    const capacity = patch.capacity ?? table.capacity;
    const clamped = clampTableCenter(
      patch.x ?? table.layoutX ?? 50,
      patch.y ?? table.layoutY ?? 50,
      shape,
      capacity,
    );
    const placement: FloorPlacement = {
      x: clamped.x,
      y: clamped.y,
      rotation: patch.rotation ?? table.layoutRotation ?? 0,
      shape,
    };
    rememberPlacement(table.id, placement);
    layoutMutation.mutate({
      tableId: table.id,
      layoutX: placement.x,
      layoutY: placement.y,
      layoutRotation: placement.rotation,
      layoutShape: placement.shape,
      capacity,
    });
  };

  const changeTableCapacity = (table: RestaurantTable, capacity: number) => {
    if (capacity === resolveTableCapacity(table.capacity)) return;
    persistTableLayout(table, { capacity });
    if (isEditing && selectedIds.length === 1 && selectedIds[0] === table.id) {
      setEditCapacity(String(capacity));
    }
  };

  const persistTableLayouts = (moves: { table: RestaurantTable; x: number; y: number }[]) => {
    if (moves.length === 0) return;
    if (moves.length === 1) {
      persistTableLayout(moves[0]!.table, { x: moves[0]!.x, y: moves[0]!.y });
      return;
    }
    const previous = queryClient.getQueryData<RestaurantTable[]>(tablesQueryKey);
    for (const move of moves) {
      rememberPlacement(move.table.id, {
        x: move.x,
        y: move.y,
        rotation: move.table.layoutRotation ?? 0,
        shape: parseLayoutShape(move.table.layoutShape),
      });
    }
    queryClient.setQueryData<RestaurantTable[]>(tablesQueryKey, (current) =>
      (current ?? []).map((table) => {
        const move = moves.find((item) => item.table.id === table.id);
        return move ? { ...table, layoutX: move.x, layoutY: move.y } : table;
      }),
    );
    void (async () => {
      try {
        await Promise.all(
          moves.map((move) =>
            updateCatalogTable(layoutId as number, move.table.id, {
              layoutX: move.x,
              layoutY: move.y,
              layoutRotation: move.table.layoutRotation ?? 0,
              layoutShape: parseLayoutShape(move.table.layoutShape),
            }),
          ),
        );
      } catch (err) {
        if (previous) queryClient.setQueryData(tablesQueryKey, previous);
        notify("danger", err instanceof OrderingApiError ? err.message : "Konum kaydedilemedi.");
      } finally {
        await queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      }
    })();
  };

  const submitTable = (areaId: number, position?: { x: number; y: number }) => {
    const draft = draftFor(areaId);
    const areaTables = tablesInArea(tables, areaId);
    const requested = draft.tableNumber.trim() ? Number(draft.tableNumber) : null;
    const tableNumber = allocateTableNumber(
      areaTables,
      requested != null && Number.isInteger(requested) ? requested : null,
    );
    const name = draft.name.trim() || tableNameForNumber(tableNumber);
    if (isDuplicateTableName(tables, name, areaId)) {
      notify("danger", "Bu alanda aynı masa adı zaten var.");
      return;
    }
    const capacity = Number(draft.capacity) || DEFAULT_TABLE_CAPACITY;
    const laidOut = tablesInArea(tablesWithLayout, areaId);
    const nextPos = position ?? nextFreeLayoutPosition(laidOut, draft.shape, capacity);
    createMutation.mutate({
      areaId,
      name,
      tableNumber,
      capacity,
      layoutX: nextPos.x,
      layoutY: nextPos.y,
      layoutShape: draft.shape,
    });
  };

  const tableListProps = {
    selectedIds,
    isEditing,
    editName,
    editTableNumber,
    editCapacity,
    updatePending: updateMutation.isPending,
    onSelect: (table: RestaurantTable) => {
      setSelectedIds([table.id]);
      cancelEditing();
    },
    onToggleActive: toggleActive,
    onEditNameChange: setEditName,
    onEditTableNumberChange: setEditTableNumber,
    onEditCapacityChange: setEditCapacity,
    onSaveEditing: saveEditing,
    onCancelEditing: cancelEditing,
    getRowActions,
  };

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (accessLoading || (branchId != null && branchQuery.isLoading)) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title="Restoran düzenleri"
          hint="Masa planınız hazırlanıyor."
        />
        <DashboardLoadingState label="Restoran düzenleri yükleniyor…" />
      </div>
    );
  }

  const layouts: CatalogLayout[] = layoutsQuery.data ?? [];
  const activeLayout = layoutId == null ? null : (layouts.find((item) => item.id === layoutId) ?? null);
  const branches = (branchesQuery.data?.content ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));
  const backHref =
    branchId != null ? DASHBOARD_ROUTES.branchSettings(branchId) : DASHBOARD_ROUTES.myBranches;
  const listBack = (
    <Link
      href={backHref}
      aria-label={branchId != null ? "Şube ayarlarına dön" : "Menüye dön"}
      className={DASHBOARD_BACK}
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );

  if (layoutId == null) {
    return (
      <div className="space-y-4 animate-fade-in">
        <DashboardPageHeader
          title="Restoran düzenleri"
          hint="Bir düzen oluşturun, sonra istediğiniz şubeye bağlayın."
          back={listBack}
        />
        <RestaurantLayoutLibrary
          layouts={layouts}
          branches={branches}
          loading={layoutsQuery.isLoading}
          creating={createLayoutMutation.isPending}
          assigningId={
            assignMutation.isPending ? (assignMutation.variables?.layoutId ?? null) : null
          }
          deletingId={deleteLayoutMutation.isPending ? (deleteLayoutMutation.variables ?? null) : null}
          renamingId={
            renameLayoutMutation.isPending ? (renameLayoutMutation.variables?.layoutId ?? null) : null
          }
          onCreate={(name) => createLayoutMutation.mutate(name)}
          onOpen={openLayout}
          onAssign={(id, nextBranchId) =>
            assignMutation.mutate({ layoutId: id, branchId: nextBranchId })
          }
          onRename={(id, name) => renameLayoutMutation.mutate({ layoutId: id, name })}
          onDelete={(id) => deleteLayoutMutation.mutate(id)}
        />
      </div>
    );
  }

  const layoutLoading = tablesQuery.isLoading || areasQuery.isLoading;
  const noAreas = areas.length === 0;
  const showAreaForm = !layoutLoading && (noAreas || areaFormOpen);
  const headerHint = noAreas
    ? "Bir alan seçin, kaç masa olduğunu girin ve Masaları oluştur'a basın."
    : "Masaları kroki üzerinde sürükleyip yerleştirin. Yeni masa için Masa ekle'ye basın.";
  const assignHint =
    activeLayout == null
      ? "Bu düzeni bir şubeye bağlayın. Şubede menü varsa masa QR kodları oluşur."
      : activeLayout.branchId == null
        ? "Bu düzen henüz bir şubeye bağlı değil. Şubede menü varsa QR kodları bağlayınca oluşur."
        : activeLayout.menuLinked
          ? `${activeLayout.branchName ?? "Şube"} şubesine bağlı.`
          : `${activeLayout.branchName ?? "Şube"} şubesine bağlı. Bu şubede menü olmadığı için QR kodu yok.`;
  const countValue = Number(tableCount);
  const stepTableCount = (delta: number) => {
    const current = Number.isInteger(countValue) && countValue > 0 ? countValue : 0;
    setTableCount(String(Math.min(MAX_TABLES_PER_RANGE, Math.max(1, current + delta))));
  };

  if (areasQuery.isError && !areasQuery.isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <DashboardPageHeader
          title="Restoran düzeni"
          hint="Bu düzen bulunamadı."
          back={
            <button type="button" onClick={closeLayout} aria-label="Düzen listesine dön" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <Button type="button" onClick={closeLayout}>
          Düzen listesine dön
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <DashboardPageHeader
        title={activeLayout?.name ?? "Restoran düzeni"}
        hint={headerHint}
        back={
          <button type="button" onClick={closeLayout} aria-label="Düzen listesine dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
      />

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-sm">{assignHint}</p>
        {activeLayout ? (
          <LayoutBranchAssign
            layout={activeLayout}
            branches={branches}
            pending={assignMutation.isPending && assignMutation.variables?.layoutId === activeLayout.id}
            onAssign={(id, nextBranchId) =>
              assignMutation.mutate({ layoutId: id, branchId: nextBranchId })
            }
          />
        ) : null}
      </section>

      <div className="space-y-4">
          {showAreaForm ? (
            <section
              className={cn(
                "space-y-4 rounded-lg border bg-card p-4 sm:p-5",
                noAreas ? "border-primary/30" : "border-border",
              )}
            >
              <div>
                <h2 className="text-base font-semibold">
                  {noAreas ? "İlk alanınızı oluşturun" : "Yeni alan ekle"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Masalar krokiye otomatik yerleşir. Sonra sürükleyerek konumlarını değiştirin.
                </p>
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitArea(areaName);
                }}
              >
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Alan adı</span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedAreas.map((name) => {
                      const picked = !customArea && areaName.trim() === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={picked}
                          disabled={createAreaMutation.isPending}
                          onClick={() => {
                            setCustomArea(false);
                            setAreaName(name);
                          }}
                          className={cn(
                            "h-8 rounded-full border px-3 text-sm transition-colors",
                            picked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-foreground hover:bg-muted/60",
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-pressed={customArea || suggestedAreas.length === 0}
                      disabled={createAreaMutation.isPending}
                      onClick={() => {
                        setCustomArea(true);
                        setAreaName("");
                      }}
                      className={cn(
                        "h-8 rounded-full border px-3 text-sm transition-colors",
                        customArea || suggestedAreas.length === 0
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:bg-muted/60",
                      )}
                    >
                      Özel
                    </button>
                  </div>
                  {customArea || suggestedAreas.length === 0 ? (
                    <Input
                      id="layout-area-name"
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      required
                      autoFocus
                      placeholder="Alan adını yazın"
                      aria-label="Alan adı"
                      className="sm:max-w-sm"
                      disabled={createAreaMutation.isPending}
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-muted-foreground">Masa sayısı</span>
                    <div className="inline-flex h-9 items-center rounded-md border border-border bg-background">
                      <button
                        type="button"
                        aria-label="Masa sayısını azalt"
                        className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                        disabled={createAreaMutation.isPending || countValue <= 1}
                        onClick={() => stepTableCount(-1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        value={tableCount}
                        onChange={(e) => setTableCount(e.target.value)}
                        type="number"
                        min={1}
                        max={MAX_TABLES_PER_RANGE}
                        step={1}
                        required
                        aria-label="Masa sayısı"
                        className="h-full w-12 border-x border-border bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        disabled={createAreaMutation.isPending}
                      />
                      <button
                        type="button"
                        aria-label="Masa sayısını artır"
                        className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                        disabled={createAreaMutation.isPending || countValue >= MAX_TABLES_PER_RANGE}
                        onClick={() => stepTableCount(1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="layout-first-no" className="block text-xs font-medium text-muted-foreground">
                      İlk masa no
                    </label>
                    <input
                      id="layout-first-no"
                      value={tableRangeFrom}
                      onChange={(e) => setTableRangeFrom(e.target.value)}
                      type="number"
                      min={1}
                      step={1}
                      required
                      className="h-9 w-20 rounded-md border border-border bg-background px-3 text-sm"
                      disabled={createAreaMutation.isPending}
                    />
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {!noAreas ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={createAreaMutation.isPending}
                        onClick={() => {
                          setAreaName("");
                          setCustomArea(false);
                          setAreaFormOpen(false);
                        }}
                      >
                        Vazgeç
                      </Button>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={createAreaMutation.isPending || !areaName.trim() || !tableRange.ok}
                    >
                      {createAreaMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Masalar oluşturuluyor
                        </>
                      ) : (
                        "Masaları oluştur"
                      )}
                    </Button>
                  </div>
                </div>

                {tableRange.ok ? (
                  <p className="text-xs text-muted-foreground">
                    {areaName.trim() || "Alan"} için{" "}
                    {tableRange.numbers.length === 1
                      ? `${tableNameForNumber(tableRange.numbers[0]!)} oluşturulacak.`
                      : `${tableRange.numbers.length} masa oluşturulacak (${tableNameForNumber(tableRange.numbers[0]!)} … ${tableNameForNumber(tableRange.numbers[tableRange.numbers.length - 1]!)}).`}
                  </p>
                ) : (
                  <p className="text-xs text-destructive">{tableRange.error}</p>
                )}
              </form>
            </section>
          ) : null}

          {layoutLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : noAreas && tables.length === 0 ? null : (
            <Tabs
              value={tableFilter}
              onValueChange={(value) => {
                setTableFilter(value as TableFilter);
                cancelEditing();
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="active">Aktif ({activeTables.length})</TabsTrigger>
                  <TabsTrigger value="passive">Pasif ({passiveTables.length})</TabsTrigger>
                </TabsList>
                {!showAreaForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAreaName("");
                      setCustomArea(false);
                      setAreaFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Yeni alan
                  </Button>
                ) : null}
              </div>

              <TabsContent value={tableFilter} className="mt-3 space-y-3">

                {areas.map((area) => {
                  const areaTables = tablesInArea(visibleTables, area.id);
                  const areaKey = String(area.id);
                  const open = openAreaKeys.includes(areaKey);
                  const draft = draftFor(area.id);
                  const nextNo = nextTableNumber(tablesInArea(tables, area.id));
                  const editingArea = editingAreaId === area.id;
                  const showDetails = detailAreaKeys.includes(areaKey);
                  return (
                    <Collapsible
                      key={area.id}
                      open={open}
                      onOpenChange={(next) => {
                        setOpenAreaKeys((prev) =>
                          next
                            ? [...prev.filter((key) => key !== areaKey), areaKey]
                            : prev.filter((key) => key !== areaKey),
                        );
                      }}
                    >
                      <div className="overflow-visible rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-1 border-b border-border/70 px-2 py-1.5 sm:px-3">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex shrink-0 items-center rounded-md px-1 py-1.5 hover:bg-muted/50"
                              aria-label={`${area.name} alanını aç veya kapat`}
                            >
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform ${
                                  open ? "" : "-rotate-90"
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                          {editingArea ? (
                            <input
                              value={editAreaName}
                              onChange={(e) => setEditAreaName(e.target.value)}
                              aria-label="Alan adı"
                              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
                            />
                          ) : (
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-muted/50"
                              onClick={() =>
                                setOpenAreaKeys((prev) =>
                                  open
                                    ? prev.filter((key) => key !== areaKey)
                                    : [...prev.filter((key) => key !== areaKey), areaKey],
                                )
                              }
                            >
                              <span className="truncate font-medium">{area.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {areaTables.length} masa
                              </span>
                            </button>
                          )}
                          {editingArea ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                className="h-7"
                                disabled={updateAreaMutation.isPending || !editAreaName.trim()}
                                onClick={() => {
                                  const name = editAreaName.trim();
                                  if (!name) return;
                                  if (isDuplicateAreaName(areas, name, area.id)) {
                                    notify("danger", "Bu alan adı zaten var.");
                                    return;
                                  }
                                  updateAreaMutation.mutate({
                                    areaId: area.id,
                                    name,
                                  });
                                }}
                              >
                                {updateAreaMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Kaydet"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7"
                                onClick={() => {
                                  setEditingAreaId(null);
                                  setEditAreaName("");
                                }}
                              >
                                Vazgeç
                              </Button>
                            </div>
                          ) : (
                            <div className="flex shrink-0 items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${TONE_ACTION.edit}`}
                                aria-label={`${area.name} düzenle`}
                                onClick={() => {
                                  setEditingAreaId(area.id);
                                  setEditAreaName(area.name);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${TONE_ACTION.delete}`}
                                aria-label={`${area.name} sil`}
                                onClick={() => {
                                  setDeleteAreaTarget(area);
                                  setDeleteAreaConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <CollapsibleContent>
                          <div className="space-y-3 p-3">
                            {tableFilter === "active" ? (
                              <>
                                <form
                                  className="flex flex-wrap items-center gap-2"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    submitTable(area.id);
                                  }}
                                >
                                  <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8"
                                    disabled={createMutation.isPending}
                                  >
                                    {createMutation.isPending ? (
                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="mr-1 h-4 w-4" />
                                    )}
                                    {showDetails ? "Masa ekle" : `${tableNameForNumber(nextNo)} ekle`}
                                  </Button>
                                  <button
                                    type="button"
                                    aria-expanded={showDetails}
                                    className="text-sm font-medium text-primary hover:underline"
                                    onClick={() =>
                                      setDetailAreaKeys((prev) =>
                                        prev.includes(areaKey)
                                          ? prev.filter((key) => key !== areaKey)
                                          : [...prev, areaKey],
                                      )
                                    }
                                  >
                                    {showDetails ? "Ayrıntıları gizle" : "Ad, şekil ve kişi sayısı seç"}
                                  </button>
                                  <span className="basis-full text-xs text-muted-foreground sm:ml-auto sm:basis-auto">
                                    Kroki üzerinde boş bir yere tıklayarak da masa ekleyebilirsiniz.
                                  </span>
                                  {showDetails ? (
                                  <div className="flex basis-full flex-wrap items-center gap-2">
                                  <input
                                    value={draft.name}
                                    onChange={(e) => setDraft(area.id, { name: e.target.value })}
                                    placeholder={tableNameForNumber(nextNo)}
                                    aria-label={`${area.name} masa adı`}
                                    className="min-w-[120px] flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                                  />
                                  <input
                                    value={draft.tableNumber}
                                    onChange={(e) => setDraft(area.id, { tableNumber: e.target.value })}
                                    type="number"
                                    placeholder={String(nextNo)}
                                    aria-label={`${area.name} masa numarası`}
                                    className="w-16 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                                  />
                                  <select
                                    value={draft.shape}
                                    onChange={(e) =>
                                      setDraft(area.id, { shape: parseLayoutShape(e.target.value) })
                                    }
                                    aria-label={`${area.name} masa şekli`}
                                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                  >
                                    <option value="RECTANGLE">Dikdörtgen</option>
                                    <option value="SQUARE">Kare</option>
                                    <option value="ROUND">Yuvarlak</option>
                                  </select>
                                  <LayoutCapacitySelect
                                    value={Number(draft.capacity) || DEFAULT_TABLE_CAPACITY}
                                    aria-label={`${area.name} kişi sayısı`}
                                    onChange={(capacity) =>
                                      setDraft(area.id, { capacity: String(capacity) })
                                    }
                                  />
                                  </div>
                                  ) : null}
                                </form>
                                <LayoutFloorCanvas
                                  tables={areaTables}
                                  selectedIds={selectedIds}
                                  snap={snapToGrid}
                                  canPlace={!createMutation.isPending}
                                  onSnapChange={setSnapToGrid}
                                  onSelect={(table) => {
                                    setSelectedIds([table.id]);
                                    if (selectedId !== table.id) cancelEditing();
                                  }}
                                  onSelectMany={(next) => {
                                    setSelectedIds(next.map((table) => table.id));
                                    cancelEditing();
                                  }}
                                  onClearSelection={() => {
                                    setSelectedIds([]);
                                    cancelEditing();
                                  }}
                                  isEditing={isEditing}
                                  editName={editName}
                                  editTableNumber={editTableNumber}
                                  updatePending={updateMutation.isPending}
                                  onEdit={startEditing}
                                  onDelete={openDeleteConfirm}
                                  onToggleActive={toggleActiveMany}
                                  onCapacityChange={changeTableCapacity}
                                  onEditNameChange={setEditName}
                                  onEditTableNumberChange={setEditTableNumber}
                                  onSaveEditing={saveEditing}
                                  onCancelEditing={cancelEditing}
                                  onMove={(moves) => persistTableLayouts(moves)}
                                  onRotate={(table) =>
                                    persistTableLayout(table, {
                                      rotation: rotateLayout(table.layoutRotation),
                                    })
                                  }
                                  onPlaceAt={(x, y) => submitTable(area.id, { x, y })}
                                  onPlaceUnplaced={(table) => {
                                    const next = nextFreeLayoutPosition(
                                      areaTables.filter((item) => item.id !== table.id),
                                      parseLayoutShape(table.layoutShape),
                                      table.capacity ?? DEFAULT_TABLE_CAPACITY,
                                    );
                                    persistTableLayout(table, next);
                                  }}
                                />
                              </>
                            ) : null}
                            <LayoutTableList
                              tables={areaTables}
                              emptyLabel={
                                tableFilter === "active"
                                  ? "Bu alanda henüz masa yok."
                                  : "Bu alanda pasif masa yok."
                              }
                              {...tableListProps}
                            />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </TabsContent>
            </Tabs>
          )}
        </div>

      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>QR kodunu yenile?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu masanın QR kodu değişecek. Eski QR artık geçersiz olacak; basılı/yerleştirilmiş
              kodlar çalışmayı durdurur. Yeni QR&apos;ı yeniden indirip yazdırmanız gerekir.
              {selected ? (
                <span className="mt-2 block font-medium text-foreground">
                  Masa: {selected.name}
                  {selected.tableNumber != null ? ` (#${selected.tableNumber})` : ""}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerateMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={regenerateMutation.isPending || !selected}
              onClick={(e) => {
                e.preventDefault();
                if (!selected) return;
                regenerateMutation.mutate(selected.id, {
                  onSettled: () => setRegenerateConfirmOpen(false),
                });
              }}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Evet, yenile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteTargets([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTargets.length > 1 ? "Masalar silinsin mi?" : "Masa silinsin mi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Masa listeden kaldırılır, Pasif sekmeye düşmez. Kayıt silinmez (soft delete); QR kodu
              artık kullanılamaz.
              {deleteTargets.length > 0 ? (
                <span className="mt-2 block font-medium text-foreground">
                  {deleteTargets.length === 1
                    ? `Masa: ${deleteTargets[0]!.name}${
                        deleteTargets[0]!.tableNumber != null
                          ? ` (#${deleteTargets[0]!.tableNumber})`
                          : ""
                      }`
                    : `${deleteTargets.length} masa: ${deleteTargets
                        .map((table) => table.name)
                        .join(", ")}`}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending || deleteTargets.length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTargets.length === 0) return;
                deleteMutation.mutate(deleteTargets.map((table) => table.id));
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Evet, sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteAreaConfirmOpen}
        onOpenChange={(open) => {
          setDeleteAreaConfirmOpen(open);
          if (!open) setDeleteAreaTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alan silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Alan kaldırılacak. İçindeki masalar silinmez.
              {deleteAreaTarget ? (
                <span className="mt-2 block font-medium text-foreground">
                  Alan: {deleteAreaTarget.name}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAreaMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAreaMutation.isPending || !deleteAreaTarget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (!deleteAreaTarget) return;
                deleteAreaMutation.mutate(deleteAreaTarget.id);
              }}
            >
              {deleteAreaMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Evet, sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
