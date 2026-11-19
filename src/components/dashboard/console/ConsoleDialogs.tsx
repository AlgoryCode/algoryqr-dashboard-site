"use client";

import { useState, type FormEvent, type ReactNode } from "react";

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
import {
  formatClock,
  formatDuration,
  formatTl,
  parseRateInput,
  type ConsolePayload,
  type ConsoleSession,
  type GameConsole,
  type StartSessionPayload,
} from "@/lib/console-api";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ConsoleEditorDialog({
  open,
  console: editing,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  console: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ConsolePayload) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Konsolu düzenle" : "Konsol ekle"}</DialogTitle>
          <DialogDescription>Saatlik ücreti boş bırakırsanız şubenin varsayılan ücreti kullanılır.</DialogDescription>
        </DialogHeader>
        <ConsoleForm key={editing?.id ?? "new"} editing={editing} pending={pending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}

function ConsoleForm({
  editing,
  pending,
  onSubmit,
}: {
  editing: GameConsole | null;
  pending: boolean;
  onSubmit: (payload: ConsolePayload) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [rate, setRate] = useState(editing?.hourlyRate != null ? String(editing.hourlyRate).replace(".", ",") : "");
  const parsedRate = parseRateInput(rate);
  const invalid = name.trim() === "" || parsedRate === undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({ name: name.trim(), hourlyRate: parsedRate ?? null });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Ad" htmlFor="console-name">
        <Input
          id="console-name"
          value={name}
          maxLength={120}
          placeholder="PS5 - Masa 1"
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Saatlik ücret (₺)" htmlFor="console-rate">
        <Input
          id="console-rate"
          inputMode="decimal"
          value={rate}
          placeholder="Şube ücreti"
          onChange={(event) => setRate(event.target.value)}
        />
        {parsedRate === undefined ? <p className="text-xs text-destructive">Geçerli bir tutar girin.</p> : null}
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

export function StartSessionDialog({
  console: target,
  pending,
  onOpenChange,
  onSubmit,
}: {
  console: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: StartSessionPayload) => void;
}) {
  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.name} için oturum başlat</DialogTitle>
          <DialogDescription>
            Saatlik ücret: {formatTl(target?.effectiveHourlyRate)}. Süre şimdi başlar.
          </DialogDescription>
        </DialogHeader>
        <StartForm key={target?.id ?? "none"} pending={pending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}

function StartForm({ pending, onSubmit }: { pending: boolean; onSubmit: (payload: StartSessionPayload) => void }) {
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ customerName: customerName.trim() || undefined, note: note.trim() || undefined });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Müşteri (isteğe bağlı)" htmlFor="console-customer">
        <Input
          id="console-customer"
          value={customerName}
          maxLength={120}
          onChange={(event) => setCustomerName(event.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Not (isteğe bağlı)" htmlFor="console-note">
        <Input id="console-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Başlat
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FinishedSessionDialog({
  session,
  onOpenChange,
}: {
  session: ConsoleSession | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={session != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oturum bitti</DialogTitle>
          <DialogDescription>
            {session?.consoleName}
            {session?.customerName ? ` · ${session.customerName}` : ""}
          </DialogDescription>
        </DialogHeader>
        {session ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Başlangıç</dt>
            <dd className="text-right tabular-nums">{formatClock(session.startedAt)}</dd>
            <dt className="text-muted-foreground">Bitiş</dt>
            <dd className="text-right tabular-nums">{formatClock(session.endedAt)}</dd>
            <dt className="text-muted-foreground">Süre</dt>
            <dd className="text-right tabular-nums">{formatDuration(session.durationMinutes)}</dd>
            <dt className="text-muted-foreground">Saatlik ücret</dt>
            <dd className="text-right tabular-nums">{formatTl(session.hourlyRate)}</dd>
            <dt className="pt-2 text-base font-semibold text-foreground">Ödenecek tutar</dt>
            <dd className="pt-2 text-right text-2xl font-semibold tabular-nums text-foreground">
              {formatTl(session.amount)}
            </dd>
          </dl>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Tamam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
