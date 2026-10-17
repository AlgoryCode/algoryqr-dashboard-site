"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDashed,
  Coffee,
  Compass,
  ConciergeBell,
  Hotel,
  Loader2,
  Package,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/BrandLogo";
import { DemoSetupLogout } from "@/components/dashboard/DemoSetupLogout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  DEMO_TRIAL_DAYS,
  DEMO_TRIAL_PACKAGE_NAME,
  DEMO_TRIAL_SHORT_LABEL,
} from "@/lib/demo-trial-package";
import { listBranchesRequest } from "@/lib/branch";
import { getMyActiveMenusRequest } from "@/lib/api";
import { isDemoStoreReady, waitForDemoStoreReady } from "@/lib/demo-provision-readiness";
import {
  BRANCH_COUNT_OPTIONS,
  isDemoSetupDone,
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

const PROVISION_STEPS = [
  { id: "session", label: "Oturum açıldı", detail: "Hesabınız doğrulandı", icon: ShieldCheck },
  { id: "package", label: "Ultimate deneme paketi", detail: DEMO_TRIAL_PACKAGE_NAME, icon: Package },
  { id: "branch", label: "Demo şube", detail: "Algory Demo Şube oluşturuluyor", icon: Building2 },
  { id: "menu", label: "Menü ve tema", detail: "Dijital menü vitrini hazırlanıyor", icon: Palette },
  { id: "catalog", label: "Ürünler ve satışlar", detail: "Örnek ürünler ve rapor verisi", icon: UtensilsCrossed },
  { id: "tables", label: "Masalar ve alanlar", detail: "Salon düzeni ve masalar hazırlanıyor", icon: ConciergeBell },
  { id: "staff", label: "Demo personel", detail: "Garson ve mutfak hesapları oluşturuluyor", icon: Users },
] as const;

const MIN_STEP_MS = 1200;

const DEMO_AREAS = [
  { name: "İç Salon" },
  { name: "Bahçe" },
  { name: "Teras" },
];

const DEMO_TABLES: Array<{ name: string; tableNumber: number; capacity: number; area: string }> = [
  { name: "Masa 1", tableNumber: 1, capacity: 4, area: "İç Salon" },
  { name: "Masa 2", tableNumber: 2, capacity: 2, area: "İç Salon" },
  { name: "Masa 3", tableNumber: 3, capacity: 6, area: "İç Salon" },
  { name: "Masa 4", tableNumber: 4, capacity: 4, area: "İç Salon" },
  { name: "Masa 5", tableNumber: 5, capacity: 2, area: "İç Salon" },
  { name: "Masa 6", tableNumber: 6, capacity: 4, area: "Bahçe" },
  { name: "Masa 7", tableNumber: 7, capacity: 6, area: "Bahçe" },
  { name: "Masa 8", tableNumber: 8, capacity: 8, area: "Bahçe" },
  { name: "Masa 9", tableNumber: 9, capacity: 4, area: "Teras" },
  { name: "Masa 10", tableNumber: 10, capacity: 2, area: "Teras" },
];

const DEMO_STAFF = [
  { username: "garson1", password: "Demo1234", displayName: "Ahmet Y.", staffRole: "WAITER" as const },
  { username: "garson2", password: "Demo1234", displayName: "Elif K.", staffRole: "WAITER" as const },
  { username: "mutfak1", password: "Demo1234", displayName: "Mehmet C.", staffRole: "KITCHEN" as const },
];

async function seedDemoTablesAndStaff(ax: ReturnType<typeof getSiteSameOriginAxios>) {
  const branchResponse = await listBranchesRequest();
  const branches = branchResponse.content ?? [];
  if (branches.length === 0) return;

  const branch = branches[0];
  const branchId = branch.id;

  const menus = await getMyActiveMenusRequest();
  if (menus.length === 0) return;
  const menuId = menus[0].menuId;

  // Areas
  const existingAreas = await ax
    .get<Array<{ id: number; name: string }>>(`/staff/panel/menu/${menuId}/areas`)
    .then((r) => r.data)
    .catch(() => [] as Array<{ id: number; name: string }>);

  const areaMap = new Map<string, number>();
  for (const a of existingAreas) {
    areaMap.set(a.name, a.id);
  }

  for (const area of DEMO_AREAS) {
    if (areaMap.has(area.name)) continue;
    try {
      const created = await ax.post<{ id: number; name: string }>(
        `/staff/panel/menu/${menuId}/areas`,
        { name: area.name },
      );
      areaMap.set(area.name, created.data.id);
    } catch {
      /* skip */
    }
  }

  // Tables
  const existingTables = await ax
    .get<Array<{ id: number; name: string }>>(`/staff/panel/menu/${menuId}/tables`)
    .then((r) => r.data)
    .catch(() => [] as Array<{ id: number; name: string }>);

  const existingTableNames = new Set(existingTables.map((t) => t.name));

  for (const table of DEMO_TABLES) {
    if (existingTableNames.has(table.name)) continue;
    try {
      await ax.post(`/staff/panel/menu/${menuId}/tables`, {
        name: table.name,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        areaId: areaMap.get(table.area) ?? null,
      });
    } catch {
      /* skip */
    }
  }

  // Staff
  const existingStaff = await ax
    .get<{ waiters?: Array<{ username: string }> } | Array<{ username: string }>>(
      `/staff/panel/branch/${branchId}/staff`,
    )
    .then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.waiters ?? []);
    })
    .catch(() => [] as Array<{ username: string }>);

  const existingUsernames = new Set(existingStaff.map((w) => w.username));

  for (const staff of DEMO_STAFF) {
    if (existingUsernames.has(staff.username)) continue;
    try {
      await ax.post(`/staff/panel/branch/${branchId}/staff`, staff);
    } catch {
      /* skip */
    }
  }
}

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

