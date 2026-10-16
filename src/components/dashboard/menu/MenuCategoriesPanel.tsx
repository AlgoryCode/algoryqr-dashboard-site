"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, CirclePlus, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { CategoryCoverField } from "@/components/dashboard/menu/CategoryCoverField";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCatalogCategoryRequest,
  createCatalogSubCategoryRequest,
  createMenuCategoryRequest,
  createMenuSubCategoryRequest,
  deleteCatalogCategoryRequest,
  deleteCatalogSubCategoryRequest,
  deleteMenuCategoryRequest,
  deleteMenuSubCategoryRequest,
  updateCatalogCategoryRequest,
  updateCatalogSubCategoryRequest,
  updateMenuCategoryRequest,
  updateMenuSubCategoryRequest,
  type MainCategoryApiItem,
  type SubCategoryApiItem,
} from "@/lib/api";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { invalidateMenuCategories, useCatalogCategories, useMenuCategories } from "@/hooks/use-menu-categories";
import { publicMenuKeys } from "@/hooks/public-menu/keys";
import { useMenuByQr } from "@/hooks/use-menu-by-qr";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

type MenuCategoriesPanelProps = {
  menuId: number;
  qrId: number;
  catalog?: boolean;
  onAddProduct?: (subCategoryId: number) => void;
};

type NameDialogState =
  | { kind: "create-main" }
  | { kind: "rename-main"; main: MainCategoryApiItem }
  | { kind: "create-sub"; main: MainCategoryApiItem }
  | { kind: "rename-sub"; sub: SubCategoryApiItem }
  | null;

type DeleteTarget =
  | { kind: "main"; id: number; name: string }
  | { kind: "sub"; id: number; name: string }
  | null;

function matchesSearch(main: MainCategoryApiItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLocaleLowerCase("tr");
  if (main.name.toLocaleLowerCase("tr").includes(q) || main.slug.toLocaleLowerCase("tr").includes(q)) {
    return true;
  }
  return (main.subs ?? []).some(
    (sub) =>
      sub.name.toLocaleLowerCase("tr").includes(q) || sub.slug.toLocaleLowerCase("tr").includes(q),
  );
}

function bySortOrderThenId<T extends { sortOrder: number; id: number }>(a: T, b: T): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id - b.id;
}

function sortCategories(list: MainCategoryApiItem[]): MainCategoryApiItem[] {
  return [...list]
    .map((main) => ({
      ...main,
      subs: [...(main.subs ?? [])].sort(bySortOrderThenId),
    }))
    .sort(bySortOrderThenId);
}

function DragHandle({
  attributes,
  listeners,
  disabled,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing hover:bg-muted/60",
      )}
      disabled={disabled}
      aria-label="Sürükleyerek sırala"
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

const HEAD_CELL =
  "border border-border bg-muted/50 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";
const BODY_CELL =
  "border-0 p-0 align-middle md:table-cell md:border md:border-border md:px-3 md:py-2.5";
const DATA_ROW =
  "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted/30 md:table-row md:border-0 md:p-0";
const DESKTOP_CELL = "hidden md:table-cell";

