"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Coffee, QrCode } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

const highlights = [
  {
    icon: Coffee,
    title: "Algory Cafe hazır",
    description: "Demo hesabınızda şube ve dijital menü önceden oluşturulur; ürünler sunum için dolu gelir.",
  },
  {
    icon: BarChart3,
    title: "Dolu raporlar",
    description: "Ciro, ziyaret ve garson performansı ekranlarında örnek verilerle paneli keşfedin.",
  },
  {
    icon: QrCode,
    title: "Hazır menü ve ürünler",
    description: "Sahte sipariş ve satış verileriyle garson paneli, mutfak ve menüyü gerçekçi şekilde deneyin.",
  },
];

export default function DemoLanding() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="space-y-8 text-center">
          <Link href="/" className="inline-flex justify-center">
            <BrandLogo className="h-10" />
          </Link>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Canlı demo</p>
            <h1 className="text-3xl font-bold tracking-tight text-balance">Paneli demo ile keşfedin</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Bir kullanıcı adı seçin; Algory Cafe şubesi, dijital menü ve örnek satış verileri anında hazır olsun.
            </p>
          </div>

          <ul className="space-y-4 text-left">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3 rounded-xl border border-border bg-card/50 p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button variant="hero" size="lg" className="w-full gap-2" asChild>
            <Link href={DASHBOARD_ROUTES.demoRegister}>
              Demoyu başlat <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground">
            Zaten üye misiniz?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
