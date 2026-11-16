"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Gift, Loader2, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";

import { TONES } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  getSmartReportFeedbackRequest,
  getSmartReportQuotaRequest,
  reviseSmartReportRequest,
  saveSmartReportFeedbackRequest,
  type SmartReportDetailLevel,
  type SmartReportFeedbackHelpful,
  type SmartReportFeedbackRequest,
  type SmartReportRecommendationsFit,
} from "@/lib/smart-report";
import { cn } from "@/lib/utils";

const NOTE_MAX = 1000;

const FIT_OPTIONS: { value: SmartReportRecommendationsFit; label: string }[] = [
  { value: "FITS", label: "Uygundu" },
  { value: "PARTLY", label: "Kısmen" },
  { value: "NOT_FIT", label: "Uygun değildi" },
];

const DETAIL_OPTIONS: { value: SmartReportDetailLevel; label: string }[] = [
  { value: "SHORTER", label: "Daha kısa" },
  { value: "SAME", label: "Böyle iyi" },
  { value: "LONGER", label: "Daha detaylı" },
];

const FOCUS_OPTIONS = [
  "Ciro ve satışlar",
  "Sipariş ve kanallar",
  "Ürün ve menü performansı",
  "Personel performansı",
  "Müşteri trafiği",
  "Maliyet ve kârlılık",
];

type Props = {
  jobId: string;
  /** Report section headings, offered as "which parts were unclear?" choices. */
  sectionHeadings?: string[];
};