function RowActions({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1" disabled={busy}>
          İşlemler
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortableSubRow({
  sub,
  parentName,
  busy,
  dragDisabled,
  onRename,
  onDelete,
  onAddProduct,
}: {
  sub: SubCategoryApiItem;
  parentName: string;
  busy: boolean;
  dragDisabled: boolean;
  onRename: () => void;
  onDelete: () => void;
  onAddProduct?: (subCategoryId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `sub-${sub.id}`,
    disabled: dragDisabled || busy,
    data: { type: "sub", subId: sub.id, mainCategoryId: sub.mainCategoryId },
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(DATA_ROW, "bg-muted/20 pl-6 md:bg-transparent md:pl-0", isDragging && "relative z-10 bg-background")}
    >
      <td className={`${BODY_CELL} w-10 md:px-1`}>
        <DragHandle attributes={attributes} listeners={listeners} disabled={dragDisabled || busy} />
      </td>
      <td className={BODY_CELL}>
        <span className="block truncate font-medium">{sub.name}</span>
        <p className="truncate text-xs text-muted-foreground md:hidden">{parentName}</p>
      </td>
      <td className={`${BODY_CELL} ${DESKTOP_CELL} text-muted-foreground`}>{parentName}</td>
      <td className={`${BODY_CELL} ${DESKTOP_CELL} text-muted-foreground`}>{sub.slug}</td>
      <td className={`${BODY_CELL} ${DESKTOP_CELL} text-muted-foreground`}>Alt</td>
      <td className={`${BODY_CELL} col-span-2 text-right md:col-auto`}>
        <RowActions busy={busy}>
          {onAddProduct ? (
            <DropdownMenuItem onSelect={() => onAddProduct(sub.id)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Ürün ekle
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Yeniden adlandır
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Sil
          </DropdownMenuItem>
        </RowActions>
      </td>
    </tr>
  );
}

function SortableCategoryRows({
  main,
  menuId,
  catalog,
  busy,
  dragDisabled,
  onRename,
  onDelete,
  onAddSub,
  onRenameSub,
  onDeleteSub,
  onAddProduct,
  onCoverChange,
}: {
  main: MainCategoryApiItem;
  menuId: number;
  catalog?: boolean;
  busy: boolean;
  dragDisabled: boolean;
  onRename: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onRenameSub: (sub: SubCategoryApiItem) => void;
  onDeleteSub: (sub: SubCategoryApiItem) => void;
  onAddProduct?: (subCategoryId: number) => void;
  onCoverChange: (categoryId: number, imageUrl: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `main-${main.id}`,
    disabled: dragDisabled || busy,
    data: { type: "main", mainId: main.id },
  });
  const subs = main.subs ?? [];
  const subIds = subs.map((sub) => `sub-${sub.id}`);

  return (
    <>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(DATA_ROW, isDragging && "relative z-10 bg-background")}
      >
        <td className={`${BODY_CELL} w-10 md:px-1`}>
          <DragHandle attributes={attributes} listeners={listeners} disabled={dragDisabled || busy} />
        </td>
        <td className={BODY_CELL}>
          <div className="flex min-w-0 items-center gap-2">
            <CategoryCoverField
              menuId={menuId}
              categoryId={main.id}
              value={main.imageUrl}
              disabled={busy || (!catalog && menuId <= 0)}
              catalog={catalog}
              compact
              onChange={(imageUrl) => onCoverChange(main.id, imageUrl)}
            />
            <div className="min-w-0">
              <span className="block truncate font-medium">{main.name}</span>
              <p className="truncate text-xs text-muted-foreground md:hidden">Ana kategori</p>
            </div>
          </div>
        </td>
        <td className={`${BODY_CELL} ${DESKTOP_CELL} text-muted-foreground`}>—</td>
        <td className={`${BODY_CELL} ${DESKTOP_CELL} text-muted-foreground`}>{main.slug}</td>
        <td className={`${BODY_CELL} ${DESKTOP_CELL} text-muted-foreground`}>Ana</td>
        <td className={`${BODY_CELL} col-span-2 text-right md:col-auto`}>
          <div className="flex items-center justify-between gap-3 md:justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
            disabled={busy}
            onClick={onAddSub}
          >
            <CirclePlus className="h-4 w-4" />
            Alt kategori ekle
          </button>
          <RowActions busy={busy}>
            <DropdownMenuItem onSelect={onRename}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Yeniden adlandır
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Sil
            </DropdownMenuItem>
          </RowActions>
          </div>
        </td>
      </tr>
      <SortableContext items={subIds} strategy={verticalListSortingStrategy}>
        {subs.map((sub) => (
          <SortableSubRow
            key={sub.id}
            sub={sub}
            parentName={main.name}
            busy={busy}
            dragDisabled={dragDisabled}
            onRename={() => onRenameSub(sub)}
            onDelete={() => onDeleteSub(sub)}
            onAddProduct={onAddProduct}
          />
        ))}
      </SortableContext>
    </>
  );
}

function dialogTitle(state: NameDialogState): string {
  if (!state) return "";
  switch (state.kind) {
    case "create-main":
      return "Ana kategori ekle";
    case "rename-main":
      return "Kategoriyi yeniden adlandır";
    case "create-sub":
      return "Alt kategori ekle";
    case "rename-sub":
      return "Alt kategoriyi yeniden adlandır";
  }
}

function dialogInitialName(state: NameDialogState): string {
  if (!state) return "";
  if (state.kind === "rename-main") return state.main.name;
  if (state.kind === "rename-sub") return state.sub.name;
  return "";
}

export default function MenuCategoriesPanel({
  menuId,
  qrId,
  catalog = false,
  onAddProduct,
}: MenuCategoriesPanelProps) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const menuByQr = useMenuByQr(qrId, !catalog && menuId <= 0);
  const resolvedMenuId =
    menuId > 0
      ? menuId
      : menuByQr.data?.menuId != null && menuByQr.data.menuId > 0
        ? menuByQr.data.menuId
        : 0;

  const menuCategoriesQuery = useMenuCategories(!catalog && resolvedMenuId > 0 ? resolvedMenuId : null);
  const catalogCategoriesQuery = useCatalogCategories(catalog);
  const categoriesQuery = catalog ? catalogCategoriesQuery : menuCategoriesQuery;
  const [orderedCategories, setOrderedCategories] = useState<MainCategoryApiItem[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (categoriesQuery.data) {
      setOrderedCategories(sortCategories(categoriesQuery.data));
    }
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (categoriesQuery.isError) {
      notify(
        "danger",
        categoriesQuery.error instanceof Error
          ? categoriesQuery.error.message
          : "Kategori listesi alınamadı.",
      );
    }
  }, [categoriesQuery.error, categoriesQuery.isError, notify]);

  const filtered = useMemo(
    () => orderedCategories.filter((main) => matchesSearch(main, debouncedSearch)),
    [orderedCategories, debouncedSearch],
  );
  const dragDisabled = Boolean(debouncedSearch) || reordering;
  const mainIds = filtered.map((main) => `main-${main.id}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = () => invalidateMenuCategories(queryClient, catalog ? null : resolvedMenuId, catalog ? null : qrId);
  const canEdit = catalog || resolvedMenuId > 0;

  const persistMainOrder = async (next: MainCategoryApiItem[]) => {
    if (!canEdit) return;
    setReordering(true);
    const previous = orderedCategories;
    const previousIndexById = new Map(previous.map((main, index) => [main.id, index]));
    setOrderedCategories(next);
    try {
      await Promise.all(
        next.map((main, index) =>
          previousIndexById.get(main.id) === index
            ? Promise.resolve()
            : catalog
              ? updateCatalogCategoryRequest(main.id, { sortOrder: index })
              : updateMenuCategoryRequest(resolvedMenuId, main.id, { sortOrder: index }),
        ),
      );
      await refresh();
    } catch (error) {
      setOrderedCategories(previous);
      notify("danger", error instanceof Error ? error.message : "Sıralama kaydedilemedi.");
    } finally {
      setReordering(false);
    }
  };

  const persistSubOrder = async (mainId: number, nextSubs: SubCategoryApiItem[]) => {
    if (!canEdit) return;
    setReordering(true);
    const previous = orderedCategories;
    const previousSubs = previous.find((main) => main.id === mainId)?.subs ?? [];
    const previousIndexById = new Map(previousSubs.map((sub, index) => [sub.id, index]));
    setOrderedCategories((current) =>
      current.map((main) => (main.id === mainId ? { ...main, subs: nextSubs } : main)),
    );
    try {
      await Promise.all(
        nextSubs.map((sub, index) =>
          previousIndexById.get(sub.id) === index
            ? Promise.resolve()
            : catalog
              ? updateCatalogSubCategoryRequest(sub.id, { sortOrder: index })
              : updateMenuSubCategoryRequest(resolvedMenuId, sub.id, { sortOrder: index }),
        ),
      );
      await refresh();
    } catch (error) {
      setOrderedCategories(previous);
      notify("danger", error instanceof Error ? error.message : "Sıralama kaydedilemedi.");
    } finally {
      setReordering(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (dragDisabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = String(active.id).startsWith("sub-") ? "sub" : "main";
    const overType = String(over.id).startsWith("sub-") ? "sub" : "main";
    if (activeType !== overType) return;

    if (activeType === "main") {
      const oldIndex = filtered.findIndex((main) => `main-${main.id}` === active.id);
      const newIndex = filtered.findIndex((main) => `main-${main.id}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reorderedFiltered = arrayMove(filtered, oldIndex, newIndex);
      const filteredIds = new Set(reorderedFiltered.map((main) => main.id));
      const untouched = orderedCategories.filter((main) => !filteredIds.has(main.id));
      const next = [...reorderedFiltered, ...untouched].map((main, index) => ({
        ...main,
        sortOrder: index,
      }));
      void persistMainOrder(next);
      return;
    }

    const activeSubId = Number(String(active.id).replace("sub-", ""));
    const overSubId = Number(String(over.id).replace("sub-", ""));
    if (!Number.isFinite(activeSubId) || !Number.isFinite(overSubId)) return;
    const main = orderedCategories.find((item) =>
      (item.subs ?? []).some((sub) => sub.id === activeSubId),
    );
    if (!main) return;
    const subs = main.subs ?? [];
    const overInSameMain = subs.some((sub) => sub.id === overSubId);
    if (!overInSameMain) return;
    const oldIndex = subs.findIndex((sub) => sub.id === activeSubId);
    const newIndex = subs.findIndex((sub) => sub.id === overSubId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const nextSubs = arrayMove(subs, oldIndex, newIndex).map((sub, index) => ({
      ...sub,
      sortOrder: index,
    }));
    void persistSubOrder(main.id, nextSubs);
  };

  const openNameDialog = (state: Exclude<NameDialogState, null>) => {
    setNameDialog(state);
    setNameValue(dialogInitialName(state));
  };

  const handleSaveName = async () => {
    if (!nameDialog || !canEdit) return;
    const trimmed = nameValue.trim();
    if (!trimmed) {
      notify("warning", "Kategori adı zorunlu.");
      return;
    }
    setSaving(true);
    try {
      switch (nameDialog.kind) {
        case "create-main":
          if (catalog) {
            await createCatalogCategoryRequest({
              name: trimmed,
              sortOrder: orderedCategories.length,
            });
          } else {
            await createMenuCategoryRequest(resolvedMenuId, {
              name: trimmed,
              sortOrder: orderedCategories.length,
            });
          }
          notify("info", "Kategori eklendi.");
          break;
        case "rename-main":
          if (catalog) {
            await updateCatalogCategoryRequest(nameDialog.main.id, { name: trimmed });
          } else {
            await updateMenuCategoryRequest(resolvedMenuId, nameDialog.main.id, { name: trimmed });
          }
          notify("info", "Kategori güncellendi.");
          break;
        case "create-sub":
          if (catalog) {
            await createCatalogSubCategoryRequest(nameDialog.main.id, {
              name: trimmed,
              sortOrder: nameDialog.main.subs?.length ?? 0,
            });
          } else {
            await createMenuSubCategoryRequest(resolvedMenuId, nameDialog.main.id, {
              name: trimmed,
              sortOrder: nameDialog.main.subs?.length ?? 0,
            });
          }
          notify("info", "Alt kategori eklendi.");
          break;
        case "rename-sub":
          if (catalog) {
            await updateCatalogSubCategoryRequest(nameDialog.sub.id, { name: trimmed });
          } else {
            await updateMenuSubCategoryRequest(resolvedMenuId, nameDialog.sub.id, {
              name: trimmed,
            });
          }
          notify("info", "Alt kategori güncellendi.");
          break;
      }
      setNameDialog(null);
      await refresh();
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canEdit) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "main") {
        if (catalog) await deleteCatalogCategoryRequest(deleteTarget.id);
        else await deleteMenuCategoryRequest(resolvedMenuId, deleteTarget.id);
        notify("info", "Kategori silindi.");
      } else {
        if (catalog) await deleteCatalogSubCategoryRequest(deleteTarget.id);
        else await deleteMenuSubCategoryRequest(resolvedMenuId, deleteTarget.id);
        notify("info", "Alt kategori silindi.");
      }
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCoverChange = (categoryId: number, imageUrl: string | null) => {
    setOrderedCategories((current) =>
      current.map((main) => (main.id === categoryId ? { ...main, imageUrl } : main)),
    );
    void refresh();
    void queryClient.invalidateQueries({ queryKey: publicMenuKeys.all });
  };

  const busy = saving || deleting || reordering;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kategori ara…"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1"
          disabled={busy || !canEdit}
          onClick={() => openNameDialog({ kind: "create-main" })}
        >
          <Plus className="h-3.5 w-3.5" />
          Kategori ekle
        </Button>
      </div>

      {debouncedSearch ? (
        <p className="text-xs text-muted-foreground">Arama açıkken sürükle-bırak kapalıdır.</p>
      ) : orderedCategories.length > 1 || orderedCategories.some((main) => (main.subs?.length ?? 0) > 1) ? (
        <p className="text-xs text-muted-foreground">
          Sıralamak için sol taraftaki tutamacı sürükleyin.
        </p>
      ) : null}

      {categoriesQuery.isLoading || (!catalog && menuId <= 0 && menuByQr.isLoading) ? (
        <p className="text-sm text-muted-foreground">Kategoriler yükleniyor…</p>
      ) : categoriesQuery.isError ? (
        <p className="text-sm text-destructive">Kategori listesi alınamadı.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {debouncedSearch
            ? "Aramayla eşleşen kategori bulunamadı."
            : "Henüz kategori yok. Yeni kategori ekleyin."}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="overflow-hidden rounded-xl border border-border bg-card md:overflow-x-auto">
            <table className="block w-full text-sm md:table md:min-w-[760px] md:border-collapse">
              <thead className="hidden md:table-header-group">
                <tr>
                  {["", "Kategori", "Üst kategori", "Kod", "Tür", "İşlem"].map((label) => (
                    <th key={label || "sıra"} className={HEAD_CELL}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                <SortableContext items={mainIds} strategy={verticalListSortingStrategy}>
                  {filtered.map((main) => (
                    <SortableCategoryRows
                      key={main.id}
                      main={main}
                      menuId={resolvedMenuId}
                      catalog={catalog}
                      busy={busy}
                      dragDisabled={dragDisabled}
                      onRename={() => openNameDialog({ kind: "rename-main", main })}
                      onDelete={() => setDeleteTarget({ kind: "main", id: main.id, name: main.name })}
                      onAddSub={() => openNameDialog({ kind: "create-sub", main })}
                      onRenameSub={(sub) => openNameDialog({ kind: "rename-sub", sub })}
                      onDeleteSub={(sub) => setDeleteTarget({ kind: "sub", id: sub.id, name: sub.name })}
                      onAddProduct={onAddProduct}
                      onCoverChange={handleCoverChange}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </div>
        </DndContext>
      )}

      <Dialog
        open={nameDialog != null}
        onOpenChange={(open) => {
          if (!open && !saving) setNameDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle(nameDialog)}</DialogTitle>
            <DialogDescription>Görünen ad menüde ve ürün seçiminde kullanılır.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Ad</Label>
            <Input
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveName();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setNameDialog(null)}
            >
              Vazgeç
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSaveName()}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "main" ? "Kategori silinsin mi?" : "Alt kategori silinsin mi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" kalıcı olarak silinecek. Ürünü olan kategoriler silinemez.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Siliniyor…" : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
