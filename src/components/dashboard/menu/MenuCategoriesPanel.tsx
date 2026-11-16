"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CirclePlus, FolderTree, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { CategoryCoverField } from "@/components/dashboard/menu/CategoryCoverField";
import { Button } from "@/components/ui/button";
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
  label,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground/70",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing",
      )}
      disabled={disabled}
      aria-label={label}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

/** Small labeled action; the label hides on phones only where an icon is self-explanatory. */
const ACTION_BUTTON =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground/75 transition-colors hover:bg-[#FFF0F3] hover:text-[#F03245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-[#F03245]/15 dark:hover:text-[#FB7185]";
/** Minimal red "add" text button, shared by "Kategori ekle" and "Alt kategori ekle". */
const ADD_BUTTON =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#F03245] transition-colors hover:bg-[#FFF0F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:text-[#FB7185] dark:hover:bg-[#F03245]/15";
const DANGER_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

function SortableSubRow({
  sub,
  busy,
  dragDisabled,
  onRename,
  onDelete,
  onAddProduct,
}: {
  sub: SubCategoryApiItem;
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
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 py-1.5 pl-1 pr-1.5 sm:gap-2 sm:pr-2",
        isDragging && "relative z-10 rounded-xl bg-card shadow-lg ring-1 ring-border",
      )}
    >
      <DragHandle
        attributes={attributes}
        listeners={listeners}
        disabled={dragDisabled || busy}
        label={`${sub.name} alt kategorisini sürükleyerek sırala`}
      />
      <button
        type="button"
        onClick={onRename}
        disabled={busy}
        className="min-w-0 flex-1 truncate rounded-md py-1 text-left text-sm text-foreground hover:text-[#F03245] disabled:pointer-events-none"
        title="Adını değiştir"
      >
        {sub.name}
      </button>
      {onAddProduct ? (
        <button type="button" className={ACTION_BUTTON} disabled={busy} onClick={() => onAddProduct(sub.id)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Ürün ekle</span>
          <span className="sm:hidden">Ürün</span>
        </button>
      ) : null}
      <button
        type="button"
        className={cn(ACTION_BUTTON, "w-9 px-0 sm:w-auto sm:px-2.5")}
        disabled={busy}
        onClick={onRename}
        aria-label={`${sub.name} adını değiştir`}
      >
        <Pencil className="size-4 sm:size-3.5" />
        <span className="hidden sm:inline">Düzenle</span>
      </button>
      <button type="button" className={DANGER_BUTTON} disabled={busy} onClick={onDelete} aria-label={`${sub.name} sil`}>
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function SortableCategoryCard({
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
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "overflow-hidden rounded-2xl border border-[#ececea] bg-card dark:border-border",
        isDragging && "relative z-10 shadow-xl",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 sm:flex-nowrap sm:gap-3 sm:p-4">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto sm:gap-3">
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            disabled={dragDisabled || busy}
            label={`${main.name} kategorisini sürükleyerek sırala`}
          />
          <CategoryCoverField
            menuId={menuId}
            categoryId={main.id}
            value={main.imageUrl}
            disabled={busy || (!catalog && menuId <= 0)}
            catalog={catalog}
            compact
            onChange={(imageUrl) => onCoverChange(main.id, imageUrl)}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold text-foreground">{main.name}</h3>
            <p className="text-xs text-muted-foreground">
              {subs.length > 0 ? `${subs.length} alt kategori` : "Alt kategori yok"}
            </p>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button type="button" className={ADD_BUTTON} disabled={busy} onClick={onAddSub}>
            <CirclePlus className="size-4" />
            Alt kategori ekle
          </button>
          <button
            type="button"
            className={cn(ACTION_BUTTON, "w-9 px-0 sm:w-auto sm:px-2.5")}
            disabled={busy}
            onClick={onRename}
            aria-label={`${main.name} adını değiştir`}
          >
            <Pencil className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">Düzenle</span>
          </button>
          <button
            type="button"
            className={DANGER_BUTTON}
            disabled={busy}
            onClick={onDelete}
            aria-label={`${main.name} kategorisini sil`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      {subs.length > 0 ? (
        <SortableContext items={subIds} strategy={verticalListSortingStrategy}>
          <ul className="mx-2 mb-2 divide-y divide-[#f1f1ef] rounded-xl bg-muted/30 px-1 dark:divide-border sm:mx-4 sm:mb-4">
            {subs.map((sub) => (
              <SortableSubRow
                key={sub.id}
                sub={sub}
                busy={busy}
                dragDisabled={dragDisabled}
                onRename={() => onRenameSub(sub)}
                onDelete={() => onDeleteSub(sub)}
                onAddProduct={onAddProduct}
              />
            ))}
          </ul>
        </SortableContext>
      ) : null}

    </article>
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
  const subCount = orderedCategories.reduce((total, main) => total + (main.subs?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kategori veya alt kategori ara"
            className="h-10 pl-9"
            aria-label="Kategori ara"
          />
        </div>
        <button
          type="button"
          className={cn(ADD_BUTTON, "h-10 self-end text-sm sm:self-auto")}
          disabled={busy || !canEdit}
          onClick={() => openNameDialog({ kind: "create-main" })}
        >
          <CirclePlus className="size-4" />
          Kategori ekle
        </button>
      </div>

      {orderedCategories.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{orderedCategories.length}</span> kategori ·{" "}
            <span className="font-medium text-foreground">{subCount}</span> alt kategori
          </span>
          <span className="inline-flex items-center gap-1">
            <GripVertical className="size-3.5" aria-hidden />
            {debouncedSearch ? "Arama açıkken sıralama kapalı" : "Sıralamak için tutup sürükleyin"}
          </span>
        </div>
      ) : null}

      {categoriesQuery.isLoading || (!catalog && menuId <= 0 && menuByQr.isLoading) ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : categoriesQuery.isError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kategori listesi alınamadı.
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15">
            <FolderTree className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {debouncedSearch ? "Eşleşen kategori yok" : "Henüz kategori yok"}
            </p>
            <p className="text-xs text-muted-foreground">
              {debouncedSearch
                ? "Farklı bir kelimeyle aramayı deneyin."
                : "Ürünlerinizi gruplamak için ilk kategorinizi ekleyin."}
            </p>
          </div>
          {debouncedSearch ? (
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSearch("")}>
              Aramayı temizle
            </Button>
          ) : (
            <button
              type="button"
              className={cn(ADD_BUTTON, "text-sm")}
              disabled={busy || !canEdit}
              onClick={() => openNameDialog({ kind: "create-main" })}
            >
              <CirclePlus className="size-4" />
              Kategori ekle
            </button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={mainIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {filtered.map((main) => (
                <SortableCategoryCard
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
            </div>
          </SortableContext>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
