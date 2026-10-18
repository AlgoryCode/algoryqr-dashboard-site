"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranches } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api";
import { formatBranchListLabel } from "@/lib/branch";
import { copyTextToClipboard } from "@/components/dashboard/qr/qr-actions";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  createPrintApiKeyRequest,
  getPrinterSettingsRequest,
  setPrintKitchenEnabledRequest,
  type PrintApiKeyCredentials,
} from "@/lib/print-agent";

type Props = {
  merchantId?: number | null;
  onNotify: (type: "info" | "warning" | "danger", message: string) => void;
};

export function PrintAgentApiKeySection({ merchantId, onNotify }: Props) {
  const branchesQuery = useBranches(true);
  const branches = branchesQuery.data?.content ?? [];
  const [branchId, setBranchId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<PrintApiKeyCredentials | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    void (async () => {
      try {
        const settings = await getPrinterSettingsRequest(Number(branchId));
        if (cancelled) return;
        setCredentials((prev) =>
          prev && prev.branchId === settings.branchId
            ? { ...prev, merchantId: settings.merchantId ?? settings.userId }
            : prev,
        );
      } catch {
        // settings endpoint optional for display; generate still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (branchId || branches.length === 0) return;
    setBranchId(String(branches[0].id));
  }, [branchId, branches]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => String(branch.id) === branchId) ?? null,
    [branchId, branches],
  );

  const displayMerchantId = credentials?.merchantId ?? credentials?.userId ?? merchantId ?? null;
  const maskedKey = credentials?.apiKey
    ? `${credentials.apiKey.slice(0, 8)}${"•".repeat(Math.max(12, credentials.apiKey.length - 12))}${credentials.apiKey.slice(-4)}`
    : "";

  const generate = async () => {
    if (!branchId) {
      onNotify("warning", "Önce bir şube seçin.");
      return;
    }
    const id = Number(branchId);
    setBusy(true);
    try {
      if (!selectedBranch?.printKitchenEnabled) {
        await setPrintKitchenEnabledRequest(id, true);
      }
      const result = await createPrintApiKeyRequest(id, "Print Agent");
      setCredentials(result);
      setShowApiKey(false);
      onNotify("info", "API Key üretildi. Yazıcı ajanına Kullanıcı ID, Şube ID ve API Key ile bağlanın.");
    } catch (error) {
      onNotify("danger", error instanceof ApiError ? error.message : "API Key üretilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    const ok = await copyTextToClipboard(value);
    onNotify(ok ? "info" : "danger", ok ? `${label} kopyalandı.` : "Kopyalanamadı.");
  };

  return (
    <div className={`${DASHBOARD_SURFACE} p-6 space-y-5`}>
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Printer className="h-4 w-4 text-muted-foreground" /> Yazıcı ajanı API Key
      </h2>
      <p className="text-sm text-muted-foreground">
        Firma hesabınız için yazıcı ajanı anahtarı üretin. Windows uygulamasında Kullanıcı ID, Şube ID
        ve API Key ile bağlanırsınız.
      </p>

      {branchesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Şubeler yükleniyor…</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-muted-foreground">API Key için önce bir şube oluşturun.</p>
      ) : (
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label>Şube</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {formatBranchListLabel(branch)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Şube ID</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                className="bg-background font-mono"
                value={branchId || "—"}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!branchId}
                onClick={() => void copyValue("Şube ID", branchId)}
                aria-label="Şube ID kopyala"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kullanıcı ID</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                className="bg-background font-mono"
                value={displayMerchantId != null ? String(displayMerchantId) : "—"}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={displayMerchantId == null}
                onClick={() => void copyValue("İşletme ID", String(displayMerchantId))}
                aria-label="Kullanıcı ID kopyala"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                className="bg-background font-mono text-xs"
                type="text"
                value={
                  credentials?.apiKey
                    ? showApiKey
                      ? credentials.apiKey
                      : maskedKey
                    : "Henüz üretilmedi"
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!credentials?.apiKey}
                onClick={() => setShowApiKey((prev) => !prev)}
                aria-label={showApiKey ? "API Key gizle" : "API Key göster"}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!credentials?.apiKey}
                onClick={() => void copyValue("API Key", credentials!.apiKey)}
                aria-label="API Key kopyala"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {credentials?.apiKey ? (
              <p className="text-xs text-muted-foreground">
                Anahtar yalnızca bu oturumda görüntülenir. Kaybetirseniz yeniden üretin.
              </p>
            ) : null}
          </div>

          <Button type="button" className="gap-2" disabled={busy || !branchId} onClick={() => void generate()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {credentials ? "Yeni API Key üret" : "API Key üret"}
          </Button>
        </div>
      )}
    </div>
  );
}
