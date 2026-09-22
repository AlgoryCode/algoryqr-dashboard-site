"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { YemekSepetiConnection } from "@/lib/yemek-sepeti-api";
import { shortDisplayId, UBER_EATS_SOFT_CARD_CLASS, UBER_EATS_SOFT_FIELD_CLASS } from "@/lib/ubereats-ui";
import { cn } from "@/lib/utils";

const PARTNER_API_DOCS_URL = "https://developer.yemeksepeti.com/api-specifications";

const FIELD_HINTS = {
  chainId: "Partner Portal Shop Integrations URL'sinden veya hesap yöneticinizden alınır.",
  vendorId: "Partner Portal > Shop Integrations > Settings > Vendor Identifier",
  clientId: "Partner Portal > Shop Integrations > Secret Management",
  clientSecret: "Partner Portal > Shop Integrations > Secret Management",
  webhookSecret: "Partner Portal'da webhook açılırken girilen secret. Entegrasyon için zorunludur.",
} as const;

type YemekSepetiConnectionPanelProps = {
  connection?: YemekSepetiConnection | null;
  chainId: string;
  vendorId: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  settingsOpen: boolean;
  canSave: boolean;
  saving: boolean;
  disconnecting: boolean;
  onChainIdChange: (value: string) => void;
  onVendorIdChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onWebhookSecretChange: (value: string) => void;
  onSettingsOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDisconnect: () => void;
};

function SummaryField({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className={UBER_EATS_SOFT_FIELD_CLASS} title={title}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function CredentialField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "password";
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function YemekSepetiConnectionPanel({
  connection,
  chainId,
  vendorId,
  clientId,
  clientSecret,
  webhookSecret,
  settingsOpen,
  canSave,
  saving,
  disconnecting,
  onChainIdChange,
  onVendorIdChange,
  onClientIdChange,
  onClientSecretChange,
  onWebhookSecretChange,
  onSettingsOpenChange,
  onSave,
  onDisconnect,
}: YemekSepetiConnectionPanelProps) {
  const isConnected = connection?.status === "CONNECTED";

  return (
    <Collapsible open={settingsOpen} onOpenChange={onSettingsOpenChange}>
      <div className={UBER_EATS_SOFT_CARD_CLASS}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 p-5 text-left sm:p-6"
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">Bağlantı ayarları</h2>
              <p className="text-xs text-muted-foreground">
                Yemeksepeti Partner API OAuth bilgilerini Partner Portal üzerinden alın.
              </p>
            </div>
            <ChevronDown
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                settingsOpen && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-border px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <p className="text-xs text-muted-foreground">
              Değerleri{" "}
              <a
                href={PARTNER_API_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Partner API dokümanına
              </a>{" "}
              göre Partner Portal Shop Integrations eklentisinden alın.
            </p>
            {connection ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryField
                  label="Chain ID"
                  value={shortDisplayId(connection.chainId, 12)}
                  title={connection.chainId ?? undefined}
                />
                {connection.clientIdMasked ? (
                  <SummaryField label="Client ID" value={connection.clientIdMasked} />
                ) : null}
                {connection.vendorId ? (
                  <SummaryField
                    label="Vendor ID"
                    value={shortDisplayId(connection.vendorId)}
                    title={connection.vendorId ?? undefined}
                  />
                ) : null}
                {connection.vendorName ? (
                  <SummaryField label="Mağaza" value={connection.vendorName} />
                ) : null}
                {connection.webhookSecretMasked ? (
                  <SummaryField label="Webhook secret" value={connection.webhookSecretMasked} />
                ) : null}
              </div>
            ) : null}

            {connection?.lastError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {connection.lastError}
              </div>
            ) : null}

            {isConnected ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={onDisconnect} disabled={disconnecting}>
                  Bağlantıyı kapat
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CredentialField
                    label="Chain ID"
                    hint={FIELD_HINTS.chainId}
                    value={chainId || connection?.chainId || ""}
                    onChange={onChainIdChange}
                    placeholder="chain_id"
                  />
                  <CredentialField
                    label="Vendor ID"
                    hint={FIELD_HINTS.vendorId}
                    value={vendorId || connection?.vendorId || ""}
                    onChange={onVendorIdChange}
                    placeholder="vendor_id"
                  />
                  <CredentialField
                    label="Client ID"
                    hint={FIELD_HINTS.clientId}
                    value={clientId}
                    onChange={onClientIdChange}
                    placeholder={connection?.clientIdMasked ? "Değiştirmek için yeni client_id" : "client_id"}
                  />
                  <CredentialField
                    label="Client Secret"
                    hint={FIELD_HINTS.clientSecret}
                    value={clientSecret}
                    onChange={onClientSecretChange}
                    placeholder="client_secret"
                    type="password"
                  />
                </div>

                <CredentialField
                  label="Webhook Secret"
                  hint={FIELD_HINTS.webhookSecret}
                  value={webhookSecret}
                  onChange={onWebhookSecretChange}
                  placeholder={
                    connection?.webhookSecretMasked ? "Değiştirmek için yeni webhook secret" : "webhook secret"
                  }
                  type="password"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={onSave} disabled={saving || !canSave}>
                    {saving ? "Kaydediliyor..." : "Kaydet / bağla"}
                  </Button>
                  {connection ? (
                    <Button variant="outline" onClick={onDisconnect} disabled={disconnecting}>
                      Bağlantıyı kapat
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