function errorMessage(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
  return data?.message || data?.detail;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Selected chips take the sidebar nav icon colours; the rest stay neutral.
        selected ? TONES.red : "bg-muted/60 text-muted-foreground hover:bg-muted",
      )}
    >
      {selected ? <Check className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function SmartReportFeedbackCard({ jobId, sectionHeadings = [] }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["smart-reports", "feedback", jobId];

  const feedbackQuery = useQuery({
    queryKey,
    queryFn: () => getSmartReportFeedbackRequest(jobId),
  });

  const quotaQuery = useQuery({
    queryKey: ["smart-reports", "quota"],
    queryFn: getSmartReportQuotaRequest,
  });
  const canEarnBonus = quotaQuery.data?.feedbackBonusAvailable === true;

  const [helpful, setHelpful] = useState<SmartReportFeedbackHelpful | null>(null);
  const [fit, setFit] = useState<SmartReportRecommendationsFit | null>(null);
  const [detail, setDetail] = useState<SmartReportDetailLevel | null>(null);
  const [unclear, setUnclear] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const saved = feedbackQuery.data ?? null;
  const savedHelpful = saved?.helpful === "YES" || saved?.helpful === "NO" ? saved.helpful : null;

  // Reopen the form prefilled with the earlier answer.
  function startEditing() {
    if (saved) {
      setHelpful(savedHelpful);
      setFit(saved.recommendationsFit);
      setDetail(saved.detailLevel);
      setUnclear(saved.unclearSections ?? []);
      setFocus(saved.focusAreas ?? []);
      setNote(saved.note ?? "");
    }
    setEditing(true);
  }

  function buildBody(): SmartReportFeedbackRequest | null {
    if (!helpful) return null;
    const trimmed = note.trim() || null;
    if (helpful === "YES") {
      return { helpful, note: trimmed };
    }
    return {
      helpful,
      recommendationsFit: fit,
      detailLevel: detail,
      unclearSections: unclear,
      focusAreas: focus,
      note: trimmed,
    };
  }

  const saveMutation = useMutation({
    mutationFn: (body: SmartReportFeedbackRequest) => saveSmartReportFeedbackRequest(jobId, body),
    onSuccess: (data) => {
      const earnedNow = Boolean(data.bonusGranted) && !saved?.bonusGranted;
      queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: ["smart-reports", "quota"] });
      setEditing(false);
      toast({
        title: "Teşekkürler!",
        description: earnedNow
          ? "Geri bildiriminiz kaydedildi ve bu hafta için 1 ek rapor hakkı kazandınız."
          : "Geri bildiriminiz kaydedildi.",
      });
    },
    onError: (error) =>
      toast({
        title: "Geri bildirim kaydedilemedi",
        description: errorMessage(error) ?? "Lütfen tekrar deneyin.",
        variant: "destructive",
      }),
  });

  const reviseMutation = useMutation({
    mutationFn: (body: SmartReportFeedbackRequest) => reviseSmartReportRequest(jobId, body),
    onSuccess: (accepted) => {
      void queryClient.invalidateQueries({ queryKey: ["smart-reports"] });
      toast({
        title: "Yeni rapor hazırlanıyor",
        description: "Cevaplarınıza göre güncellenmiş rapor oluşturuluyor.",
      });
      const nextId = accepted.jobId || accepted.processId;
      if (nextId) router.push(DASHBOARD_ROUTES.smartReportDetail(nextId));
    },
    onError: (error) =>
      toast({
        title: "Rapor yeniden oluşturulamadı",
        description: errorMessage(error) ?? "Lütfen tekrar deneyin.",
        variant: "destructive",
      }),
  });

  const busy = saveMutation.isPending || reviseMutation.isPending;

  if (feedbackQuery.isLoading) return null;

  // Already answered: show a compact thank-you with an edit option.
  if (savedHelpful && !editing) {
    return (
      <section className={cn(DASHBOARD_SURFACE, "flex flex-wrap items-center gap-3 px-4 py-3")}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          {savedHelpful === "YES" ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Geri bildiriminiz için teşekkürler</p>
          <p className="truncate text-xs text-muted-foreground">
            {savedHelpful === "YES" ? "Raporu beğendiniz" : "Raporu beğenmediniz"}
            {saved?.bonusGranted ? " · 1 ek rapor hakkı kazandınız" : ""}
            {saved?.note ? ` · “${saved.note}”` : ""}
          </p>
        </div>
        {saved?.revisionJobId ? (
          <Button variant="outline" size="sm" onClick={() => router.push(DASHBOARD_ROUTES.smartReportDetail(saved.revisionJobId!))}>
            Güncellenmiş raporu aç
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={startEditing}>
          Düzenle
        </Button>
      </section>
    );
  }

  const body = buildBody();

  return (
    <section className={cn(DASHBOARD_SURFACE, "space-y-4 p-4")} aria-labelledby="smart-report-feedback-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="smart-report-feedback-title" className="text-base font-semibold text-foreground">
            Bu raporu beğendiniz mi?
          </h2>
          <p className="text-xs text-muted-foreground">Cevabınız sonraki raporları size göre iyileştirmemize yardımcı olur.</p>
          {canEarnBonus && !saved ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#F03245] dark:text-[#FB7185]">
              <Gift className="h-3.5 w-3.5" />
              Geri bildirim verin, bu hafta 1 ek rapor hakkı kazanın.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Raporu beğendiniz mi?">
          <Button
            type="button"
            role="radio"
            aria-checked={helpful === "YES"}
            variant={helpful === "YES" ? "default" : "outline"}
            onClick={() => setHelpful("YES")}
            disabled={busy}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Evet
          </Button>
          <Button
            type="button"
            role="radio"
            aria-checked={helpful === "NO"}
            variant={helpful === "NO" ? "default" : "outline"}
            onClick={() => setHelpful("NO")}
            disabled={busy}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            Hayır
          </Button>
        </div>
      </div>

      {helpful === "NO" ? (
        <div className="space-y-4 border-t border-border pt-4">
          <Question title="Öneriler işletmenize uygun muydu?">
            {FIT_OPTIONS.map((option) => (
              <Chip key={option.value} selected={fit === option.value} onClick={() => setFit(fit === option.value ? null : option.value)}>
                {option.label}
              </Chip>
            ))}
          </Question>

          {sectionHeadings.length > 0 ? (
            <Question title="Anlaşılmayan ya da yetersiz bulduğunuz bölümler hangileri?">
              {sectionHeadings.map((heading) => (
                <Chip key={heading} selected={unclear.includes(heading)} onClick={() => setUnclear(toggle(unclear, heading))}>
                  {heading}
                </Chip>
              ))}
            </Question>
          ) : null}

          <Question title="Raporda nelere daha çok odaklanalım?">
            {FOCUS_OPTIONS.map((option) => (
              <Chip key={option} selected={focus.includes(option)} onClick={() => setFocus(toggle(focus, option))}>
                {option}
              </Chip>
            ))}
          </Question>

          <Question title="Rapor uzunluğu nasıldı?">
            {DETAIL_OPTIONS.map((option) => (
              <Chip key={option.value} selected={detail === option.value} onClick={() => setDetail(detail === option.value ? null : option.value)}>
                {option.label}
              </Chip>
            ))}
          </Question>
        </div>
      ) : null}

      {helpful ? (
        <div className="space-y-2">
          <label htmlFor="smart-report-feedback-note" className="text-sm font-medium text-foreground">
            {helpful === "YES" ? "Yorumunuz" : "Notunuz"}{" "}
            <span className="font-normal text-muted-foreground">(opsiyonel)</span>
          </label>
          <Textarea
            id="smart-report-feedback-note"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              helpful === "YES"
                ? "Raporda en çok neyi faydalı buldunuz?"
                : "Raporda neyi farklı görmek isterdiniz?"
            }
            disabled={busy}
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {note.length}/{NOTE_MAX}
          </p>
        </div>
      ) : null}

      {helpful ? (
        <div className="flex flex-wrap justify-end gap-2">
          {editing ? (
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              Vazgeç
            </Button>
          ) : null}
          {helpful === "NO" ? (
            <Button variant="outline" onClick={() => body && reviseMutation.mutate(body)} disabled={busy || !body}>
              {reviseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Gönder ve raporu yeniden oluştur (1 hak)
            </Button>
          ) : null}
          <Button onClick={() => body && saveMutation.mutate(body)} disabled={busy || !body}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Gönder
          </Button>
        </div>
      ) : null}
    </section>
  );
}
