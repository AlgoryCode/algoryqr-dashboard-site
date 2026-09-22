"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Coffee,
  Compass,
  Hotel,
  Loader2,
  MailCheck,
  QrCode,
  Sparkles,
  Store,
  UtensilsCrossed,
  ConciergeBell,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import {
  invalidateDigitalMenuTrial,
  startTrialRequest,
  useAccessSession,
  useEligibleTrialPackages,
} from "@/hooks/use-commerce";
import { useSubscription } from "@/hooks/use-subscription";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { ApiError } from "@/lib/api";
import { isActivePaidPurchase } from "@/lib/product-access";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { formatPackageDate } from "@/lib/package-display";
import { refreshAccessAfterEntitlementChange } from "@/lib/refresh-access";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";
import {
  clearPersistedTrialIntent,
  DEFAULT_TRIAL_PACKAGE,
  readPersistedTrialPackage,
  readTrialPackageFromSearch,
  resolveTrialPackageId,
  TRIAL_DAYS,
} from "@/lib/trial-flow";
import {
  BUSINESS_TYPE_OPTIONS,
  USAGE_PURPOSE_OPTIONS,
  type BusinessType,
  type UsagePurpose,
} from "@/lib/welcome-onboarding";

const REDIRECT_DELAY_MS = 4000;

type HubPhase = "loading" | "wizard" | "starting" | "blocked";
type WizardStep = "business" | "purpose" | "start";

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

