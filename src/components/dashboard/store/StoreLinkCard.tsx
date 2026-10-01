"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import type { Merchant } from "@/lib/store-api";
import { isMerchantListedOpen } from "@/lib/store-ui";

export function StoreLinkCard({ merchant }: { merchant: Merchant }) {
  const { notify } = useDashboardBanners();
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(merchant.storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("danger", "Bağlantı kopyalanamadı.");
    }
  };

  const downloadQr = () => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(merchant.storeUrl)}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `magaza-${merchant.storeNo}.png`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  const listedOpen = isMerchantListedOpen(merchant);

  return (
    <div className={`${DASHBOARD_PANEL} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Mağaza no #{merchant.storeNo}
          </p>
          <p className="mt-1 break-all text-sm font-medium text-foreground">{merchant.storeUrl}</p>
        </div>
        <span
          className={
            listedOpen
              ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
          }
        >
          {listedOpen ? "Açık" : "Kapalı"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyUrl}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
        </Button>
        <Button variant="outline" size="sm" onClick={downloadQr}>
          <Download className="mr-2 h-4 w-4" />
          QR indir
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={merchant.storeUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Mağazayı aç
          </a>
        </Button>
      </div>
    </div>
  );
}
