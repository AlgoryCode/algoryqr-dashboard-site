import type { SocialPlatform } from "@/lib/social-links";

type SocialIconProps = {
  platform: SocialPlatform;
  className?: string;
};

/** Brand glyphs drawn in currentColor so they follow the surrounding text colour. */
export function SocialIcon({ platform, className }: SocialIconProps) {
  const common = { className, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
  switch (platform) {
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V3.9a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.3h2.8V22h3.4Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.4.1-2.6-.3-3.9-1.1v5.2c0 6.6-7.2 8.7-10.1 4-1.9-3-.7-8.3 5.4-8.5v2.8c-.5.1-1 .2-1.4.4-1.4.5-2.2 1.3-2 2.8.4 2.9 5.8 3.8 5.3-1.9V3h2.8Z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2.2 3h6.2l4.3 5.8L17.8 3Zm-1 16.2h1.7L7.3 4.7H5.5l11.3 14.5Z" />
        </svg>
      );
  }
}
