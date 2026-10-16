"use client";

import { STAFF_SITE_ORIGIN } from "@/lib/config";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useMenuLocaleOptional } from "./menu-locale";

type WaiterAuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WaiterAuthDialog({ open, onOpenChange }: WaiterAuthDialogProps) {
  const locale = useMenuLocaleOptional();
  const t = locale?.t;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir={locale?.dir}>
        <DialogHeader>
          <DialogTitle>{t?.waiterLoginTitle || "Garson girişi"}</DialogTitle>
          <DialogDescription>
            {t?.waiterLoginDescription || "İşletme ID, kullanıcı adı ve şifrenizle giriş yapın."}
          </DialogDescription>
        </DialogHeader>
        <a
          href={STAFF_SITE_ORIGIN}
          className="inline-flex w-full items-center justify-center rounded-lg bg-foreground px-3 py-2.5 text-sm font-medium text-background"
        >
          {t?.waiterLogin || "Garson girişi"}
        </a>
      </DialogContent>
    </Dialog>
  );
}
