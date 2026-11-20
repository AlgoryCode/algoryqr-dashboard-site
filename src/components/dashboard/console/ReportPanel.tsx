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
      <div className={`${DASHBOARD_PANEL} flex flex-wrap items-end gap-3`}>
        <div className="space-y-1">
          <Label htmlFor="report-from">Başlangıç</Label>
          <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-to">Bitiş</Label>
          <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Seçilen günlerde biten oturumlar sayılır.</p>
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
                  <TableHead className="text-right">Oturum</TableHead>
                  <TableHead className="text-right">Süre</TableHead>
                  <TableHead>Doluluk</TableHead>
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
                      <TableCell className="text-right tabular-nums">{d.sessions}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(d.playedMinutes)}</TableCell>
                      <TableCell>
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
        </>
      )}
    </div>
  );
}
