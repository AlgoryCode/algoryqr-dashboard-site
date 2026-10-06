import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth-service";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { ApiError, getApiErrorCode } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { MY_PROFILE_QUERY_KEY } from "@/hooks/use-my-profile";
import { getGoogleAuthErrorMessage } from "@/lib/google-auth-error";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import {
  buildGoogleAuthStartUrl,
  resolveSafeReturnUrl,
} from "@/lib/trial-flow";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { clearPackageAccess, loadPackageAccess } from "@/lib/load-package-access";
import { fetchSessionContextClient, pathForSession } from "@/lib/session-context";
import { SESSION_CONTEXT_QUERY_KEY } from "@/hooks/use-session-context";
import {
  clearPendingVerificationEmail,
  isVerifyIntent,
  readPendingVerificationEmail,
  VERIFY_INTENT_PARAM,
} from "@/lib/pending-verification";
const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaiting2FA, setAwaiting2FA] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [twoFactorHintEmail, setTwoFactorHintEmail] = useState<string | null>(null);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const demoRegisteredToastShown = useRef(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const returnPath = useMemo(
    () => resolveSafeReturnUrl(searchParams.get("returnUrl")),
    [searchParams],
  );
  const googleAuthHref = buildGoogleAuthStartUrl("login", returnPath);
  const registerHref = "/register";

  const redirectAfterAuth = async (userId?: number) => {
    await loadPackageAccess(true, userId);
    const session = await fetchSessionContextClient(userId);
    if (session) {
      queryClient.setQueryData(SESSION_CONTEXT_QUERY_KEY, session);
    }
    router.push(pathForSession(session, returnPath));
    router.refresh();
  };

  useEffect(() => {
    const error = searchParams.get("error");
    const message = getGoogleAuthErrorMessage(error);
    if (!message) return;
    const show = window.setTimeout(() => {
      toast({ title: "Google ile giriş başarısız", description: message, variant: "destructive" });
      const next = returnPath ? `/login?returnUrl=${encodeURIComponent(returnPath)}` : "/login";
      router.replace(next);
    }, 0);
    return () => window.clearTimeout(show);
  }, [returnPath, router, searchParams, toast]);

  useEffect(() => {
    if (demoRegisteredToastShown.current) return;
    if (searchParams.get("demoRegistered") !== "1") return;
    demoRegisteredToastShown.current = true;
    const registeredUsername = searchParams.get("username")?.trim();
    if (registeredUsername) {
      setEmail(registeredUsername);
    }
    toast({
      title: "Kayıt tamam",
      description: "Kullanıcı adınız ve şifrenizle giriş yapın; panelde hazırlık animasyonu ve kurulum adımları sizi bekliyor.",
    });
    const cleanParams = new URLSearchParams();
    if (returnPath && returnPath !== "/") {
      cleanParams.set("returnUrl", returnPath);
    }
    const next = cleanParams.toString() ? `/login?${cleanParams.toString()}` : "/login";
    router.replace(next);
  }, [returnPath, router, searchParams, toast]);

  useEffect(() => {
    let cancelled = false;
    getSiteSameOriginAxios()
      .get<{ enabled?: boolean }>("/auth/demo-account")
      .then((response) => {
        if (!cancelled) setDemoAvailable(response.data?.enabled === true);
      })
      .catch(() => {
        if (!cancelled) setDemoAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isVerifyIntent(searchParams.get(VERIFY_INTENT_PARAM))) return;
    const pendingEmail = readPendingVerificationEmail();
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
    setAwaitingEmailVerification(true);
  }, [searchParams]);

  const cancelTwoFactor = async () => {
    clearPackageAccess();
    await getSiteSameOriginAxios().post("/auth/logout", {}).catch(() => undefined);
    setAwaiting2FA(false);
    setTotpCode("");
    setTwoFactorHintEmail(null);
  };

  const cancelEmailVerification = () => {
    setAwaitingEmailVerification(false);
    setEmailCode("");
    clearPendingVerificationEmail();
  };

  const finishLogin = async (data: Awaited<ReturnType<typeof authService.login>>) => {
    if (data.requiresTwoFactor) {
      setTwoFactorHintEmail(data.email ?? email);
      setAwaiting2FA(true);
      setTotpCode("");
      toast({ title: "İki adımlı doğrulama", description: "Authenticator uygulamanızdaki 6 haneli kodu girin." });
      return;
    }
    queryClient.removeQueries({ queryKey: MY_PROFILE_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["demoAccount"] });
    toast({ title: "Başarılı", description: "Giriş yapıldı!" });
    await redirectAfterAuth(data.userId);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const { data } = await getSiteSameOriginAxios().get<{
        enabled?: boolean;
        email?: string;
        password?: string;
      }>("/auth/demo-account");
      if (!data?.enabled || !data.email || !data.password) {
        toast({ title: "Demo kapalı", description: "Demo hesap şu anda kullanılamıyor.", variant: "destructive" });
        return;
      }
      setEmail(data.email);
      setPassword(data.password);
      const loginData = await authService.login({ email: data.email, password: data.password });
      await finishLogin(loginData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo giriş başarısız";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      await finishLogin(data);
    } catch (err) {
      if (getApiErrorCode(err) === EMAIL_NOT_VERIFIED_CODE) {
        setAwaitingEmailVerification(true);
        setEmailCode("");
        toast({
          title: "E-posta onaylanmamış",
          description: "Giriş için e-posta adresinizi onaylamanız gerekir. Kodunuzu girin veya tekrar gönderin.",
          variant: "destructive",
        });
        return;
      }
      const message = err instanceof ApiError ? err.message : "Giriş yapılırken bir hata oluştu";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailCode = async () => {
    if (!email) {
      toast({ title: "Hata", description: "E-posta adresi gerekli.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await authService.resendEmailVerification(email);
      toast({ title: "Kod gönderildi", description: "Doğrulama kodu e-posta adresinize tekrar gönderildi." });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Kod gönderilemedi";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = emailCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Hata", description: "6 haneli kodu girin.", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "Hata", description: "E-posta adresi gerekli.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await authService.verifyEmailByCode({ email, code });
      setAwaitingEmailVerification(false);
      setEmailCode("");
      clearPendingVerificationEmail();
      if (!password) {
        toast({ title: "E-posta doğrulandı", description: "Şifrenizle giriş yapabilirsiniz." });
        return;
      }
      toast({ title: "E-posta doğrulandı", description: "Hesabınıza giriş yapılıyor…" });
      const data = await authService.login({ email, password });
      await finishLogin(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "E-posta doğrulanamadı";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Hata", description: "6 haneli kodu girin.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await authService.completeTwoFactorLogin(code);
      setAwaiting2FA(false);
      setTotpCode("");
      setTwoFactorHintEmail(null);
      queryClient.removeQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ["demoAccount"] });
      toast({ title: "Başarılı", description: "Giriş yapıldı!" });
      await redirectAfterAuth(data.userId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "2FA doğrulanamadı";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  let heading = "Hoş Geldiniz";
  let subtitle = "Hesabınıza giriş yapın veya yeni bir hesap oluşturun";
  if (awaiting2FA) {
    heading = "İki adımlı doğrulama";
    subtitle = twoFactorHintEmail
      ? `${twoFactorHintEmail} için Authenticator kodunu girin.`
      : "Authenticator uygulamanızdaki 6 haneli kodu girin.";
  } else if (awaitingEmailVerification) {
    heading = "E-posta onayı";
    subtitle = email
      ? `${email} adresine gelen 6 haneli kodu girin. Kod gelmediyse tekrar gönderebilirsiniz.`
      : "E-posta adresinize gelen 6 haneli kodu girin. Kod gelmediyse tekrar gönderebilirsiniz.";
  }

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
            <h1 className="text-2xl font-bold">{heading}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {awaiting2FA ? (
            <form onSubmit={handleSubmitTwoFactor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp">Doğrulama kodu</Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="tracking-widest font-mono text-center text-lg"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading || totpCode.length !== 6}>
                {loading ? "Doğrulanıyor..." : "Devam et"}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => void cancelTwoFactor()}>
                İptal
              </Button>
            </form>
          ) : awaitingEmailVerification ? (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verifyEmail">E-posta</Label>
                <Input
                  id="verifyEmail"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailCode">E-posta doğrulama kodu</Label>
                <Input
                  id="emailCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="tracking-widest font-mono text-center text-lg"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                type="submit"
                disabled={loading || emailCode.length !== 6}
              >
                {loading ? "Doğrulanıyor..." : password ? "Doğrula ve giriş yap" : "Doğrula"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => void handleResendEmailCode()}
              >
                Tekrar kod gönder
              </Button>
              <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={cancelEmailVerification}>
                Geri dön
              </Button>
            </form>
          ) : (
            <>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <a href={googleAuthHref}>
                  <GoogleIcon className="h-5 w-5" />
                  Google ile giriş yap
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

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta veya kullanıcı adı</Label>
                  <Input
                    id="email"
                    type="text"
                    autoComplete="username"
                    placeholder="ornek@email.com veya kullanici_adi"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </Button>
              </form>
              {demoAvailable ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                  onClick={() => void handleDemoLogin()}
                >
                  Demo hesabı ile dene
                </Button>
              ) : null}
            </>
          )}

          {!awaiting2FA && !awaitingEmailVerification && (
            <p className="text-center text-xs text-muted-foreground space-y-1">
              <span className="block">
                Hesabınız yok mu?{" "}
                <Link href={registerHref} className="text-primary hover:underline font-medium">
                  Kayıt ol
                </Link>
              </span>
              <span className="block">
                <Link href={DASHBOARD_ROUTES.demoRegister} className="text-primary hover:underline font-medium">
                  Demoyu başlat
                </Link>
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