export default function TrialStartView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const handledRef = useRef(false);

  const packageCode = useMemo(() => {
    const fromQuery = readTrialPackageFromSearch(searchParams, readPersistedTrialPackage());
    return fromQuery || DEFAULT_TRIAL_PACKAGE;
  }, [searchParams]);

  const trialStatus = useAccessSession();
  const subscription = useSubscription();
  const packagesQuery = useEligibleTrialPackages();
  const verification = searchParams.get("verification");

  const [phase, setPhase] = useState<HubPhase>("loading");
  const [step, setStep] = useState<WizardStep>("business");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [usagePurpose, setUsagePurpose] = useState<UsagePurpose | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    void getSiteSameOriginAxios()
      .get<{ verified: boolean }>("/account/email-verification/status")
      .then(({ data }) => setEmailVerified(data.verified))
      .catch(() => setEmailVerified(null));
  }, []);

  const packages = packagesQuery.data ?? [];
  const packageId = useMemo(
    () => resolveTrialPackageId(packages, packageCode),
    [packages, packageCode],
  );
  const trialPackage = useMemo(
    () => packages.find((pkg) => pkg.id === packageId) ?? null,
    [packages, packageId],
  );

  const activePaidPurchase = useMemo(
    () =>
      isActivePaidPurchase(subscription.data?.activePurchase ?? null)
        ? subscription.data?.activePurchase ?? null
        : null,
    [subscription.data?.activePurchase],
  );

  useEffect(() => {
    clearPersistedTrialIntent();
  }, []);

  useEffect(() => {
    if (verification !== "success") return;
    void invalidateDigitalMenuTrial(queryClient);
  }, [queryClient, verification]);

  useEffect(() => {
    if (handledRef.current) return;
    if (trialStatus.isLoading || subscription.isLoading || packagesQuery.isLoading || emailVerified === null) {
      return;
    }

    if (trialStatus.isError || packagesQuery.isError) {
      setPhase("blocked");
      return;
    }

    if (packageId == null) {
      handledRef.current = true;
      notify("danger", "Deneme paketi bulunamadı.");
      window.setTimeout(() => router.replace(DASHBOARD_ROUTES.accountPackages), REDIRECT_DELAY_MS);
      setPhase("blocked");
      return;
    }

    if (activePaidPurchase) {
      handledRef.current = true;
      notify("warning", "Aktif paketiniz bulunmaktadır.");
      window.setTimeout(() => router.replace(DASHBOARD_ROUTES.overview), REDIRECT_DELAY_MS);
      setPhase("blocked");
      return;
    }

    const decision = trialStatus.data?.decision;

    if (decision === "REQUIRE_PURCHASE" || decision === "REQUIRE_PAYMENT") {
      handledRef.current = true;
      router.replace(DASHBOARD_ROUTES.accountPackages);
      setPhase("blocked");
      return;
    }

    if (decision === "ALLOW") {
      handledRef.current = true;
      router.replace(DASHBOARD_ROUTES.overview);
      setPhase("blocked");
      return;
    }

    setPhase("wizard");
  }, [
    activePaidPurchase,
    notify,
    packageId,
    packagesQuery.isError,
    packagesQuery.isLoading,
    emailVerified,
    router,
    subscription.isLoading,
    trialStatus.data?.decision,
    trialStatus.isError,
    trialStatus.isLoading,
  ]);

  const handleStartTrial = async () => {
    if (packageId == null || phase !== "wizard" || step !== "start") return;
    if (!businessType || !usagePurpose || emailVerified !== true) return;
    setPhase("starting");
    try {
      const started = await startTrialRequest({
        packageId,
        businessType,
        usagePurpose,
      });
      await refreshAccessAfterEntitlementChange(queryClient);
      await invalidateDigitalMenuTrial(queryClient);
      notify(
        "info",
        `${trialPackage?.name ?? "Ultimate"} denemeniz başlatıldı` +
          (started?.endsAt ? ` · bitiş: ${formatPackageDate(started.endsAt)}` : "") +
          ".",
      );
      router.replace(DASHBOARD_ROUTES.overview);
    } catch (error) {
      setPhase("wizard");
      const message = error instanceof ApiError ? error.message : "Deneme süresi başlatılamadı.";
      if (/penceresi|deneme hakki|deneme hakk/i.test(message)) {
        router.replace(DASHBOARD_ROUTES.accountPackages);
        return;
      }
      if (/ucretli paket|ücretli paket/i.test(message)) {
        notify("warning", "Aktif paketiniz bulunmaktadır.");
        window.setTimeout(() => router.replace(DASHBOARD_ROUTES.overview), REDIRECT_DELAY_MS);
        return;
      }
      notify("danger", message);
    }
  };

  const sendVerificationCode = async () => {
    setEmailSending(true);
    setEmailError(null);
    try {
      await getSiteSameOriginAxios().post("/account/email-verification/request-code", {});
      notify("info", "Doğrulama kodu e-posta adresinize gönderildi.");
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Kod gönderilemedi.");
    } finally {
      setEmailSending(false);
    }
  };

  const verifyEmail = async () => {
    setEmailSending(true);
    setEmailError(null);
    try {
      await getSiteSameOriginAxios().post("/account/email-verification/verify", { code: emailCode });
      setEmailVerified(true);
      notify("info", "E-posta adresiniz doğrulandı.");
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Kod doğrulanamadı.");
    } finally {
      setEmailSending(false);
    }
  };

  const progressLabel = step === "business" ? "1 / 3" : step === "purpose" ? "2 / 3" : "3 / 3";
  const title =
    step === "business"
      ? "İşletmeniz ne tür?"
      : step === "purpose"
        ? "Uygulamayı ne için kullanacaksınız?"
        : "Deneme sürümünü başlatın";
  const hint =
    step === "business"
      ? "Size uygun öneriler için bir işletme tipi seçin."
      : step === "purpose"
        ? "Öncelikli kullanım amacınızı seçin."
        : `${trialPackage?.name ?? "Ultimate Deneme"} paketini ${TRIAL_DAYS} gün ücretsiz kullanın.`;

  if (phase === "loading" || phase === "blocked") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 animate-fade-in">
        <DashboardLoadingState label="Kurulum hazırlanıyor…" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-svh flex-col overflow-y-auto bg-background animate-fade-in">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Kurulum · {progressLabel}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{hint}</p>
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

            {step === "start" ? (
              <div className="space-y-4">
                <div className={`${DASHBOARD_PANEL} border-primary/35 bg-gradient-to-b from-primary/12 via-primary/6 to-transparent`}>
                  <p className="text-sm font-medium text-foreground">
                    {trialPackage?.name ?? "Ultimate Deneme"} · {TRIAL_DAYS} gün ücretsiz
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deneme süresince dijital menü, garson paneli ve raporlamayı kullanabilirsiniz.
                  </p>
                </div>

                {emailVerified !== true ? (
                  <div className={`${DASHBOARD_PANEL} space-y-3`}>
                    <div className="flex items-center gap-2 font-medium">
                      <MailCheck className="h-4 w-4" /> E-posta doğrulaması gerekli
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Denemeyi başlatmak için e-posta adresinize gelen 6 haneli kodu girin.
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                        value={emailCode}
                        onChange={(event) => setEmailCode(event.target.value)}
                        placeholder="6 haneli kod"
                        maxLength={6}
                      />
                      <Button
                        variant="outline"
                        onClick={() => void verifyEmail()}
                        disabled={emailSending || emailCode.length !== 6}
                      >
                        Doğrula
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void sendVerificationCode()}
                      disabled={emailSending}
                    >
                      Kodu tekrar gönder
                    </Button>
                    {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
          {step === "purpose" ? (
            <Button variant="outline" onClick={() => setStep("business")}>
              Geri
            </Button>
          ) : null}
          {step === "start" ? (
            <Button variant="outline" onClick={() => setStep("purpose")}>
              Geri
            </Button>
          ) : null}
          {step === "business" ? (
            <Button
              variant="hero"
              disabled={!businessType}
              onClick={() => setStep("purpose")}
            >
              Devam
            </Button>
          ) : null}
          {step === "purpose" ? (
            <Button
              variant="hero"
              disabled={!usagePurpose}
              onClick={() => setStep("start")}
            >
              Devam
            </Button>
          ) : null}
          {step === "start" ? (
            <Button
              variant="hero"
              size="lg"
              className="gap-2"
              disabled={phase === "starting" || emailVerified !== true}
              onClick={() => void handleStartTrial()}
            >
              {phase === "starting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Başlatılıyor…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Deneme sürümünü başlat
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
