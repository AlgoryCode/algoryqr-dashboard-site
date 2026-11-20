"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEVICE_TYPE_LABELS,
  PAYMENT_LABELS,
  formatDuration,
  formatTl,
  getProfitability,
  getReport,
  isoDay,
  toNumber,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={DASHBOARD_PANEL}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ReportPanel({ branchId }: { branchId: number }) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const [from, setFrom] = useState(isoDay(weekAgo));
  const [to, setTo] = useState(isoDay(today));

  const report = useQuery({
    queryKey: ["console-report", branchId, from, to],
    queryFn: () => getReport(branchId, from, to),
    enabled: Boolean(from && to),
  });
  const data = report.data;
  const maxHour = Math.max(1, ...(data?.hours ?? []).map((h) => h.playedMinutes));

  return (
    <div className="space-y-4">
      <div className={`${DASHBOARD_PANEL} grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap`}>
        <div className="min-w-0 space-y-1">
          <Label htmlFor="report-from">Başlangıç</Label>
          <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor="report-to">Bitiş</Label>
          <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="col-span-2 text-xs text-muted-foreground">Seçilen günlerde biten oturumlar sayılır.</p>
      </div>

      {report.isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Ciro"
              value={formatTl(data.revenue)}
              hint={`Süre ${formatTl(data.timeRevenue)} · Ürün ${formatTl(data.itemsRevenue)}`}
            />
            <Tile label="Oturum" value={String(data.sessions)} hint={`Ort. ${formatTl(data.averageSessionAmount)}`} />
            <Tile
              label="Oynanan süre"
              value={formatDuration(data.playedMinutes)}
              hint={`Ort. ${formatDuration(toNumber(data.averageSessionMinutes))} / oturum`}
            />
            <Tile
              label="Doluluk"
              value={`%${toNumber(data.occupancyPercent).toLocaleString("tr-TR")}`}
              hint={toNumber(data.discounts) > 0 ? `İndirim ${formatTl(data.discounts)}` : "Tüm cihazlar, günün tamamı"}
            />
          </div>

          <div className={DASHBOARD_PANEL}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Cihazlar</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cihaz</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Oturum</TableHead>
                  <TableHead className="text-right">Süre</TableHead>
                  <TableHead className="hidden md:table-cell">Doluluk</TableHead>
                  <TableHead className="text-right">Ciro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.devices.map((d) => {
                  const occupancy = Math.min(100, toNumber(d.occupancyPercent));
                  return (
                    <TableRow key={d.consoleId}>
                      <TableCell>
                        <span className="font-medium">{d.consoleName ?? `#${d.consoleId}`}</span>
                        {d.deviceType ? (
                          <span className="ml-2 text-xs text-muted-foreground">{DEVICE_TYPE_LABELS[d.deviceType]}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right tabular-nums">{d.sessions}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(d.playedMinutes)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${occupancy}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">%{occupancy.toLocaleString("tr-TR")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatTl(d.revenue)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className={DASHBOARD_PANEL}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Saatlere göre oynanan süre</h3>
              <div className="flex h-40 items-end gap-1" role="img" aria-label="Saatlere göre oynanan süre">
                {data.hours.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-violet-500/80"
                      style={{ height: `${(h.playedMinutes / maxHour) * 100}%` }}
                      title={`${String(h.hour).padStart(2, "0")}:00 · ${formatDuration(h.playedMinutes)} · ${h.sessionsStarted} oturum`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>23</span>
              </div>
            </div>
            <div className={DASHBOARD_PANEL}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Ödeme yöntemleri</h3>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ödeme yok.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.payments.map((p) => (
                    <li key={p.paymentMethod} className="flex justify-between">
                      <span>
                        {PAYMENT_LABELS[p.paymentMethod]} <span className="text-xs text-muted-foreground">({p.sessions})</span>
                      </span>
                      <span className="tabular-nums">{formatTl(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {data.games.length > 0 ? (
            <div className={DASHBOARD_PANEL}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Oyunlar</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oyun</TableHead>
                    <TableHead className="text-right">Oturum</TableHead>
                    <TableHead className="text-right">Süre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.games.map((g, index) => (
                    <TableRow key={g.gameId ?? `none-${index}`}>
                      <TableCell className="font-medium">{g.gameName ?? "Seçilmedi"}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.sessions}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(g.playedMinutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </>
      )}

      <ProfitabilitySection branchId={branchId} />
    </div>
  );
}

function ProfitabilitySection({ branchId }: { branchId: number }) {
  const profit = useQuery({
    queryKey: ["console-profitability", branchId],
    queryFn: () => getProfitability(branchId),
  });
  const data = profit.data;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Kârlılık</h3>
        <p className="text-xs text-muted-foreground">
          Cihaz başına tüm zamanların cirosu, bakım ve masrafları. Geri ödeme: (ciro − masraf) / alış fiyatı. Tahmin son 30
          günün cirosuna göredir.
        </p>
      </div>
      {!data ? (
        <p className="text-sm text-muted-foreground">{profit.isError ? "Kârlılık yüklenemedi." : "Yükleniyor…"}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Alış maliyeti" value={formatTl(data.purchaseCost)} />
            <Tile label="Ciro" value={formatTl(data.revenue)} />
            <Tile label="Bakım ve masraf" value={formatTl(data.maintenanceCost)} />
            <Tile label="Net" value={formatTl(data.net)} hint="Ciro − masraf − alış" />
          </div>
          <div className={DASHBOARD_PANEL}>
            {data.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cihaz yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cihaz</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Alış</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Ciro</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Masraf</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Geri ödeme</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Tahmini kalan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.devices.map((d) => {
                    const hasCost = toNumber(d.purchaseCost) > 0;
                    const percent = toNumber(d.paybackPercent);
                    const bar = Math.max(0, Math.min(100, percent));
                    const net = toNumber(d.net);
                    return (
                      <TableRow key={d.consoleId}>
                        <TableCell>
                          <span className="font-medium">{d.consoleName ?? `#${d.consoleId}`}</span>
                          {d.deviceType ? (
                            <span className="ml-2 text-xs text-muted-foreground">{DEVICE_TYPE_LABELS[d.deviceType]}</span>
                          ) : null}
                          {d.purchasedOn ? (
                            <span className="block text-xs text-muted-foreground">
                              {d.purchasedOn.split("-").reverse().join(".")} alındı · {formatDuration(d.playedMinutes)} oynandı
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">{hasCost ? formatTl(d.purchaseCost) : "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">{formatTl(d.revenue)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">
                          {toNumber(d.maintenanceCost) > 0 ? formatTl(d.maintenanceCost) : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums ${net < 0 ? "text-red-600" : ""}`}>
                          {formatTl(d.net)}
                        </TableCell>
                        <TableCell>
                          {hasCost ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full ${d.paidBack ? "bg-emerald-500" : "bg-violet-500"}`}
                                  style={{ width: `${bar}%` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                %{percent.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Alış fiyatı yok</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right text-xs tabular-nums">
                          {d.paidBack
                            ? "Kendini ödedi"
                            : d.estimatedPaybackDays != null
                              ? `~${d.estimatedPaybackDays} gün`
                              : hasCost
                                ? "Tahmin yok"
                                : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
