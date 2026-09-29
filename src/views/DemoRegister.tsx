"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import {
  DEMO_TRIAL_DAYS,
  DEMO_TRIAL_PACKAGE_NAME,
  DEMO_TRIAL_SHORT_LABEL,
} from "@/lib/demo-trial-package";

const DemoRegister = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !passwordConfirm) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    if (password !== passwordConfirm) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const trimmedUsername = username.trim();
      await getSiteSameOriginAxios().post("/auth/demo/register", {
        username: trimmedUsername,
        password,
        passwordConfirm,
      });
      toast({
        title: "Kayıt tamam",
        description: "Şimdi giriş yapın; panelde hazırlık animasyonu ve kurulum adımları başlayacak.",
      });
      const params = new URLSearchParams({
        demoRegistered: "1",
        username: trimmedUsername,
      });
      router.push(`/login?${params.toString()}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Demo kayıt başarısız";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex justify-center">
            <BrandLogo className="h-10" />
          </Link>
          <h1 className="text-2xl font-bold">{DEMO_TRIAL_SHORT_LABEL} · kayıt</h1>
          <p className="text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">{DEMO_TRIAL_PACKAGE_NAME}</strong> ({DEMO_TRIAL_DAYS} gün,
            kredi kartı yok). Kayıt sonrası giriş yaparsınız; panel açılınca önce hazırlık animasyonu,
            ardından kısa kurulum adımları gelir.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-username">Kullanıcı adı</Label>
            <Input
              id="demo-username"
              autoComplete="username"
              placeholder="ornek_kullanici"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-password">Şifre</Label>
            <Input
              id="demo-password"
              type="password"
              autoComplete="new-password"
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-password-confirm">Şifre (tekrar)</Label>
            <Input
              id="demo-password-confirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
          <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
            {loading ? "Hesap oluşturuluyor..." : "Kayıt ol"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Zaten üye misiniz?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Zaten hesabınız var — giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DemoRegister;
