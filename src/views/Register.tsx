"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastAction } from "@/components/ui/toast";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth-service";
import { ApiError } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { getGoogleAuthErrorMessage } from "@/lib/google-auth-error";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import {
  buildVerificationLoginUrl,
  persistPendingVerificationEmail,
} from "@/lib/pending-verification";
import { buildGoogleAuthStartUrl, isTrialRegisterIntent } from "@/lib/trial-flow";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

const REGISTER_SUCCESS_DESCRIPTION =
  "Doğrulama kodu e-posta adresinize gönderildi. Girişten önce kodu onaylayın.";

const Register = () => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });

  const isTrialFlow = isTrialRegisterIntent(searchParams.get("intent"));
  const googleAuthHref = buildGoogleAuthStartUrl("register", DASHBOARD_ROUTES.demoRegister);
  const loginHref = "/login";

  useEffect(() => {
    if (isTrialFlow) {
      router.replace(DASHBOARD_ROUTES.demoRegister);
    }
  }, [isTrialFlow, router]);

  useEffect(() => {
    const registered = searchParams.get("registered") === "1";
    const error = searchParams.get("error");
    const message = getGoogleAuthErrorMessage(error);
    if (!registered && !message) return;

    const loginAction = (
      <ToastAction altText="Giriş yap" onClick={() => router.push(loginHref)}>
        Giriş yap
      </ToastAction>
    );

    const show = window.setTimeout(() => {
      if (registered) {
        toast({
          title: "Kayıt başarılı",
          description: REGISTER_SUCCESS_DESCRIPTION,
          variant: "success",
          duration: 10000,
          action: loginAction,
        });
      } else if (message) {
        const isEmailTaken = error === "account_exists" || error === "provider_conflict";
        toast({
          title: isEmailTaken ? "E-posta kullanımda" : "Google ile kayıt başarısız",
          description: message,
          variant: "destructive",
          duration: isEmailTaken ? 10000 : undefined,
          action: isEmailTaken ? loginAction : undefined,
        });
      }
      router.replace("/register");
    }, 0);

    return () => window.clearTimeout(show);
  }, [loginHref, router, searchParams, toast]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password || !form.passwordConfirm) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    if (form.password !== form.passwordConfirm) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await authService.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
      });

      persistPendingVerificationEmail(form.email);
      const verificationHref = buildVerificationLoginUrl(loginHref);

      toast({
        title: "Kayıt başarılı",
        description: REGISTER_SUCCESS_DESCRIPTION,
        variant: "success",
        duration: 10000,
        action: (
          <ToastAction altText="Kodu gir" onClick={() => router.push(verificationHref)}>
            Kodu gir
          </ToastAction>
        ),
      });
      router.push(verificationHref);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast({
          title: "E-posta kullanımda",
          description: "Bu e-posta adresi zaten kayıtlı.",
          variant: "destructive",
          duration: 10000,
          action: (
            <ToastAction altText="Giriş yap" onClick={() => router.push(loginHref)}>
              Giriş yap
            </ToastAction>
          ),
        });
      } else {
        const message = err instanceof ApiError ? err.message : "Kayıt olurken bir hata oluştu";
        toast({ title: "Hata", description: message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative">
      <div className="relative z-10 w-full max-w-md px-4">
        <Link href="/" className="flex items-center justify-center gap-2 mb-10">
          <BrandLogo size="lg" />
          <span className="text-2xl font-bold">
            Algory<span className="text-primary">QR</span>
          </span>
        </Link>

        <div className="glass rounded-2xl p-8 space-y-6 glow-card">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Kayıt Ol</h1>
            <p className="text-sm text-muted-foreground">Ücretli hesabınızı oluşturun</p>
          </div>

          <Button variant="outline" size="lg" className="w-full" asChild>
            <a href={googleAuthHref}>
              <GoogleIcon className="h-5 w-5" />
              Google ile kayıt ol
            </a>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">veya</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">İsim</Label>
                <Input id="firstName" placeholder="Adınız" value={form.firstName} onChange={update("firstName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyisim</Label>
                <Input id="lastName" placeholder="Soyadınız" value={form.lastName} onChange={update("lastName")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEmail">E-posta</Label>
              <Input id="regEmail" type="email" placeholder="ornek@email.com" value={form.email} onChange={update("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPhone">Telefon</Label>
              <Input id="regPhone" type="tel" placeholder="+90 5XX XXX XX XX" value={form.phone} onChange={update("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword">Şifre</Label>
              <Input id="regPassword" type="password" placeholder="••••••••" value={form.password} onChange={update("password")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPasswordConfirm">Şifre Tekrar</Label>
              <Input
                id="regPasswordConfirm"
                type="password"
                placeholder="••••••••"
                value={form.passwordConfirm}
                onChange={update("passwordConfirm")}
              />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href={loginHref} className="text-primary hover:underline font-medium">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
