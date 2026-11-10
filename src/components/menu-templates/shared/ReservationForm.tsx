"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarCheck, Loader2, Minus, Plus } from "lucide-react";

import { ApiError, createPublicReservationRequest, type MenuReservationCreateBody } from "@/lib/api";
import { cn } from "@/lib/utils";

type ReservationFormProps = {
  publicId: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
};

/** How many days ahead the quick day chips cover; a later date is picked from the calendar input. */
const DAY_CHIPS = 14;
const FIRST_SLOT = 9 * 60;
const LAST_SLOT = 23 * 60 + 30;
const SLOT_STEP = 30;
const MAX_PARTY = 50;

const CHIP =
  "shrink-0 rounded-xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lx-gold,currentColor)]";
const CHIP_IDLE = "border-[var(--lx-border,rgba(127,127,127,0.3))] hover:border-[var(--lx-gold,currentColor)]";
const CHIP_ON =
  "border-[var(--lx-gold,currentColor)] bg-[var(--lx-gold,currentColor)] !text-[color:var(--lx-primary-fg,#fff)] font-medium";

function ymd(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function upcomingDays(now: Date) {
  return Array.from({ length: DAY_CHIPS }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() + index);
    return {
      value: ymd(date),
      top: index === 0 ? "Bugün" : index === 1 ? "Yarın" : date.toLocaleDateString("tr-TR", { weekday: "short" }),
      bottom: date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    };
  });
}

/** Half-hour slots of the day; today's passed slots (plus a 30-minute buffer) are left out. */
function timeSlots(day: string, now: Date) {
  const slots: string[] = [];
  const earliest = day === ymd(now) ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
  for (let minutes = FIRST_SLOT; minutes <= LAST_SLOT; minutes += SLOT_STEP) {
    if (minutes >= earliest) slots.push(hhmm(minutes));
  }
  return slots;
}

