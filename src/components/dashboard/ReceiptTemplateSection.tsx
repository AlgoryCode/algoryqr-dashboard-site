"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";

import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { invalidateBranches, useBranches } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api";
import { updateBranchRequest, type BranchItem } from "@/lib/branch";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  defaultReceiptFooter,
  kitchenOrderToReceipt,
  printReceiptInBrowser,
  receiptToHtml,
  withReceiptTemplate,
} from "@/lib/receipt-ticket";

const HEADER_MAX = 120;
const TEXT_MAX = 500;

type Draft = { header: string; intro: string; footer: string };

function draftFor(branch: BranchItem | null): Draft {
  return {
    header: branch?.receiptHeader ?? "",
    intro: branch?.receiptIntro ?? "",
    footer: branch?.receiptFooter ?? "",
  };
}

/** A sample order, so the preview shows where the header, paragraph and footer land. */
function sampleReceipt(branch: BranchItem | null, draft: Draft) {
  return withReceiptTemplate(
    kitchenOrderToReceipt({
      id: 1024,
      orderSource: "UBER_EATS",
      deliveryType: "DELIVERY",
      customerName: "Ayşe Y.",
      submittedAt: new Date().toISOString(),
      currency: "TRY",
      totalAmount: 285,
      items: [
        { productName: "Latte", quantity: 2, unitPrice: 95, selectedOptions: [{ groupName: "Süt", optionName: "Yulaf" }] },
        { productName: "San Sebastian", quantity: 1, unitPrice: 95 },
      ],
    }),
    { businessName: branch?.name, header: draft.header, intro: draft.intro, footer: draft.footer },
  );
}

/**
 * Receipt template per branch: heading, a paragraph under it and a footer.
 * Every receipt printed from the dashboard uses it; the print agent receives it with each job.
 */
export function ReceiptTemplateSection({ onNotify }: { onNotify: (tone: "info" | "danger", message: string) => void }) {
  const queryClient = useQueryClient();
  const branchesQuery = useBranches();
  const branches = useMemo(() => branchesQuery.data?.content ?? [], [branchesQuery.data]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const branch = branches.find((item) => item.id === branchId) ?? branches[0] ?? null;
  // Unsaved edits per branch; switching branches keeps them until saved or reset.
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const draft = branch ? (drafts[branch.id] ?? draftFor(branch)) : draftFor(null);
  const saved = draftFor(branch);
  const dirty = draft.header !== saved.header || draft.intro !== saved.intro || draft.footer !== saved.footer;
  const preview = useMemo(() => receiptToHtml(sampleReceipt(branch, draft)), [branch, draft]);

  const edit = (patch: Partial<Draft>) => {
    if (!branch) return;
    setDrafts((current) => ({ ...current, [branch.id]: { ...draft, ...patch } }));
  };

  const save = useMutation({
    mutationFn: () =>
      updateBranchRequest(branch!.id, {
        name: branch!.name,
        receiptHeader: draft.header.trim(),
        receiptIntro: draft.intro.trim(),
        receiptFooter: draft.footer.trim(),
      }),
    onSuccess: async () => {
      await invalidateBranches(queryClient);
      setDrafts((current) => {
        const next = { ...current };
        if (branch) delete next[branch.id];
        return next;
      });
      onNotify("info", "Fiş şablonu kaydedildi. Sonraki fişler bu şablonla basılacak.");
    },
    onError: (error) => onNotify("danger", error instanceof ApiError ? error.message : "Fiş şablonu kaydedilemedi."),
  });

  if (branchesQuery.isLoading) {
    return (
      <section className={`${DASHBOARD_SURFACE} flex items-center gap-2 p-5 text-sm text-muted-foreground`}>
        <Loader2 className="size-4 animate-spin" />
        Fiş şablonu yükleniyor…
      </section>
    );
  }
  if (!branch) return null;

  return (
    <section className={`${DASHBOARD_SURFACE} p-4 sm:p-5`} aria-label="Fiş şablonu">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Fiş şablonu</h2>
          <p className="text-sm text-muted-foreground">
            Üst başlık, altındaki açıklama ve alt bilgi; sipariş bilgileri ortada yer alır. Her fiş bu şablonla basılır.
          </p>
        </div>
        {branches.length > 1 ? (
          <SearchableSelect
            className="h-9 w-full sm:w-60"
            value={String(branch.id)}
            onValueChange={(value) => value && setBranchId(Number(value))}
            options={branches.map((item) => ({ value: String(item.id), label: item.name }))}
            placeholder="Şube seçin"
            searchPlaceholder="Şube ara..."
          />
        ) : null}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          className="min-w-0 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="receipt-header">Üst başlık</Label>
            <Input
              id="receipt-header"
              value={draft.header}
              maxLength={HEADER_MAX}
              placeholder={branch.name}
              onChange={(event) => edit({ header: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">Boş bırakılırsa şube adı yazılır.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt-intro">Başlık altı açıklama</Label>
            <Textarea
              id="receipt-intro"
              rows={3}
              value={draft.intro}
              maxLength={TEXT_MAX}
              placeholder={"Örn. Moda Şubesi · 0216 000 00 00\nHer gün 08:00–23:00"}
              onChange={(event) => edit({ intro: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">Adres, telefon, çalışma saatleri veya Wi-Fi bilgisi için. İsteğe bağlı.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="receipt-footer">Alt bilgi</Label>
              {!draft.footer.trim() ? (
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => edit({ footer: defaultReceiptFooter(branch.name) })}
                >
                  Önerilen metni kullan
                </button>
              ) : null}
            </div>
            <Textarea
              id="receipt-footer"
              rows={3}
              value={draft.footer}
              maxLength={TEXT_MAX}
              placeholder={defaultReceiptFooter(branch.name)}
              onChange={(event) => edit({ footer: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">Boş bırakılırsa gri metin basılır.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={!dirty || save.isPending} className="gap-1.5">
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Kaydet
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setDrafts((current) => {
                    const next = { ...current };
                    delete next[branch.id];
                    return next;
                  })
                }
              >
                Vazgeç
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 sm:ml-auto"
              onClick={() => printReceiptInBrowser(sampleReceipt(branch, draft))}
            >
              <Printer className="size-4" />
              Örnek fiş yazdır
            </Button>
          </div>
        </form>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Önizleme</p>
          <div className="overflow-hidden rounded-xl border border-border bg-[#f4f4f2] p-3 dark:bg-muted/40">
            <iframe
              title="Fiş önizlemesi"
              srcDoc={preview}
              className="mx-auto block h-[30rem] w-full max-w-[18rem] rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
