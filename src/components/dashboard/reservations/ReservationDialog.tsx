"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
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
import { Textarea } from "@/components/ui/textarea";
import type { MenuReservationApiItem } from "@/lib/api";
import { localDay } from "@/lib/reservation-list";
import { cn } from "@/lib/utils";

export type ReservationBranchOption = { branchId: number; label: string };

export type ReservationFormValues = {
  branchId: number;
  customerName: string;
  phone: string;
  email: string;
  partySize: number;
  /** YYYY-MM-DDTHH:mm:00, local time like the rest of the API. */
  reservationAt: string;
  note: string;
};

const MAX_PARTY = 50;

function splitDateTime(value: string | undefined) {
  if (!value) return { date: "", time: "" };
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

/** The next half hour from now, so a new booking starts on a sensible slot. */
function nextHalfHour(now = new Date()) {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() < 30 ? 30 : 60);
  return { date: localDay(next), time: `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}` };
}

/**
 * Create or edit a reservation. A new one is taken by the staff (phone, walk-in), so contact details are
 * optional and it is saved as confirmed. The parent remounts it (via `key`) for each item it opens.
 */
export function ReservationDialog({
  open,
  onOpenChange,
  item,
  branches,
  defaultBranchId,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The reservation being edited; null creates a new one. */
  item: MenuReservationApiItem | null;
  branches: ReservationBranchOption[];
  defaultBranchId: number | null;
  saving: boolean;
  onSubmit: (values: ReservationFormValues) => void;
}) {
  const initial = item ? splitDateTime(item.reservationAt) : nextHalfHour();
  const [branchId, setBranchId] = useState<number | null>(
    item?.branchId ?? defaultBranchId ?? branches[0]?.branchId ?? null,
  );
  const [customerName, setCustomerName] = useState(item?.customerName ?? "");
  const [phone, setPhone] = useState(item?.phone ?? "");
  const [email, setEmail] = useState(item?.email ?? "");
  const [partySize, setPartySize] = useState(item?.partySize ?? 2);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [note, setNote] = useState(item?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const today = localDay(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDay(tomorrowDate);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (branchId == null) return setError("Şube seçin.");
    if (!customerName.trim()) return setError("Ad soyad zorunlu.");
    if (!date || !time) return setError("Tarih ve saat seçin.");
    if (email.trim() && !email.includes("@")) return setError("Geçerli bir e-posta girin.");
    setError(null);
    onSubmit({
      branchId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      partySize,
      reservationAt: `${date}T${time}:00`,
      note: note.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{item ? "Rezervasyonu düzenle" : "Yeni rezervasyon"}</DialogTitle>
            <DialogDescription>
              {item
                ? "Bilgileri güncelleyin. Durumu listeden değiştirebilirsiniz."
                : "Telefonla veya kapıda alınan rezervasyonu girin; onaylı olarak kaydedilir."}
            </DialogDescription>
          </DialogHeader>

          {branches.length > 1 && !item ? (
            <div className="space-y-2">
              <Label>Şube</Label>
              <SearchableSelect
                value={branchId == null ? "" : String(branchId)}
                onValueChange={(value) => setBranchId(Number(value))}
                options={branches.map((branch) => ({ value: String(branch.branchId), label: branch.label }))}
                placeholder="Şube seçin"
                searchPlaceholder="Şube ara..."
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reservation-name">Ad soyad</Label>
            <Input
              id="reservation-name"
              autoFocus
              value={customerName}
              maxLength={120}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Örn. Ayşe Yılmaz"
            />
          </div>

          <div className="space-y-2">
            <Label>Tarih ve saat</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Bugün", value: today },
                { label: "Yarın", value: tomorrow },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  aria-pressed={date === chip.value}
                  onClick={() => setDate(chip.value)}
                  className={cn(
                    "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                    date === chip.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Input type="date" aria-label="Tarih" value={date} onChange={(event) => setDate(event.target.value)} />
              <Input type="time" aria-label="Saat" step={300} value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kişi sayısı</Label>
            <PartyStepper value={partySize} onChange={setPartySize} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reservation-phone">Telefon</Label>
              <Input
                id="reservation-phone"
                type="tel"
                inputMode="tel"
                maxLength={40}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="05xx xxx xx xx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservation-email">E-posta</Label>
              <Input
                id="reservation-email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="İsteğe bağlı"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservation-note">Not</Label>
            <Textarea
              id="reservation-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Örn. pencere kenarı, doğum günü, bebek sandalyesi"
              className="resize-none"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {item ? "Kaydet" : "Rezervasyonu oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PartyStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Bir kişi azalt"
      >
        <Minus className="size-4" />
      </Button>
      <span aria-live="polite" className="w-16 text-center text-sm font-medium tabular-nums">
        {value} kişi
      </span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9"
        disabled={value >= MAX_PARTY}
        onClick={() => onChange(Math.min(MAX_PARTY, value + 1))}
        aria-label="Bir kişi artır"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