function longDate(day: string) {
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? day
    : date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
        <span className="flex size-5 items-center justify-center rounded-full border border-current/30 text-[10px]">{step}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

type Sent = { name: string; day: string; time: string; partySize: number };

export function ReservationForm({ publicId, className, inputClassName, buttonClassName }: ReservationFormProps) {
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => upcomingDays(now), [now]);

  const [day, setDay] = useState(days[0].value);
  const [time, setTime] = useState("");
  const [customTime, setCustomTime] = useState(false);
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  const slots = useMemo(() => timeSlots(day, now), [day, now]);
  const dayInChips = days.some((item) => item.value === day);

  const fieldClass =
    inputClassName ??
    "w-full rounded-xl border border-[var(--lx-border,rgba(127,127,127,0.3))] bg-transparent px-3 py-2.5 text-sm placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--lx-gold,currentColor)]/40";

  const chooseDay = (value: string) => {
    setDay(value);
    // A slot picked for another day may not exist (or be in the past) on this one.
    if (!customTime && !timeSlots(value, now).includes(time)) setTime("");
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    if (!day || !time) return setError("Lütfen gün ve saat seçin.");
    if (new Date(`${day}T${time}:00`).getTime() < Date.now()) return setError("Geçmiş bir saat seçilemez.");
    if (!customerName.trim()) return setError("Ad soyad zorunludur.");
    if (!trimmedPhone && !trimmedEmail) return setError("Size ulaşabilmemiz için telefon veya e-posta girin.");

    const payload: MenuReservationCreateBody = {
      customerName: customerName.trim(),
      phone: trimmedPhone || undefined,
      email: trimmedEmail || undefined,
      partySize,
      reservationAt: `${day}T${time}:00`,
      note: note.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await createPublicReservationRequest(publicId, payload);
      setSent({ name: payload.customerName, day, time, partySize });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitClass =
    buttonClassName ??
    "inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--lx-gold,currentColor)] px-4 text-sm font-semibold !text-[color:var(--lx-primary-fg,#fff)] transition hover:brightness-110 disabled:opacity-60";

  if (sent) {
    return (
      <div className={className ?? "space-y-5 px-4 py-6"} role="status">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--lx-gold,currentColor)]/15 text-[color:var(--lx-gold,currentColor)]">
            <CalendarCheck className="size-7" />
          </span>
          <h2 className="font-display text-2xl font-semibold text-gradient-gold">Talebiniz alındı</h2>
          <p className="max-w-xs text-sm opacity-80">
            İşletme onayladığında rezervasyonunuz kesinleşir. Gerekirse sizinle iletişime geçilecek.
          </p>
        </div>
        <dl className="divide-y divide-[var(--lx-border,rgba(127,127,127,0.3))] rounded-xl border border-[var(--lx-border,rgba(127,127,127,0.3))] text-sm">
          {[
            ["İsim", sent.name],
            ["Gün", longDate(sent.day)],
            ["Saat", sent.time],
            ["Kişi", `${sent.partySize} kişi`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="opacity-70">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setTime("");
            setNote("");
          }}
          className="w-full text-center text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
        >
          Yeni bir rezervasyon yap
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className ?? "space-y-6 px-4 py-5"} noValidate>
      <div>
        <h2 className="font-display text-2xl font-semibold text-gradient-gold">Rezervasyon</h2>
        <p className="mt-1 text-sm opacity-75">Gün, saat ve kişi sayısını seçin; talebiniz işletmeye iletilsin.</p>
      </div>

      <Section step={1} title="Gün">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Gün">
          {days.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={day === item.value}
              onClick={() => chooseDay(item.value)}
              className={cn(CHIP, "flex w-[4.5rem] flex-col items-center gap-0.5 whitespace-nowrap px-1 py-2", day === item.value ? CHIP_ON : CHIP_IDLE)}
            >
              <span className="text-[11px] capitalize opacity-80">{item.top}</span>
              <span className="text-sm font-semibold">{item.bottom}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs opacity-80">
          <span>Daha ileri bir tarih:</span>
          <input
            type="date"
            min={days[0].value}
            value={dayInChips ? "" : day}
            onChange={(event) => event.target.value && chooseDay(event.target.value)}
            className={cn(fieldClass, "w-auto py-1.5 text-xs")}
          />
        </label>
        {!dayInChips ? <p className="text-sm font-medium">{longDate(day)}</p> : null}
      </Section>

      <Section step={2} title="Saat">
        {customTime ? (
          <input
            type="time"
            step={300}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={cn(fieldClass, "w-40")}
            aria-label="Saat"
          />
        ) : slots.length === 0 ? (
          <p className="text-sm opacity-75">Bugün için uygun saat kalmadı, lütfen başka bir gün seçin.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="group" aria-label="Saat">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={time === slot}
                onClick={() => setTime(slot)}
                className={cn(CHIP, "px-0 tabular-nums", time === slot ? CHIP_ON : CHIP_IDLE)}
              >
                {slot}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setCustomTime((value) => !value);
            setTime("");
          }}
          className="text-xs underline underline-offset-4 opacity-75 hover:opacity-100"
        >
          {customTime ? "Hazır saatlerden seç" : "Listede olmayan bir saat gir"}
        </button>
      </Section>

      <Section step={3} title="Kişi sayısı">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPartySize((value) => Math.max(1, value - 1))}
            disabled={partySize <= 1}
            className={cn(CHIP, CHIP_IDLE, "flex size-10 items-center justify-center p-0 disabled:opacity-40")}
            aria-label="Bir kişi azalt"
          >
            <Minus className="size-4" />
          </button>
          <span aria-live="polite" className="w-20 text-center text-lg font-semibold tabular-nums">
            {partySize} kişi
          </span>
          <button
            type="button"
            onClick={() => setPartySize((value) => Math.min(MAX_PARTY, value + 1))}
            disabled={partySize >= MAX_PARTY}
            className={cn(CHIP, CHIP_IDLE, "flex size-10 items-center justify-center p-0 disabled:opacity-40")}
            aria-label="Bir kişi artır"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </Section>

      <Section step={4} title="İletişim">
        <input
          className={fieldClass}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value.slice(0, 120))}
          placeholder="Ad soyad"
          autoComplete="name"
          aria-label="Ad soyad"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="tel"
            inputMode="tel"
            className={fieldClass}
            value={phone}
            onChange={(event) => setPhone(event.target.value.slice(0, 40))}
            placeholder="Telefon"
            autoComplete="tel"
            aria-label="Telefon"
          />
          <input
            type="email"
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value.slice(0, 255))}
            placeholder="E-posta"
            autoComplete="email"
            aria-label="E-posta"
          />
        </div>
        <p className="text-xs opacity-60">Telefon veya e-postadan en az biri yeterli.</p>
      </Section>

      <Section step={5} title="Not (isteğe bağlı)">
        <textarea
          className={cn(fieldClass, "resize-none")}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          placeholder="Örn. doğum günü, pencere kenarı, bebek sandalyesi"
          aria-label="Not"
        />
      </Section>

      {error ? (
        <p role="alert" className="rounded-xl bg-[var(--lx-destructive,#dc2626)]/15 px-3 py-2 text-sm text-[color:var(--lx-destructive,#dc2626)]">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {time ? (
          <p className="text-center text-xs opacity-75">
            {longDate(day)} · {time} · {partySize} kişi
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className={submitClass}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Rezervasyon talebi gönder"}
        </button>
      </div>
    </form>
  );
}
