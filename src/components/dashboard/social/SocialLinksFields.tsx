"use client";

import { SocialIcon } from "@/components/icons/SocialIcon";
import { Input } from "@/components/ui/input";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_META, type SocialDraft } from "@/lib/social-links";

type SocialLinksFieldsProps = {
  idPrefix: string;
  value: SocialDraft;
  onChange: (value: SocialDraft) => void;
  disabled?: boolean;
};

/** One input per platform; accepts a full URL, a domain path or a bare @handle. */
export function SocialLinksFields({ idPrefix, value, onChange, disabled }: SocialLinksFieldsProps) {
  return (
    <div className="space-y-3">
      {SOCIAL_PLATFORMS.map((platform) => {
        const meta = SOCIAL_PLATFORM_META[platform];
        const id = `${idPrefix}-${platform}`;
        return (
          <div key={platform} className="flex items-center gap-3">
            <label
              htmlFor={id}
              className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium text-foreground"
            >
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
                <SocialIcon platform={platform} className="size-4" />
              </span>
              <span className="truncate">{meta.label}</span>
            </label>
            <Input
              id={id}
              value={value[platform]}
              placeholder={meta.placeholder}
              autoComplete="off"
              inputMode="url"
              disabled={disabled}
              className="min-w-0 flex-1"
              onChange={(event) => onChange({ ...value, [platform]: event.target.value })}
            />
          </div>
        );
      })}
    </div>
  );
}
