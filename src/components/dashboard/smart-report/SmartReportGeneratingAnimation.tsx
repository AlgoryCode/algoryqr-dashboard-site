"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const WAIT_STEPS = [
  "Satış ve ziyaret verileri toplanıyor",
  "Yapay zekâ verileri yorumluyor",
  "Öneriler ve rapor hazırlanıyor",
];

/** The "report is being prepared" animation, shared by the create flow and a pending report's page. */
export function SmartReportGeneratingAnimation({ children }: { children?: React.ReactNode }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => (s + 1) % WAIT_STEPS.length), 4_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-14 text-center" aria-live="polite">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:2s]" />
        <span className="absolute inset-2 animate-pulse rounded-full bg-primary/10" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">Raporunuz hazırlanıyor</p>
        <p key={step} className="text-sm text-muted-foreground animate-fade-in">
          {WAIT_STEPS[step]}…
        </p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[smart-report-slide_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Bu birkaç dakika sürebilir. Sayfadan ayrılabilirsiniz; rapor hazır olunca geçmiş raporlarınızda görünür.
      </p>
      {children}
      <style>{`@keyframes smart-report-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
