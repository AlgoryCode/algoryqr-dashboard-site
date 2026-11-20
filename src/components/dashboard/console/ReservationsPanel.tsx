"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CustomerPicker } from "@/components/dashboard/console/CustomerPicker";
import { Field } from "@/components/dashboard/console/ConsoleDialogs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  RESERVATION_STATUS_LABELS,
  cancelReservation,
  createReservation,
  formatClock,
  formatTime,
  isoDay,
  listReservations,
  noShowReservation,
  startReservation,
  type DeviceCustomer,
  type GameConsole,
  type Reservation,
  type ReservationPayload,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

/** Next full half hour, as the value of a datetime-local input. */
function nextSlot(): string {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 60);
  return `${isoDay(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function ReservationsPanel({
  branchId,
  consoles,
  onChanged,
}: {
  branchId: number;
  consoles: GameConsole[];
  onChanged: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [creating, setCreating] = useState(false);
  const [range, setRange] = useState<"today" | "week">("week");
  const today = new Date();
  const until = new Date(today);
  until.setDate(until.getDate() + (range === "today" ? 0 : 7));
  const from = isoDay(today);
  const to = isoDay(until);

  const reservations = useQuery({
    queryKey: ["console-reservations", branchId, from, to],
    queryFn: () => listReservations(branchId, from, to),
  });

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["console-reservations"] }), onChanged()]);
  }

  const create = useMutation({
    mutationFn: (payload: ReservationPayload) => createReservation(branchId, payload),
    onSuccess: async () => {
      setCreating(false);
      await refresh();
      notify("info", "Rezervasyon eklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Rezervasyon eklenemedi")),
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "start" | "cancel" | "noShow" }): Promise<unknown> =>
      action === "start" ? startReservation(id) : action === "cancel" ? cancelReservation(id) : noShowReservation(id),
    onSuccess: async (_, { action }) => {
      await refresh();
      notify("info", action === "start" ? "Oturum başladı" : action === "cancel" ? "Rezervasyon iptal edildi" : "Gelmedi olarak işaretlendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "İşlem yapılamadı")),
  });

  const rows = reservations.data ?? [];
  return (
    <div className={DASHBOARD_PANEL}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant={range === "today" ? "default" : "outline"} onClick={() => setRange("today")}>
            Bugün
          </Button>
          <Button size="sm" variant={range === "week" ? "default" : "outline"} onClick={() => setRange("week")}>
            7 gün
          </Button>
        </div>
        <Button size="sm" disabled={consoles.length === 0} onClick={() => setCreating(true)}>
          Rezervasyon ekle
        </Button>
      </div>
      {reservations.isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu aralıkta rezervasyon yok.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Saat</TableHead>
              <TableHead>Cihaz</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row: Reservation) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums">
                  {formatClock(row.startsAt)}–{formatTime(row.endsAt)}
                </TableCell>
                <TableCell>{row.consoleName ?? `#${row.consoleId}`}</TableCell>
                <TableCell>
                  {row.customerName}
                  {row.phone ? <span className="block text-xs text-muted-foreground">{row.phone}</span> : null}
                </TableCell>
                <TableCell>{RESERVATION_STATUS_LABELS[row.status]}</TableCell>
                <TableCell className="text-right">
                  {row.status === "BOOKED" ? (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ id: row.id, action: "start" })}>
                        Başlat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ id: row.id, action: "noShow" })}
                      >
                        Gelmedi
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ id: row.id, action: "cancel" })}
                      >
                        İptal
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rezervasyon ekle</DialogTitle>
            <DialogDescription>Aynı cihazda çakışan rezervasyon kabul edilmez.</DialogDescription>
          </DialogHeader>
          {creating ? (
            <ReservationForm consoles={consoles} pending={create.isPending} onSubmit={(p) => create.mutate(p)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReservationForm({
  consoles,
  pending,
  onSubmit,
}: {
  consoles: GameConsole[];
  pending: boolean;
  onSubmit: (payload: ReservationPayload) => void;
}) {
  const [consoleId, setConsoleId] = useState<string>(consoles[0] ? String(consoles[0].id) : "");
  const [customer, setCustomer] = useState<DeviceCustomer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [startsAt, setStartsAt] = useState(nextSlot());
  const [duration, setDuration] = useState("60");
  const minutes = Number(duration);
  const invalid =
    !consoleId ||
    !startsAt ||
    !(Number.isInteger(minutes) && minutes >= 5 && minutes <= 1440) ||
    (customer == null && name.trim() === "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({
      consoleId: Number(consoleId),
      customerId: customer?.id,
      customerName: customer ? undefined : name.trim(),
      phone: customer ? undefined : phone.trim() || undefined,
      note: note.trim() || undefined,
      startsAt: `${startsAt}:00`,
      durationMinutes: minutes,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Cihaz" htmlFor="res-console">
        <Select value={consoleId} onValueChange={setConsoleId}>
          <SelectTrigger id="res-console">
            <SelectValue placeholder="Cihaz seçin" />
          </SelectTrigger>
          <SelectContent>
            {consoles.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="space-y-1.5">
        <Label>Müşteri kartı (isteğe bağlı)</Label>
        <CustomerPicker selected={customer} onSelect={setCustomer} />
      </div>
      {customer ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Müşteri adı" htmlFor="res-name">
            <Input id="res-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Telefon" htmlFor="res-phone">
            <Input id="res-phone" value={phone} maxLength={32} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Başlangıç" htmlFor="res-start">
          <Input id="res-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Süre (dk)" htmlFor="res-duration">
          <Input id="res-duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
      </div>
      <Field label="Not" htmlFor="res-note">
        <Input id="res-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}
