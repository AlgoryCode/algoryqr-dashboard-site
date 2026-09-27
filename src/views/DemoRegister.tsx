"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MY_PROFILE_QUERY_KEY } from "@/hooks/use-my-profile";
import { ApiError } from "@/lib/api";
import { fetchSessionContextClient, pathForSession } from "@/lib/session-context";
import { SESSION_CONTEXT_QUERY_KEY } from "@/hooks/use-session-context";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

const DemoRegister = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

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
      await getSiteSameOriginAxios().post("/auth/demo/register", {
        username: username.trim(),
        password,
        passwordConfirm,
      });
      queryClient.removeQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ["demoAccount"] });
      const session = await fetchSessionContextClient();
      if (session) {
        queryClient.setQueryData(SESSION_CONTEXT_QUERY_KEY, session);
      }
      toast({
        title: "Demo hesap hazır",
        description: "15 günlük Ultimate denemeniz başlatıldı.",
      });
      router.push(pathForSession(session, DASHBOARD_ROUTES.root));
      router.refresh();
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
          <h1 className="text-2xl font-bold">Demo hesap oluştur</h1>
          <p className="text-sm text-muted-foreground">
            Kullanıcı adı ve şifre ile kayıt olun; 15 gün Ultimate deneme otomatik tanımlanır.
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
            {loading ? "Hesap oluşturuluyor..." : "Demo hesap oluştur"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DemoRegister;
