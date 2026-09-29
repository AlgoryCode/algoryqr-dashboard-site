"use client";

import { useCallback, useState } from "react";
import {
  BarChart3,
  Building2,
  Coffee,
  Compass,
  ConciergeBell,
  Hotel,
  Loader2,
  QrCode,
  Store,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  DEMO_TRIAL_DAYS,
  DEMO_TRIAL_PACKAGE_NAME,
  DEMO_TRIAL_SHORT_LABEL,
} from "@/lib/demo-trial-package";
import {
  BRANCH_COUNT_OPTIONS,
  markDemoSetupDone,
  STAFF_COUNT_OPTIONS,
  type BranchCountBand,
  type StaffCountBand,
} from "@/lib/demo-setup-onboarding";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { cn } from "@/lib/utils";
import {
  BUSINESS_TYPE_OPTIONS,
  USAGE_PURPOSE_OPTIONS,
  type BusinessType,
  type UsagePurpose,
} from "@/lib/welcome-onboarding";

const WIZARD_STEPS = ["business", "purpose", "staff", "branches"] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const WIZARD_COPY: Record<WizardStep, { title: string; hint: string }> = {
  business: {
    title: "İşletmeniz ne tür?",
    hint: "AlgoryQR deneme sürümünü işletmenize göre özelleştirelim.",
  },
  purpose: {
    title: "İş akışınız hangisine daha yakın?",
    hint: "Öncelikli kullanım amacınızı seçin; paneli buna göre yönlendireceğiz.",
  },
  staff: {
    title: "Kaç kişilik bir ekibiniz var?",
    hint: "Personel sayısı rapor ve ekip önerileri için kullanılır (şimdilik yalnızca sizin cihazınızda saklanır).",
  },
  branches: {
    title: "Kaç şubeniz var?",
    hint: "Şube sayısı demo deneyimini işletmenizin ölçeğine göre ayarlar.",
  },
};

const BUSINESS_ICONS = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  hotel: Hotel,
  other: Store,
} as const;

const PURPOSE_ICONS = {
  digital_menu: QrCode,
  waiter_orders: ConciergeBell,
  reports: BarChart3,
  explore_all: Compass,
} as const;

type DemoSetupWizardOverlayProps = {
  userId: number;
  onComplete: () => void;
};

export function DemoSetupWizardOverlay({ userId, onComplete }: DemoSetupWizardOverlayProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("business");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [usagePurpose, setUsagePurpose] = useState<UsagePurpose | null>(null);
  const [staffBand, setStaffBand] = useState<StaffCountBand | null>(null);
  const [branchBand, setBranchBand] = useState<BranchCountBand | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);

  const progressLabel = `${WIZARD_STEPS.indexOf(step) + 1} / ${WIZARD_STEPS.length}`;
  const title = WIZARD_COPY[step].title;
  const hint = WIZARD_COPY[step].hint;

  const finish = useCallback(async () => {
    if (!businessType || !usagePurpose || !staffBand || !branchBand) return;
    setSubmitting(true);
    try {
      await getSiteSameOriginAxios().post("/demo/setup", {
        businessType,
        usagePurpose,
        staffCountBand: staffBand,
        branchCountBand: branchBand,
      });
      markDemoSetupDone(userId, staffBand, branchBand);
      setExiting(true);
      window.setTimeout(onComplete, 320);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Kurulum kaydedilemedi";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [branchBand, businessType, usagePurpose, staffBand, userId, onComplete, toast]);

  return (
    <motion.div
      className="fixed inset-0 z-[10050] flex min-h-svh flex-col overflow-y-auto bg-background/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {DEMO_TRIAL_SHORT_LABEL} · {progressLabel}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{hint}</p>
          <p className="text-xs text-muted-foreground">
            {DEMO_TRIAL_PACKAGE_NAME} · {DEMO_TRIAL_DAYS} gün · Mağaza hazır — son birkaç tercih
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="flex flex-1 flex-col gap-6"
          >
            {step === "business" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {BUSINESS_TYPE_OPTIONS.map((option) => {
                  const Icon = BUSINESS_ICONS[option.id];
                  const selected = businessType === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBusinessType(option.id)}
                      className={cn(
                        DASHBOARD_PANEL,
                        "flex items-start gap-3 text-left transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10"
                          : "hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="mt-0.5 rounded-lg border border-border/60 bg-background p-2">
                        <Icon className="h-4 w-4 text-foreground" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step === "purpose" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {USAGE_PURPOSE_OPTIONS.map((option) => {
                  const Icon = PURPOSE_ICONS[option.id];
                  const selected = usagePurpose === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setUsagePurpose(option.id)}
                      className={cn(
                        DASHBOARD_PANEL,
                        "flex items-start gap-3 text-left transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10"
                          : "hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="mt-0.5 rounded-lg border border-border/60 bg-background p-2">
                        <Icon className="h-4 w-4 text-foreground" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step === "staff" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {STAFF_COUNT_OPTIONS.map((option) => {
                  const selected = staffBand === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStaffBand(option.id)}
                      className={cn(
                        DASHBOARD_PANEL,
                        "flex items-start gap-3 text-left transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10"
                          : "hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="mt-0.5 rounded-lg border border-border/60 bg-background p-2">
                        <Users className="h-4 w-4 text-foreground" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step === "branches" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {BRANCH_COUNT_OPTIONS.map((option) => {
                  const selected = branchBand === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBranchBand(option.id)}
                      className={cn(
                        DASHBOARD_PANEL,
                        "flex items-start gap-3 text-left transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10"
                          : "hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="mt-0.5 rounded-lg border border-border/60 bg-background p-2">
                        <Building2 className="h-4 w-4 text-foreground" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          {step !== "business" ? (
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => {
                const index = WIZARD_STEPS.indexOf(step);
                setStep(WIZARD_STEPS[Math.max(0, index - 1)]);
              }}
            >
              Geri
            </Button>
          ) : (
            <span />
          )}

          {step === "business" ? (
            <Button type="button" disabled={!businessType} onClick={() => setStep("purpose")}>
              Devam
            </Button>
          ) : null}

          {step === "purpose" ? (
            <Button type="button" disabled={!usagePurpose} onClick={() => setStep("staff")}>
              Devam
            </Button>
          ) : null}

          {step === "staff" ? (
            <Button type="button" disabled={!staffBand} onClick={() => setStep("branches")}>
              Devam
            </Button>
          ) : null}

          {step === "branches" ? (
            <Button type="button" disabled={!branchBand || submitting} onClick={() => void finish()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Panele geç"
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
