"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Choice, Field } from "@/components/dashboard/console/ConsoleDialogs";
import { CustomerPicker } from "@/components/dashboard/console/CustomerPicker";
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
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  PAYMENT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  addTournamentPlayer,
  cancelTournament,
  createTournament,
  formatClock,
  formatTl,
  getTournament,
  listTournaments,
  matchesByRound,
  parseRateInput,
  payTournamentPlayer,
  rateInputValue,
  removeTournamentPlayer,
  reportMatch,
  roundLabel,
  startTournament,
  toNumber,
  updateTournament,
  type DeviceCustomer,
  type PaymentMethod,
  type Tournament,
  type TournamentMatch,
  type TournamentPayload,
  type TournamentPlayerPayload,
  type TournamentStatus,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const STATUS_CLASS: Record<TournamentStatus, string> = {
  REGISTRATION: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  RUNNING: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  FINISHED: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  CANCELLED: "bg-muted text-muted-foreground",
};

const FEE_METHODS = ["CASH", "CARD", "TRANSFER"] as const satisfies readonly PaymentMethod[];
type FeeChoice = (typeof FEE_METHODS)[number] | "LATER";

function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {TOURNAMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function TournamentsPanel({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Tournament | "new" | null>(null);
  const list = useQuery({ queryKey: ["console-tournaments", branchId], queryFn: () => listTournaments(branchId) });

  const save = useMutation({
    mutationFn: (payload: TournamentPayload) =>
      editing && editing !== "new" ? updateTournament(editing.id, payload) : createTournament(branchId, payload),
    onSuccess: async (saved) => {
      setEditing(null);
      setSelectedId(saved.id);
      queryClient.setQueryData(["console-tournament", saved.id], saved);
      await queryClient.invalidateQueries({ queryKey: ["console-tournaments"] });
      notify("info", "Turnuva kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Turnuva kaydedilemedi")),
  });

  const tournaments = list.data ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Turnuvalar</h3>
          <Button size="sm" onClick={() => setEditing("new")}>
            Turnuva ekle
          </Button>
        </div>
        {tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{list.isLoading ? "Yükleniyor…" : "Turnuva yok."}</p>
        ) : (
          <ul className="space-y-1">
            {tournaments.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted ${
                    selectedId === t.id ? "border-foreground/30 bg-muted" : "border-border"
                  }`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate font-medium text-foreground">{t.name}</span>
                    <StatusBadge status={t.status} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatClock(t.startsAt)}
                    {t.gameName ? ` · ${t.gameName}` : ""} · {t.playerCount}/{t.maxPlayers} oyuncu
                  </span>
                  {t.winnerName ? <span className="block text-xs text-violet-700 dark:text-violet-300">🏆 {t.winnerName}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedId != null ? (
        <TournamentDetail key={selectedId} tournamentId={selectedId} onEdit={setEditing} />
      ) : (
        <div className={`${DASHBOARD_PANEL} text-sm text-muted-foreground`}>
          Oyuncuları, ödemeleri ve eşleşmeleri görmek için bir turnuva seçin.
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Turnuva ekle" : "Turnuvayı düzenle"}</DialogTitle>
            <DialogDescription>Katılım ücreti alınınca muhasebeye “Turnuva katılımı” geliri yazılır.</DialogDescription>
          </DialogHeader>
          {editing != null ? (
            <TournamentForm
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

/** Tomorrow 20:00 as a datetime-local value. */
function defaultStart(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T20:00`;
}

function TournamentForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: Tournament | null;
  pending: boolean;
  onSubmit: (payload: TournamentPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [gameName, setGameName] = useState(initial?.gameName ?? "");
  const [startsAt, setStartsAt] = useState(initial?.startsAt.slice(0, 16) ?? defaultStart());
  const [fee, setFee] = useState(rateInputValue(initial?.entryFee));
  const [prize, setPrize] = useState(initial?.prizeNote ?? "");
  const [maxPlayers, setMaxPlayers] = useState(String(initial?.maxPlayers ?? 16));
  const parsedFee = parseRateInput(fee);
  const max = Number(maxPlayers);
  const invalid =
    !name.trim() || !startsAt || parsedFee === undefined || !(Number.isInteger(max) && max >= 2 && max <= 128);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({
      name: name.trim(),
      gameName: gameName.trim() || null,
      startsAt: startsAt.length === 16 ? `${startsAt}:00` : startsAt,
      entryFee: parsedFee ?? null,
      prizeNote: prize.trim() || null,
      maxPlayers: max,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Ad" htmlFor="tournament-name">
        <Input id="tournament-name" value={name} maxLength={120} placeholder="Cuma FIFA turnuvası" onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Oyun" htmlFor="tournament-game">
          <Input id="tournament-game" value={gameName} maxLength={120} onChange={(e) => setGameName(e.target.value)} />
        </Field>
        <Field label="Başlangıç" htmlFor="tournament-start">
          <Input id="tournament-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Katılım ücreti (₺)" htmlFor="tournament-fee">
          <Input id="tournament-fee" inputMode="decimal" placeholder="Ücretsiz" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Field label="En çok oyuncu" htmlFor="tournament-max">
          <Input id="tournament-max" inputMode="numeric" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
        </Field>
      </div>
      <Field label="Ödül (isteğe bağlı)" htmlFor="tournament-prize">
        <Input id="tournament-prize" value={prize} maxLength={255} placeholder="1. olana 5 saat ücretsiz" onChange={(e) => setPrize(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

type DetailAction =
  | { kind: "cancel" | "start" }
  | { kind: "add"; payload: TournamentPlayerPayload }
  | { kind: "remove"; playerId: number }
  | { kind: "pay"; playerId: number; method: PaymentMethod }
  | { kind: "result"; matchId: number; winnerPlayerId: number; score?: string };

function TournamentDetail({
  tournamentId,
  onEdit,
}: {
  tournamentId: number;
  onEdit: (tournament: Tournament) => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const detail = useQuery({
    queryKey: ["console-tournament", tournamentId],
    queryFn: () => getTournament(tournamentId),
  });

  const act = useMutation({
    mutationFn: (action: DetailAction) => {
      switch (action.kind) {
        case "cancel":
          return cancelTournament(tournamentId);
        case "start":
          return startTournament(tournamentId);
        case "add":
          return addTournamentPlayer(tournamentId, action.payload);
        case "remove":
          return removeTournamentPlayer(tournamentId, action.playerId);
        case "pay":
          return payTournamentPlayer(tournamentId, action.playerId, action.method);
        case "result":
          return reportMatch(tournamentId, action.matchId, { winnerPlayerId: action.winnerPlayerId, score: action.score });
      }
    },
    onSuccess: async (updated, action) => {
      queryClient.setQueryData(["console-tournament", tournamentId], updated);
      await queryClient.invalidateQueries({ queryKey: ["console-tournaments"] });
      if (action.kind === "cancel") notify("info", "Turnuva iptal edildi");
      if (action.kind === "start") notify("info", "Turnuva başladı; eşleşmeler hazır");
      if (action.kind === "result" && updated.status === "FINISHED") {
        notify("info", `Turnuva bitti${updated.winnerName ? `: kazanan ${updated.winnerName}` : ""}`);
      }
    },
    onError: (error) => notify("danger", errorMessage(error, "İşlem yapılamadı")),
  });

  const t = detail.data;
  if (!t) {
    return <div className={`${DASHBOARD_PANEL} text-sm text-muted-foreground`}>{detail.isError ? "Turnuva yüklenemedi." : "Yükleniyor…"}</div>;
  }

  const registration = t.status === "REGISTRATION";
  const hasFee = toNumber(t.entryFee) > 0;
  const rounds = matchesByRound(t.matches);
  const full = t.players.length >= t.maxPlayers;

  return (
    <div className="space-y-4">
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{t.name}</h3>
              <StatusBadge status={t.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatClock(t.startsAt)}
              {t.gameName ? ` · ${t.gameName}` : ""} · {t.playerCount}/{t.maxPlayers} oyuncu
              {hasFee ? ` · katılım ${formatTl(t.entryFee)} · ${t.paidCount} ödedi · ${formatTl(t.collected)} toplandı` : " · ücretsiz"}
            </p>
            {t.prizeNote ? <p className="text-xs text-muted-foreground">Ödül: {t.prizeNote}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {registration ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onEdit(t)}>
                  Düzenle
                </Button>
                <Button
                  size="sm"
                  disabled={act.isPending || t.players.length < 2}
                  onClick={() => act.mutate({ kind: "start" })}
                >
                  Başlat
                </Button>
              </>
            ) : null}
            {t.status === "REGISTRATION" || t.status === "RUNNING" ? (
              <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => setConfirmCancel(true)}>
                İptal et
              </Button>
            ) : null}
          </div>
        </div>
        {t.status === "FINISHED" && t.winnerName ? (
          <div className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
            🏆 Kazanan: {t.winnerName}
          </div>
        ) : null}
      </div>

      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Oyuncular</h4>
          {hasFee && t.players.some((p) => !p.paid) ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Tahsilat:
              <Choice<PaymentMethod>
                options={FEE_METHODS.map((m) => ({ value: m, label: PAYMENT_LABELS[m] }))}
                value={payMethod}
                onChange={setPayMethod}
              />
            </div>
          ) : null}
        </div>
        {t.players.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz oyuncu yok.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {t.players.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="font-medium">{p.name}</span>
                  {p.phone ? <span className="ml-2 text-xs text-muted-foreground">{p.phone}</span> : null}
                  {p.customerId != null ? <span className="ml-2 text-xs text-muted-foreground">· kart</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  {hasFee ? (
                    p.paid ? (
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        Ödedi{p.paymentMethod ? ` (${PAYMENT_LABELS[p.paymentMethod]})` : ""}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ kind: "pay", playerId: p.id, method: payMethod })}
                      >
                        Öde · {PAYMENT_LABELS[payMethod]}
                      </Button>
                    )
                  ) : null}
                  {registration ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ kind: "remove", playerId: p.id })}
                    >
                      Çıkar
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        {registration ? (
          full ? (
            <p className="text-xs text-muted-foreground">Turnuva dolu.</p>
          ) : (
            <AddPlayerForm
              key={t.players.length}
              hasFee={hasFee}
              pending={act.isPending}
              onAdd={(payload) => act.mutate({ kind: "add", payload })}
            />
          )
        ) : null}
      </div>

      {rounds.length > 0 ? (
        <div className={`${DASHBOARD_PANEL} space-y-3`}>
          <h4 className="text-sm font-semibold text-foreground">Eşleşmeler</h4>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {rounds.map((round) => (
              <div key={round.round} className="min-w-[220px] flex-1 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{roundLabel(round.round, t.rounds)}</p>
                {round.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    editable={t.status === "RUNNING"}
                    pending={act.isPending}
                    onResult={(winnerPlayerId, score) =>
                      act.mutate({ kind: "result", matchId: match.id, winnerPlayerId, score })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turnuva iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {t.name} iptal olur. Alınan katılım ücretleri kendiliğinden iade edilmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCancel(false);
                act.mutate({ kind: "cancel" });
              }}
            >
              İptal et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddPlayerForm({
  hasFee,
  pending,
  onAdd,
}: {
  hasFee: boolean;
  pending: boolean;
  onAdd: (payload: TournamentPlayerPayload) => void;
}) {
  const [customer, setCustomer] = useState<DeviceCustomer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fee, setFee] = useState<FeeChoice>("LATER");
  const invalid = customer == null && !name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onAdd({
      customerId: customer?.id,
      name: customer ? undefined : name.trim(),
      phone: customer ? undefined : phone.trim() || undefined,
      paymentMethod: hasFee && fee !== "LATER" ? fee : undefined,
    });
  }

  return (
    <form className="space-y-3 border-t border-border pt-3" onSubmit={submit}>
      <Label>Oyuncu ekle</Label>
      <CustomerPicker selected={customer} onSelect={setCustomer} />
      {customer ? null : (
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="Oyuncu adı"
            className="min-w-0 flex-1"
            placeholder="ya da yalnızca ad"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            aria-label="Telefon"
            className="w-40"
            placeholder="Telefon"
            inputMode="tel"
            maxLength={32}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      )}
      {hasFee ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Katılım ücreti</p>
          <Choice<FeeChoice>
            options={[
              { value: "LATER", label: "Sonra" },
              ...FEE_METHODS.map((m) => ({ value: m, label: PAYMENT_LABELS[m] })),
            ]}
            value={fee}
            onChange={setFee}
          />
        </div>
      ) : null}
      <Button type="submit" size="sm" disabled={pending || invalid}>
        Ekle
      </Button>
    </form>
  );
}

function MatchCard({
  match,
  editable,
  pending,
  onResult,
}: {
  match: TournamentMatch;
  editable: boolean;
  pending: boolean;
  onResult: (winnerPlayerId: number, score?: string) => void;
}) {
  const [winner, setWinner] = useState<number | null>(null);
  const [score, setScore] = useState("");
  const canReport = editable && match.ready && match.winnerId == null;
  const slots = [
    { id: match.player1Id ?? null, name: match.player1Name },
    { id: match.player2Id ?? null, name: match.player2Name },
  ];

  return (
    <div className="space-y-1 rounded-md border border-border p-2 text-sm">
      {slots.map((slot, index) => {
        const won = slot.id != null && match.winnerId === slot.id;
        const picked = slot.id != null && winner === slot.id;
        return canReport && slot.id != null ? (
          <button
            key={index}
            type="button"
            className={`flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-muted ${
              picked ? "bg-emerald-100 font-medium dark:bg-emerald-900/40" : ""
            }`}
            onClick={() => setWinner(slot.id)}
          >
            {slot.name ?? "—"}
            {picked ? <span className="text-xs">kazandı</span> : null}
          </button>
        ) : (
          <p
            key={index}
            className={`flex items-center justify-between px-2 py-1 ${won ? "font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            <span>{slot.name ?? (slot.id == null ? "Bekleniyor" : "—")}</span>
            {won ? <span aria-label="Kazanan">✓</span> : null}
          </p>
        );
      })}
      {match.score ? <p className="px-2 text-xs text-muted-foreground">Skor: {match.score}</p> : null}
      {canReport ? (
        <div className="flex gap-2 pt-1">
          <Input
            aria-label="Skor"
            className="h-8 min-w-0 flex-1"
            placeholder="Skor (ör. 3-1)"
            maxLength={40}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || winner == null}
            onClick={() => winner != null && onResult(winner, score.trim() || undefined)}
          >
            Kaydet
          </Button>
        </div>
      ) : null}
    </div>
  );
}