type Phase = "provisioning" | "wizard";
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
    hint: "Personel sayısı rapor ve ekip önerileri için kullanılır.",
  },
  branches: {
    title: "Kaç şubeniz var?",
    hint: "Şube sayısı demo deneyimini işletmenizin ölçeğine göre ayarlar.",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function DemoSetupPageClient({ userId }: { userId: number | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("provisioning");

  // ── Provisioning state ───
  const [activeIndex, setActiveIndex] = useState(0);
  const [provisionFailed, setProvisionFailed] = useState<string | null>(null);
  const [provisionRunning, setProvisionRunning] = useState(false);
  const provisionStarted = useRef(false);

  // ── Wizard state ───
  const [wizardStep, setWizardStep] = useState<WizardStep>("business");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [usagePurpose, setUsagePurpose] = useState<UsagePurpose | null>(null);
  const [staffBand, setStaffBand] = useState<StaffCountBand | null>(null);
  const [branchBand, setBranchBand] = useState<BranchCountBand | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Provisioning logic ───
  const runProvision = useCallback(async () => {
    setProvisionFailed(null);
    setProvisionRunning(true);
    setActiveIndex(0);

    const last = PROVISION_STEPS.length - 1;
    let stopped = false;

    const workPromise = (async () => {
      const alreadyReady = await isDemoStoreReady();
      if (!alreadyReady) {
        await getSiteSameOriginAxios().post("/auth/demo/provision", {}, { timeout: 120_000 });
        const ready = await waitForDemoStoreReady(90_000);
        if (!ready) {
          throw new ApiError(504, "Mağaza verisi zaman aşımına uğradı. Lütfen tekrar deneyin.");
        }
      }

      if (alreadyReady) {
        setPhase("wizard");
      }

      try {
        await seedDemoTablesAndStaff(getSiteSameOriginAxios());
      } catch {
        /* non-critical */
      }

      await queryClient.invalidateQueries({ queryKey: ["demoAccount"] });
      await queryClient.invalidateQueries({ queryKey: ["accessSession"] });
    })().catch((err: unknown) => {
      stopped = true;
      throw err;
    });

    const settled = workPromise.then(
      () => ({ ok: true as const }),
      (err: unknown) => ({ ok: false as const, err }),
    );

    try {
      for (let index = 0; index < last; index += 1) {
        if (stopped) break;
        setActiveIndex(index);
        await sleep(MIN_STEP_MS);
        if (stopped) break;
      }

      if (!stopped) {
        setActiveIndex(last);
      }

      const result = await settled;
      if (!result.ok) {
        throw result.err;
      }

      setPhase("wizard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo kurulumu tamamlanamadı";
      setProvisionFailed(message);
      toast({ title: "Kurulum hatası", description: message, variant: "destructive" });
    } finally {
      setProvisionRunning(false);
    }
  }, [queryClient, toast]);

  useEffect(() => {
    let cancelled = false;
    const startProvision = () => {
      if (provisionStarted.current) return;
      provisionStarted.current = true;
      void runProvision();
    };

    const resume = async () => {
      if (!isDemoSetupDone(userId)) {
        startProvision();
        return;
      }

      try {
        await getSiteSameOriginAxios().post("/auth/demo/ack-setup");
        if (!cancelled) {
          router.replace(DASHBOARD_ROUTES.root);
          router.refresh();
        }
      } catch {
        // A stale local marker must not create a redirect loop if the server cookie is gone.
        startProvision();
      }
    };

    void resume();
    return () => {
      cancelled = true;
    };
  }, [router, runProvision, userId]);

  // ── Wizard finish ───
  const finishWizard = useCallback(async () => {
    if (!businessType || !usagePurpose || !staffBand || !branchBand) return;
    setSubmitting(true);
    try {
      await getSiteSameOriginAxios().post("/demo/setup", {
        businessType,
        usagePurpose,
        staffCountBand: staffBand,
        branchCountBand: branchBand,
      });
      if (userId != null) {
        markDemoSetupDone(userId, staffBand, branchBand);
      }
      await getSiteSameOriginAxios().post("/auth/demo/ack-setup").catch(() => undefined);
      toast({ title: "Hazır!", description: "Panele yönlendiriliyorsunuz…", variant: "success" });
      router.push(DASHBOARD_ROUTES.overview);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Kurulum kaydedilemedi";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [branchBand, businessType, usagePurpose, staffBand, userId, router, toast]);

  // ── Render ───
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 flex justify-end bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <DemoSetupLogout />
      </header>
      <AnimatePresence mode="wait">
        {phase === "provisioning" ? (
          <motion.div
            key="provisioning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col"
          >
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 pb-10 pt-4 sm:pb-14">
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <BrandLogo className="h-9" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {DEMO_TRIAL_SHORT_LABEL} · {DEMO_TRIAL_DAYS} gün
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Deneme ortamınız hazırlanıyor
                </h1>
                <p className="text-sm text-muted-foreground">
                  Deneme paketi, şube, menü, tema ve örnek ürünler oluşturuluyor. Birkaç saniye sürer;
                  ardından kurulum adımlarına geçeceksiniz.
                </p>
              </div>

              <ul className="space-y-3">
                {PROVISION_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const done = index < activeIndex || (index === activeIndex && !provisionRunning && !provisionFailed);
                  const current = index === activeIndex && provisionRunning;
                  const pending = index > activeIndex;
                  return (
                    <motion.li
                      key={step.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                        current && "border-primary/40 bg-primary/5",
                        done && "border-border/60 bg-muted/30",
                        pending && "border-border/40 opacity-70",
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : current ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <CircleDashed className="h-5 w-5 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {step.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{step.detail}</span>
                      </span>
                    </motion.li>
                  );
                })}
              </ul>

              {provisionFailed ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-center text-sm text-destructive">{provisionFailed}</p>
                  <Button type="button" variant="hero" onClick={() => void runProvision()} disabled={provisionRunning}>
                    {provisionRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Yeniden deneniyor…
                      </>
                    ) : (
                      "Tekrar dene"
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  {provisionRunning ? "Lütfen bu pencereyi kapatmayın…" : "Hazır…"}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-8 pt-4 sm:pb-12">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {DEMO_TRIAL_SHORT_LABEL} · {WIZARD_STEPS.indexOf(wizardStep) + 1} / {WIZARD_STEPS.length}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {WIZARD_COPY[wizardStep].title}
                </h1>
                <p className="text-sm text-muted-foreground">{WIZARD_COPY[wizardStep].hint}</p>
                <p className="text-xs text-muted-foreground">
                  {DEMO_TRIAL_PACKAGE_NAME} · {DEMO_TRIAL_DAYS} gün · Mağaza hazır — son birkaç tercih
                </p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-1 flex-col gap-6"
                >
                  {wizardStep === "business" ? (
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
                              selected ? "border-primary/40 bg-primary/10" : "hover:border-border hover:bg-muted/40",
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

                  {wizardStep === "purpose" ? (
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
                              selected ? "border-primary/40 bg-primary/10" : "hover:border-border hover:bg-muted/40",
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

                  {wizardStep === "staff" ? (
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
                              selected ? "border-primary/40 bg-primary/10" : "hover:border-border hover:bg-muted/40",
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

                  {wizardStep === "branches" ? (
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
                              selected ? "border-primary/40 bg-primary/10" : "hover:border-border hover:bg-muted/40",
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
                {wizardStep !== "business" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => {
                      const index = WIZARD_STEPS.indexOf(wizardStep);
                      setWizardStep(WIZARD_STEPS[Math.max(0, index - 1)]);
                    }}
                  >
                    Geri
                  </Button>
                ) : (
                  <span />
                )}

                {wizardStep === "business" ? (
                  <Button type="button" disabled={!businessType} onClick={() => setWizardStep("purpose")}>
                    Devam
                  </Button>
                ) : null}

                {wizardStep === "purpose" ? (
                  <Button type="button" disabled={!usagePurpose} onClick={() => setWizardStep("staff")}>
                    Devam
                  </Button>
                ) : null}

                {wizardStep === "staff" ? (
                  <Button type="button" disabled={!staffBand} onClick={() => setWizardStep("branches")}>
                    Devam
                  </Button>
                ) : null}

                {wizardStep === "branches" ? (
                  <Button
                    type="button"
                    disabled={!branchBand || submitting}
                    onClick={() => void finishWizard()}
                  >
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
        )}
      </AnimatePresence>
    </div>
  );
}
