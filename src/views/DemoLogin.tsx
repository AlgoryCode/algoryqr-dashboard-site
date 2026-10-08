"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MY_PROFILE_QUERY_KEY } from "@/hooks/use-my-profile";
import { SESSION_CONTEXT_QUERY_KEY } from "@/hooks/use-session-context";
import { ApiError } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  DEMO_TRIAL_DAYS,
  DEMO_TRIAL_PACKAGE_NAME,
  DEMO_TRIAL_SHORT_LABEL,
} from "@/lib/demo-trial-package";
import { loadPackageAccess } from "@/lib/load-package-access";
import { fetchSessionContextClient, pathForSession } from "@/lib/session-context";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

const DemoLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const registeredToastShown = useRef(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const registeredUsername = searchParams.get("username")?.trim();
    if (registeredUsername) {
      setUsername(registeredUsername);
    }
    if (registeredToastShown.current || searchParams.get("demoRegistered") !== "1") {
      return;
    }
    registeredToastShown.current = true;
    toast({
      title: "Kayıt tamam",
      description: "Kullanıcı adınız ve şifrenizle giriş yapın.",
    });
    router.replace(registeredUsername ? `/demo/login?username=${encodeURIComponent(registeredUsername)}` : "/demo/login");
  }, [router, searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: "Hata", description: "Kullanıcı adı ve şifre gerekli.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await getSiteSameOriginAxios().post<{ userId?: number }>("/auth/demo/login", {
        username: username.trim(),
        password,
      });
      queryClient.removeQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ["demoAccount"] });
      await loadPackageAccess(true, data.userId);
      const session = await fetchSessionContextClient(data.userId);
      if (session) {
        queryClient.setQueryData(SESSION_CONTEXT_QUERY_KEY, session);
      }
      toast({ title: "Başarılı", description: "Demo girişi yapıldı." });
      router.push(pathForSession(session, DASHBOARD_ROUTES.overview));
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo giriş başarısız";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href={DASHBOARD_ROUTES.demoLanding} className="inline-flex justify-center">
            <BrandLogo className="h-10" />
          </Link>
          <h1 className="text-2xl font-bold">{DEMO_TRIAL_SHORT_LABEL} · giriş</h1>
          <p className="text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">{DEMO_TRIAL_PACKAGE_NAME}</strong> ({DEMO_TRIAL_DAYS} gün).
            Paket yoksa girişte atanır. Süresi dolmuş deneme paketi yeniden açılmaz.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-login-username">Kullanıcı adı</Label>
            <Input
              id="demo-login-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-login-password">Şifre</Label>
            <Input
              id="demo-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş yap"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground space-y-1">
          <span className="block">
            Hesabınız yok mu?{" "}
            <Link href={DASHBOARD_ROUTES.demoRegister} className="text-primary hover:underline font-medium">
              Demo kayıt
            </Link>
          </span>
          <span className="block">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Üye girişi
            </Link>
          </span>
        </p>
      </div>
    </div>
  );
};

export default DemoLogin;
