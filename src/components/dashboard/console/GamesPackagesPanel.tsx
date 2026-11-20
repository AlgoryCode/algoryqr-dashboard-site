"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Field } from "@/components/dashboard/console/ConsoleDialogs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DAY_LABELS,
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  createGame,
  createPackage,
  deleteGame,
  deletePackage,
  formatDays,
  formatDuration,
  formatTl,
  listGames,
  listPackages,
  parseRateInput,
  rateInputValue,
  updateGame,
  updatePackage,
  type DeviceGame,
  type DevicePackage,
  type DeviceType,
  type GamePayload,
  type PackagePayload,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import { CONSOLE_DIALOG } from "@/components/dashboard/console/console-ui";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function GamesPackagesPanel({ branchId, onChanged }: { branchId: number; onChanged: () => Promise<unknown> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <GamesSection branchId={branchId} onChanged={onChanged} />
      <PackagesSection branchId={branchId} onChanged={onChanged} />
    </div>
  );
}

// ---- Games ---------------------------------------------------------------------------------------------------

function GamesSection({ branchId, onChanged }: { branchId: number; onChanged: () => Promise<unknown> }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [editing, setEditing] = useState<DeviceGame | "new" | null>(null);
  const games = useQuery({ queryKey: ["console-games", branchId], queryFn: () => listGames(branchId) });

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["console-games"] }), onChanged()]);
  }
  const save = useMutation({
    mutationFn: (payload: GamePayload) =>
      editing && editing !== "new" ? updateGame(editing.id, payload) : createGame(branchId, payload),
    onSuccess: async () => {
      setEditing(null);
      await refresh();
      notify("info", "Oyun kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Oyun kaydedilemedi")),
  });
  const remove = useMutation({
    mutationFn: (gameId: number) => deleteGame(gameId),
    onSuccess: async () => {
      await refresh();
      notify("info", "Oyun silindi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Oyun silinemedi")),
  });

  return (
    <div className={`${DASHBOARD_PANEL} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Oyun kütüphanesi</h3>
          <p className="text-xs text-muted-foreground">
            Hangi cihazda yüklü olduğunu cihazı düzenlerken seçin. Oturumda seçilen oyun raporda görünür.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          Oyun ekle
        </Button>
      </div>
      {(games.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{games.isLoading ? "Yükleniyor…" : "Oyun yok."}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Oyun</TableHead>
              <TableHead className="hidden md:table-cell">Tür</TableHead>
              <TableHead className="hidden md:table-cell text-right">Oyuncu</TableHead>
              <TableHead className="text-right">Cihaz</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(games.data ?? []).map((game) => (
              <TableRow key={game.id}>
                <TableCell className="font-medium">{game.name}</TableCell>
                <TableCell className="hidden md:table-cell">{game.genre ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-right tabular-nums">{game.maxPlayers ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{game.consoleIds.length}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(game)}>
                    Düzenle
                  </Button>
                  <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(game.id)}>
                    Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className={CONSOLE_DIALOG}>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Oyun ekle" : "Oyunu düzenle"}</DialogTitle>
            <DialogDescription>Tür ve oyuncu sayısı isteğe bağlıdır.</DialogDescription>
          </DialogHeader>
          {editing != null ? (
            <GameForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              pending={save.isPending}
              onSubmit={(payload) => save.mutate(payload)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GameForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: DeviceGame | null;
  pending: boolean;
  onSubmit: (payload: GamePayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [maxPlayers, setMaxPlayers] = useState(initial?.maxPlayers != null ? String(initial.maxPlayers) : "");
  const players = Number(maxPlayers);
  const playersInvalid = maxPlayers !== "" && !(Number.isInteger(players) && players >= 1 && players <= 64);
  const invalid = !name.trim() || playersInvalid;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({ name: name.trim(), genre: genre.trim() || null, maxPlayers: maxPlayers === "" ? null : players });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Ad" htmlFor="game-name">
        <Input id="game-name" value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tür" htmlFor="game-genre">
          <Input id="game-genre" value={genre} maxLength={60} placeholder="Futbol, dövüş…" onChange={(e) => setGenre(e.target.value)} />
        </Field>
        <Field label="En çok oyuncu" htmlFor="game-players">
          <Input
            id="game-players"
            inputMode="numeric"
            value={maxPlayers}
            aria-invalid={playersInvalid}
            onChange={(e) => setMaxPlayers(e.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---- Packages ------------------------------------------------------------------------------------------------

function PackagesSection({ branchId, onChanged }: { branchId: number; onChanged: () => Promise<unknown> }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [editing, setEditing] = useState<DevicePackage | "new" | null>(null);
  const packages = useQuery({ queryKey: ["console-packages", branchId, "all"], queryFn: () => listPackages(branchId) });

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["console-packages"] }), onChanged()]);
  }
  const save = useMutation({
    mutationFn: (payload: PackagePayload) =>
      editing && editing !== "new" ? updatePackage(editing.id, payload) : createPackage(branchId, payload),
    onSuccess: async () => {
      setEditing(null);
      await refresh();
      notify("info", "Paket kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Paket kaydedilemedi")),
  });
  const remove = useMutation({
    mutationFn: (packageId: number) => deletePackage(packageId),
    onSuccess: async () => {
      await refresh();
      notify("info", "Paket silindi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Paket silinemedi")),
  });

  return (
    <div className={`${DASHBOARD_PANEL} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Paketler</h3>
          <p className="text-xs text-muted-foreground">
            Sabit fiyatlı süre (ör. 3 saat 150 ₺). Aşan süre saatlik ücretle eklenir; paketli oturumda seviye indirimi
            uygulanmaz.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          Paket ekle
        </Button>
      </div>
      {(packages.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{packages.isLoading ? "Yükleniyor…" : "Paket yok."}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {(packages.data ?? []).map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${p.active ? "" : "opacity-60"}`}>
              <span>
                <span className="font-medium">{p.name}</span>{" "}
                <span className="text-muted-foreground">
                  · {formatDuration(p.minutes)} · {formatTl(p.price)} ·{" "}
                  {p.deviceType ? DEVICE_TYPE_LABELS[p.deviceType] : "Tüm türler"}
                  {p.days.length > 0 && p.days.length < 7 ? ` · ${formatDays(p.days)}` : ""}
                  {p.startTime && p.endTime ? ` · ${p.startTime.slice(0, 5)}–${p.endTime.slice(0, 5)}` : ""}
                  {p.active ? "" : " · Pasif"}
                </span>
              </span>
              <span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                  Düzenle
                </Button>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(p.id)}>
                  Sil
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className={CONSOLE_DIALOG}>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Paket ekle" : "Paketi düzenle"}</DialogTitle>
            <DialogDescription>Gün ve saat aralığı boş kalırsa paket her zaman başlatılabilir.</DialogDescription>
          </DialogHeader>
          {editing != null ? (
            <PackageForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              pending={save.isPending}
              onSubmit={(payload) => save.mutate(payload)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: DevicePackage | null;
  pending: boolean;
  onSubmit: (payload: PackagePayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<string>(initial?.deviceType ?? "ALL");
  const [minutes, setMinutes] = useState(initial ? String(initial.minutes) : "180");
  const [price, setPrice] = useState(rateInputValue(initial?.price));
  const [days, setDays] = useState<number[]>(initial?.days.length ? initial.days : [1, 2, 3, 4, 5, 6, 7]);
  const [windowOn, setWindowOn] = useState(Boolean(initial?.startTime && initial?.endTime));
  const [start, setStart] = useState(initial?.startTime?.slice(0, 5) ?? "10:00");
  const [end, setEnd] = useState(initial?.endTime?.slice(0, 5) ?? "16:00");
  const [active, setActive] = useState(initial?.active ?? true);
  const minutesValue = Number(minutes);
  const parsedPrice = parseRateInput(price);
  const invalid =
    !name.trim() ||
    !(Number.isInteger(minutesValue) && minutesValue >= 1 && minutesValue <= 1440) ||
    parsedPrice == null ||
    days.length === 0 ||
    (windowOn && (!start || !end || start === end));

  function toggleDay(day: number) {
    setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || parsedPrice == null) return;
    onSubmit({
      name: name.trim(),
      deviceType: type === "ALL" ? null : (type as DeviceType),
      minutes: minutesValue,
      price: parsedPrice,
      days: [...days].sort((a, b) => a - b),
      startTime: windowOn ? start : null,
      endTime: windowOn ? end : null,
      active,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Ad" htmlFor="package-name">
          <Input id="package-name" value={name} maxLength={80} placeholder="3 saat paketi" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Cihaz türü" htmlFor="package-type">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="package-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm türler</SelectItem>
              {DEVICE_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {DEVICE_TYPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Süre (dk)" htmlFor="package-minutes">
          <Input id="package-minutes" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Field label="Fiyat (₺)" htmlFor="package-price">
          <Input id="package-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
      <div className="space-y-1.5">
        <Label>Günler</Label>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={days.includes(day) ? "default" : "outline"}
              onClick={() => toggleDay(day)}
            >
              {DAY_LABELS[day]}
            </Button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={windowOn} onCheckedChange={(checked) => setWindowOn(checked === true)} />
        Yalnızca belli saatlerde
      </label>
      {windowOn ? (
        <div className="flex flex-wrap gap-3">
          <Field label="Başlangıç" htmlFor="package-start">
            <Input id="package-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Bitiş" htmlFor="package-end">
            <Input id="package-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
        Aktif
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}
