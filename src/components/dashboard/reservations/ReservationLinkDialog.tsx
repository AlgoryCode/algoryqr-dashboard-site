"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";

import { ToneIcon } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ReservationLinkItem = { menuId: number; title: string; subtitle?: string; url: string };

/** The guest booking page of each menu, ready to copy into Instagram, Google or WhatsApp. */
export function ReservationLinkDialog({
  open,
  onOpenChange,
  links,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: ReservationLinkItem[];
}) {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = async (link: ReservationLinkItem) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(link.menuId);
      window.setTimeout(() => setCopied((current) => (current === link.menuId ? null : current)), 1600);
    } catch {
      window.prompt("Bağlantıyı kopyalayın", link.url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rezervasyon linki</DialogTitle>
          <DialogDescription>
            Müşterileriniz bu bağlantıdan tarih, saat ve kişi sayısı seçip not bırakarak rezervasyon talebi gönderir.
            Talepler burada &quot;Onay bekliyor&quot; olarak düşer.
          </DialogDescription>
        </DialogHeader>

        {links.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Yayında bir menü olmadığı için henüz link yok.
          </p>
        ) : (
          <ul className="max-h-[55dvh] space-y-2 overflow-y-auto">
            {links.map((link) => (
              <li key={link.menuId} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <ToneIcon tone="violet" icon={Link2} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{link.title}</p>
                    {link.subtitle ? <p className="truncate text-xs text-muted-foreground">{link.subtitle}</p> : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2.5 py-2 text-xs text-muted-foreground" title={link.url}>
                    {link.url}
                  </code>
                  <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1.5" onClick={() => void copy(link)}>
                    {copied === link.menuId ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied === link.menuId ? "Kopyalandı" : "Kopyala"}
                  </Button>
                  <Button asChild type="button" size="icon" variant="ghost" className="size-8 shrink-0">
                    <a href={link.url} target="_blank" rel="noreferrer" aria-label={`${link.title} rezervasyon sayfasını aç`} title="Aç">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
