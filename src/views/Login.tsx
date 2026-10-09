import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  persistPendingVerificationEmail,
  readPendingVerificationEmail,
  VERIFY_INTENT_PARAM,
} from "@/lib/pending-verification";
const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";
const REGISTER_SUCCESS_DESCRIPTION =
  "Doğrulama kodu e-posta adresinize gönderildi. Girişten önce kodu onaylayın.";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaiting2FA, setAwaiting2FA] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [twoFactorHintEmail, setTwoFactorHintEmail] = useState<string | null>(null);
  const [demoUsername, setDemoUsername] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [panel, setPanel] = useState<"account" | "demo">("account");
  const [view, setView] = useState<"login" | "register">("login");
  const [accountForm, setAccountForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [demoRegUsername, setDemoRegUsername] = useState("");
  const [demoRegPassword, setDemoRegPassword] = useState("");
  const [demoRegPasswordConfirm, setDemoRegPasswordConfirm] = useState("");
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
  const googleRegisterHref = buildGoogleAuthStartUrl("register", DASHBOARD_ROUTES.demoRegister);

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
    const params = new URLSearchParams({ demoRegistered: "1" });
    if (registeredUsername) {
      params.set("username", registeredUsername);
    }
    router.replace(`/demo/login?${params.toString()}`);
  }, [router, searchParams]);

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
      toast({ title: "İki adımlı doğrulama", description: "Authenticator uygulamanızdaki 6 haneli kodu girin.", variant: "info" });
      return;
    }
    queryClient.removeQueries({ queryKey: MY_PROFILE_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["demoAccount"] });
    toast({ title: "Başarılı", description: "Giriş yapıldı!", variant: "success" });
    await redirectAfterAuth(data.userId);
  };

  const handleDemoAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoUsername.trim() || !demoPassword) {
      toast({ title: "Hata", description: "Kullanıcı adı ve şifre gerekli.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await getSiteSameOriginAxios().post<{ userId?: number }>("/auth/demo/login", {
        username: demoUsername.trim(),
        password: demoPassword,
      });
      queryClient.removeQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ["demoAccount"] });
      await loadPackageAccess(true, data.userId);
      const session = await fetchSessionContextClient(data.userId);
      if (session) {
        queryClient.setQueryData(SESSION_CONTEXT_QUERY_KEY, session);
      }
      toast({ title: "Başarılı", description: "Demo girişi yapıldı.", variant: "success" });
      router.push(pathForSession(session, DASHBOARD_ROUTES.overview));
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo giriş başarısız";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openRegister = () => {
    setView("register");
  };

  const closeRegister = () => {
    setView("login");
  };

  const updateAccountForm = (field: keyof typeof accountForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAccountRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !accountForm.firstName ||
      !accountForm.lastName ||
      !accountForm.email ||
      !accountForm.phone ||
      !accountForm.password ||
      !accountForm.passwordConfirm
    ) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    if (accountForm.password !== accountForm.passwordConfirm) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await authService.register({
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        email: accountForm.email,
        phone: accountForm.phone,
        password: accountForm.password,
        passwordConfirm: accountForm.passwordConfirm,
      });
      persistPendingVerificationEmail(accountForm.email);
      setEmail(accountForm.email);
      setPassword(accountForm.password);
      setEmailCode("");
      setAwaitingEmailVerification(true);
      setView("login");
      setPanel("account");
      toast({ title: "Kayıt başarılı", description: REGISTER_SUCCESS_DESCRIPTION, variant: "success", duration: 10000 });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast({
          title: "E-posta kullanımda",
          description: "Bu e-posta adresi zaten kayıtlı.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        const message = err instanceof ApiError ? err.message : "Kayıt olurken bir hata oluştu";
        toast({ title: "Hata", description: message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoRegUsername.trim() || !demoRegPassword || !demoRegPasswordConfirm) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    if (demoRegPassword !== demoRegPasswordConfirm) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const trimmedUsername = demoRegUsername.trim();
      await getSiteSameOriginAxios().post("/auth/demo/register", {
        username: trimmedUsername,
        password: demoRegPassword,
        passwordConfirm: demoRegPasswordConfirm,
      });
      setDemoUsername(trimmedUsername);
      setDemoPassword("");
      setView("login");
      setPanel("demo");
      toast({
        title: "Kayıt tamam",
        description: "Kullanıcı adınız ve şifrenizle giriş yapın.",
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo kayıt başarısız";
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
          variant: "warning",
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
      toast({ title: "Kod gönderildi", description: "Doğrulama kodu e-posta adresinize tekrar gönderildi.", variant: "success" });
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
        toast({ title: "E-posta doğrulandı", description: "Şifrenizle giriş yapabilirsiniz.", variant: "success" });
        return;
      }
      toast({ title: "E-posta doğrulandı", description: "Hesabınıza giriş yapılıyor…", variant: "success" });
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
      toast({ title: "Başarılı", description: "Giriş yapıldı!", variant: "success" });
      await redirectAfterAuth(data.userId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "2FA doğrulanamadı";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const showingRegister = view === "register" && !awaiting2FA && !awaitingEmailVerification;
  let heading = "Hoş Geldiniz";
  let subtitle =
    panel === "demo"
      ? "Demo kullanıcı adınız ve şifrenizle giriş yapın"
      : "Hesabınıza giriş yapın veya yeni bir hesap oluşturun";
  if (showingRegister) {
    heading = "Kayıt Ol";
    subtitle = panel === "demo" ? "Demo hesabınızı oluşturun" : "Hesabınızı oluşturun";
  }
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

        <div className="glass rounded-2xl p-8 glow-card">
          <AnimatePresence mode="wait" initial={false}>
            {showingRegister ? (
              <motion.div
                key={panel === "demo" ? "demo-register" : "account-register"}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <Button type="button" variant="ghost" className="-ml-2 h-9 gap-1.5 px-2" onClick={closeRegister} disabled={loading}>
                  <ArrowLeft className="h-4 w-4" />
                  Geri
                </Button>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">{heading}</h1>
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
                {panel === "demo" ? (
                  <form onSubmit={(e) => void handleDemoRegister(e)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-reg-username">Kullanıcı adı</Label>
                      <Input
                        id="demo-reg-username"
                        autoComplete="username"
                        placeholder="ornek_kullanici"
                        value={demoRegUsername}
                        onChange={(e) => setDemoRegUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-reg-password">Şifre</Label>
                      <Input
                        id="demo-reg-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="En az 8 karakter"
                        value={demoRegPassword}
                        onChange={(e) => setDemoRegPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-reg-password-confirm">Şifre (tekrar)</Label>
                      <Input
                        id="demo-reg-password-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={demoRegPasswordConfirm}
                        onChange={(e) => setDemoRegPasswordConfirm(e.target.value)}
                      />
                    </div>
                    <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
                      {loading ? "Hesap oluşturuluyor..." : "Kayıt ol"}
                    </Button>
                  </form>
                ) : (
                  <>
                    <Button variant="outline" size="lg" className="w-full" asChild>
                      <a href={googleRegisterHref}>
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
                    <form onSubmit={(e) => void handleAccountRegister(e)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">İsim</Label>
                          <Input id="firstName" placeholder="Adınız" value={accountForm.firstName} onChange={updateAccountForm("firstName")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Soyisim</Label>
                          <Input id="lastName" placeholder="Soyadınız" value={accountForm.lastName} onChange={updateAccountForm("lastName")} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regEmail">E-posta</Label>
                        <Input id="regEmail" type="email" placeholder="ornek@email.com" value={accountForm.email} onChange={updateAccountForm("email")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regPhone">Telefon</Label>
                        <Input id="regPhone" type="tel" placeholder="+90 5XX XXX XX XX" value={accountForm.phone} onChange={updateAccountForm("phone")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regPassword">Şifre</Label>
                        <Input id="regPassword" type="password" placeholder="••••••••" value={accountForm.password} onChange={updateAccountForm("password")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regPasswordConfirm">Şifre Tekrar</Label>
                        <Input
                          id="regPasswordConfirm"
                          type="password"
                          placeholder="••••••••"
                          value={accountForm.passwordConfirm}
                          onChange={updateAccountForm("passwordConfirm")}
                        />
                      </div>
                      <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
                        {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                      </Button>
                    </form>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="login"
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{heading}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {!awaiting2FA && !awaitingEmailVerification ? (
            <Tabs value={panel} onValueChange={(value) => setPanel(value === "demo" ? "demo" : "account")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Giriş</TabsTrigger>
                <TabsTrigger value="demo">Demo hesap İçin</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

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
          ) : panel === "demo" ? (
            <form onSubmit={(e) => void handleDemoAccountLogin(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-username">Kullanıcı adı</Label>
                <Input
                  id="demo-username"
                  autoComplete="username"
                  value={demoUsername}
                  onChange={(e) => setDemoUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-password">Şifre</Label>
                <Input
                  id="demo-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={demoPassword}
                  onChange={(e) => setDemoPassword(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </Button>
                <Button type="button" variant="outline" size="lg" className="w-full" onClick={openRegister}>
                  Kayıt ol
                </Button>
              </div>
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
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="w-full" onClick={openRegister}>
                    Kayıt ol
                  </Button>
                </div>
              </form>
            </>
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Login;
