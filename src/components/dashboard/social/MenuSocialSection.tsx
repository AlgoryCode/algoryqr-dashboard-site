"use client";

import Link from "next/link";

import { SocialIcon } from "@/components/icons/SocialIcon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  displaySocialUrl,
  type SocialDraft,
  type SocialLinks,
  type SocialPlatform,
} from "@/lib/social-links";

export type MenuSocialState = {
  /** The menu's own links, used when the branch has none for that platform. */
  links: SocialDraft;
  shown: Record<SocialPlatform, boolean>;
};

type MenuSocialSectionProps = {
  value: MenuSocialState;
  onChange: (value: MenuSocialState) => void;
  branchId: number | null;
  branchName?: string | null;
  branchLinks: SocialLinks | null | undefined;
};

/**
 * Social accounts on the menu edit screen. A platform the branch has filled in shows the
 * branch account with a switch; otherwise the menu can carry its own link. The switch decides
 * whether the account appears on the public menu.
 */
export function MenuSocialSection({ value, onChange, branchId, branchName, branchLinks }: MenuSocialSectionProps) {
  const hasBranchLinks = SOCIAL_PLATFORMS.some((p) => branchLinks?.[p]);

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Sosyal medya</h3>
        <p className="text-xs text-muted-foreground">
          Açık olan hesaplar müşteri menüsünde ikon olarak görünür.
          {branchId != null ? (
            <>
              {" "}
              Şube hesapları{" "}
              <Link href={DASHBOARD_ROUTES.branchSettings(branchId)} className="font-medium text-primary underline-offset-2 hover:underline">
                {branchName ? `${branchName} şube ayarlarından` : "şube ayarlarından"}
              </Link>{" "}
              düzenlenir.
            </>
          ) : null}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {SOCIAL_PLATFORMS.map((platform) => {
          const meta = SOCIAL_PLATFORM_META[platform];
          const branchUrl = branchLinks?.[platform]?.trim() || null;
          const ownUrl = value.links[platform].trim();
          const effective = branchUrl ?? (ownUrl || null);
          const switchId = `menu-social-show-${platform}`;
          return (
            <li key={platform} className="flex flex-col gap-2 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
                  <SocialIcon platform={platform} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{meta.label}</p>
                  {branchUrl ? (
                    <a
                      href={branchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs text-muted-foreground hover:text-foreground"
                      title={branchUrl}
                    >
                      Şube hesabı · {displaySocialUrl(branchUrl)}
                    </a>
                  ) : (
                    <Input
                      aria-label={`${meta.label} bağlantısı`}
                      value={value.links[platform]}
                      placeholder={meta.placeholder}
                      autoComplete="off"
                      inputMode="url"
                      className="mt-1 h-9"
                      onChange={(event) =>
                        onChange({ ...value, links: { ...value.links, [platform]: event.target.value } })
                      }
                    />
                  )}
                </div>
              </div>
              <label
                htmlFor={switchId}
                className="flex shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground"
              >
                {effective ? (value.shown[platform] ? "Menüde gösteriliyor" : "Gizli") : "Hesap yok"}
                <Switch
                  id={switchId}
                  checked={Boolean(effective) && value.shown[platform]}
                  disabled={!effective}
                  onCheckedChange={(checked) =>
                    onChange({ ...value, shown: { ...value.shown, [platform]: checked } })
                  }
                />
              </label>
            </li>
          );
        })}
      </ul>
      {!hasBranchLinks && branchId != null ? (
        <p className="text-xs text-muted-foreground">
          Bu şubeye kayıtlı sosyal medya hesabı yok; hesapları şube ayarlarına ekleyebilir ya da yalnızca bu menü için
          yukarıya yazabilirsiniz.
        </p>
      ) : null}
    </div>
  );
}
