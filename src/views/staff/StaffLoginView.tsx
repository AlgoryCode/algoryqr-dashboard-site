"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseStaffRole,
  STAFF_APP_HEADER,
  staffHomePath,
  type StaffApp,
} from "@/lib/waiter-api";

const STAFF_APPS: StaffApp[] = ["kitchen", "courier", "waiter"];

export default function StaffLoginView() {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const app of STAFF_APPS) {
        try {
          const response = await fetch("/api/waiter/auth/me", {
            credentials: "same-origin",
            headers: { Accept: "application/json", [STAFF_APP_HEADER]: app },
          });
          if (!response.ok) continue;
          const data = (await response.json()) as { staffRole?: string };
          if (cancelled) return;
          router.replace(staffHomePath(parseStaffRole(data.staffRole)));
          return;
        } catch {
          // Try the next staff cookie.
        }
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const merchant = merchantId.trim();
    if (!/^\d+$/.test(merchant)) {
      setError("İşletme ID sayı olmalı");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/waiter/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          merchantId: Number(merchant),
          username: username.trim(),
          password,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        staffRole?: string;
      };
      if (!response.ok) {
        setError(data.message || "Giriş başarısız");
        return;
      }
      router.replace(staffHomePath(parseStaffRole(data.staffRole)));
    } catch {
      setError("Giriş yapılamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <BrandLogo size="lg" />
          <span className="text-2xl font-bold">
            Algory<span className="text-primary">QR</span>
          </span>
        </div>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Personel girişi</h1>
            <p className="text-sm text-muted-foreground">
              İşletme ID, kullanıcı adı ve şifre ile girin. Hesabınız garson, mutfak veya kurye ekranına
              yönlendirilir.
            </p>
          </div>
          {checking ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="staff-merchant-id">İşletme ID</Label>
                <Input
                  id="staff-merchant-id"
                  inputMode="numeric"
                  autoComplete="off"
                  value={merchantId}
                  onChange={(event) => setMerchantId(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-username">Kullanıcı adı</Label>
                <Input
                  id="staff-username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-password">Şifre</Label>
                <Input
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Giriş yap"}
              </Button>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:underline">
              Yönetim girişi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
