"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Package,
  Palette,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import {
  DEMO_TRIAL_DAYS,
  DEMO_TRIAL_PACKAGE_NAME,
  DEMO_TRIAL_SHORT_LABEL,
} from "@/lib/demo-trial-package";
import { isDemoStoreReady, waitForDemoStoreReady } from "@/lib/demo-provision-readiness";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "session", label: "Oturum açıldı", detail: "Hesabınız doğrulandı", icon: ShieldCheck },
  { id: "package", label: "Ultimate deneme paketi", detail: DEMO_TRIAL_PACKAGE_NAME, icon: Package },
  { id: "branch", label: "Demo şube", detail: "Algory Demo Şube oluşturuluyor", icon: Building2 },
  { id: "menu", label: "Menü ve tema", detail: "Dijital menü vitrini hazırlanıyor", icon: Palette },
  { id: "catalog", label: "Ürünler ve satışlar", detail: "Örnek ürünler ve rapor verisi", icon: UtensilsCrossed },
] as const;

const MIN_STEP_MS = 650;
/** Panel shell paints first; provisioning UI follows. */
const PROVISION_UI_DELAY_MS = 550;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type DemoProvisioningOverlayProps = {
  onReady: () => void;
};

export function DemoProvisioningOverlay({ onReady }: DemoProvisioningOverlayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const started = useRef(false);

  const runProvision = useCallback(async () => {
    setFailed(null);
    setRunning(true);
    setActiveIndex(0);

    const last = STEPS.length - 1;
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

      onReady();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo kurulumu tamamlanamadı";
      setFailed(message);
      toast({ title: "Kurulum hatası", description: message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [onReady, queryClient, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => setOverlayVisible(true), PROVISION_UI_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runProvision();
  }, [runProvision]);

  if (!overlayVisible) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-[10040] flex min-h-svh flex-col overflow-y-auto bg-background/92 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10 sm:py-14">
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
            Deneme paketi, şube, menü, tema ve örnek ürünler oluşturuluyor. Birkaç saniye sürer; ardından
            kurulum adımlarına geçeceksiniz.
          </p>
        </div>

        <ul className="space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const done = index < activeIndex || (index === activeIndex && !running && !failed);
            const current = index === activeIndex && running;
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

        {failed ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-sm text-destructive">{failed}</p>
            <Button type="button" variant="hero" onClick={() => void runProvision()} disabled={running}>
              {running ? (
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
            {running ? "Lütfen bu pencereyi kapatmayın…" : "Hazır…"}
          </p>
        )}
      </div>
    </motion.div>
  );
}
