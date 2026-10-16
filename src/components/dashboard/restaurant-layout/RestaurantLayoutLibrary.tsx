"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";

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
import type { CatalogLayout } from "@/lib/ordering-api";

export type LayoutBranchOption = {
  id: number;
  name: string;
};

type RestaurantLayoutLibraryProps = {
  layouts: CatalogLayout[];
  branches: LayoutBranchOption[];
  loading: boolean;
  creating: boolean;
  assigningId: number | null;
  deletingId: number | null;
  renamingId: number | null;
  onCreate: (name: string) => void;
  onOpen: (layoutId: number) => void;
  onAssign: (layoutId: number, branchId: number | null) => void;
  onRename: (layoutId: number, name: string) => void;
  onDelete: (layoutId: number) => void;
};

export function RestaurantLayoutLibrary({
  layouts,
  branches,
  loading,
  creating,
  assigningId,
  deletingId,
  renamingId,
  onCreate,
  onOpen,
  onAssign,
  onRename,
  onDelete,
}: RestaurantLayoutLibraryProps) {
  const [name, setName] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CatalogLayout | null>(null);
  const showForm = layouts.length === 0 || formOpen;

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    onCreate(trimmed);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Düzenler yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {layouts.length === 0 ? (
        <section className="space-y-4 rounded-lg border border-primary/30 bg-card p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold">İlk düzeninizi oluşturun</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Düzen, masaların yerleşim planıdır. Oluşturduktan sonra bir şubeye bağlayabilirsiniz.
            </p>
          </div>
          <CreateLayoutForm
            name={name}
            creating={creating}
            onNameChange={setName}
            onSubmit={submitCreate}
          />
        </section>
      ) : (
        <>
          <div className="flex justify-end">
            {showForm ? null : (
              <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
                Yeni düzen
              </Button>
            )}
          </div>
          {showForm ? (
            <section className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Yeni düzen</h2>
              <CreateLayoutForm
                name={name}
                creating={creating}
                onNameChange={setName}
                onSubmit={submitCreate}
                onCancel={() => {
                  setFormOpen(false);
                  setName("");
                }}
              />
            </section>
          ) : null}
          <ul className="space-y-3">
            {layouts.map((layout) => {
              const renaming = renameId === layout.id;
              return (
                <li
                  key={layout.id}
                  className="space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {renaming ? (
                      <form
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const next = renameValue.trim();
                          if (!next || renamingId != null) return;
                          onRename(layout.id, next);
                          setRenameId(null);
                        }}
                      >
                        <Input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          aria-label="Düzen adı"
                          autoFocus
                          className="sm:max-w-xs"
                          disabled={renamingId === layout.id}
                        />
                        <Button type="submit" size="sm" disabled={renamingId === layout.id || !renameValue.trim()}>
                          Kaydet
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenameId(null)}
                        >
                          Vazgeç
                        </Button>
                      </form>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h2 className="truncate text-base font-semibold">{layout.name}</h2>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            aria-label={`${layout.name} adını değiştir`}
                            onClick={() => {
                              setRenameId(layout.id);
                              setRenameValue(layout.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {layout.areaCount} alan · {layout.tableCount} masa ·{" "}
                          {layout.branchName ?? "Şubeye bağlı değil"}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" onClick={() => onOpen(layout.id)}>
                        Aç
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`${layout.name} sil`}
                        disabled={deletingId === layout.id}
                        onClick={() => setDeleteTarget(layout)}
                      >
                        {deletingId === layout.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <LayoutBranchAssign
                    layout={layout}
                    branches={branches}
                    pending={assigningId === layout.id}
                    onAssign={onAssign}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Düzen silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} ve içindeki alanlar ile masalar silinir.`
                : "Bu düzen silinir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget == null) return;
                onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateLayoutForm({
  name,
  creating,
  onNameChange,
  onSubmit,
  onCancel,
}: {
  name: string;
  creating: boolean;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
}) {
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
      <Input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        required
        autoFocus
        placeholder="Örn. Yaz bahçesi"
        aria-label="Düzen adı"
        className="sm:max-w-sm"
        disabled={creating}
      />
      <Button type="submit" disabled={creating || name.trim().length === 0}>
        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Oluştur
      </Button>
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel} disabled={creating}>
          Vazgeç
        </Button>
      ) : null}
    </form>
  );
}

export function LayoutBranchAssign({
  layout,
  branches,
  pending,
  onAssign,
}: {
  layout: CatalogLayout;
  branches: LayoutBranchOption[];
  pending: boolean;
  onAssign: (layoutId: number, branchId: number | null) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const current = layout.branchId == null ? "" : String(layout.branchId);
  const selected = value ?? current;

  useEffect(() => {
    setValue(null);
  }, [layout.branchId]);
  const unchanged = selected === current || (selected === "" && layout.branchId == null);

  if (branches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Şube ekleyince bu düzeni bağlayabilirsiniz.</p>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (unchanged || pending) return;
        onAssign(layout.id, Number(selected));
      }}
    >
      <select
        aria-label={`${layout.name} için şube`}
        value={selected}
        onChange={(event) => setValue(event.target.value)}
        disabled={pending}
        className="h-10 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Şubeye bağlı değil</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending || unchanged || selected === ""}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Şubeye bağla
      </Button>
      {layout.branchId != null ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => onAssign(layout.id, null)}
        >
          Bağlantıyı kaldır
        </Button>
      ) : null}
    </form>
  );
}
