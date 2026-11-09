"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock, ExternalLink, Pin, Settings2, Smartphone, User } from "lucide-react";

import { DASHBOARD_NAV_ICONS, DASHBOARD_NAV_TONES } from "@/components/dashboard/nav-icons";
import { ToneIcon, type Tone } from "@/components/dashboard/tone";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { useAccessSession } from "@/hooks/use-commerce";
import { useDashboardNavPrefs } from "@/hooks/use-dashboard-nav-prefs";
import { hasScope } from "@/lib/auth-user";
import {
  filterCommandEntries,
  getDashboardCommandEntries,
  type DashboardCommandEntry,
} from "@/lib/dashboard-command";
import { activeNavTargetId, buildNavTargets, foldTurkish } from "@/lib/dashboard-nav-prefs";
import { DASHBOARD_NAV_ITEMS, type DashboardNavKey } from "@/lib/dashboard-routes";

type DashboardCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NAV_KEYS = new Set<string>(DASHBOARD_NAV_ITEMS.map((item) => item.key));

/** Türkçe karakterden bağımsız arama: "sube" → "Şube yönetimi". Tüm kelimeler geçmeli. */
function turkishFilter(value: string, search: string, keywords?: string[]): number {
  const words = foldTurkish(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const haystack = foldTurkish(`${(keywords ?? []).join(" ")} ${value}`);
  if (!words.every((word) => haystack.includes(word))) return 0;
  const label = foldTurkish(keywords?.[0] ?? "");
  return label.startsWith(words[0]) ? 1 : label.includes(words[0]) ? 0.8 : 0.5;
}

function entryIcon(entry: DashboardCommandEntry): ComponentType<{ className?: string }> {
  const parentKey = entry.id.split("-")[0];
  if (NAV_KEYS.has(parentKey)) return DASHBOARD_NAV_ICONS[parentKey as DashboardNavKey];
  if (entry.group === "Operasyon") return Smartphone;
  if (entry.group === "Hesap") return User;
  return Settings2;
}

function entryTone(entry: DashboardCommandEntry): Tone {
  const parentKey = entry.id.split("-")[0];
  if (NAV_KEYS.has(parentKey)) return DASHBOARD_NAV_TONES[parentKey as DashboardNavKey];
  if (entry.group === "Operasyon") return "teal";
  if (entry.group === "Hesap") return "blue";
  return "violet";
}

export function DashboardCommandPalette({ open, onOpenChange }: DashboardCommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const { pinned, recent } = useDashboardNavPrefs();
  const { data: accessProfile } = useAccessProfile();
  const accessSession = useAccessSession();
  const hasAllowAccess = accessSession.data?.decision === "ALLOW";

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const entries = useMemo(
    () =>
      filterCommandEntries(
        getDashboardCommandEntries(),
        "",
        (scope) => !scope || hasScope(accessProfile, scope),
        hasAllowAccess,
      ),
    [accessProfile, hasAllowAccess],
  );
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

  const currentId = useMemo(() => {
    const targets = buildNavTargets(DASHBOARD_NAV_ITEMS);
    return activeNavTargetId(pathname, targets);
  }, [pathname]);

  const pinnedEntries = useMemo(
    () => pinned.map((id) => entryById.get(id)).filter((entry): entry is DashboardCommandEntry => entry != null),
    [entryById, pinned],
  );
  const recentEntries = useMemo(
    () =>
      recent
        .filter((id) => id !== currentId && !pinned.includes(id))
        .map((id) => entryById.get(id))
        .filter((entry): entry is DashboardCommandEntry => entry != null)
        .slice(0, 4),
    [currentId, entryById, pinned, recent],
  );

  const groups = useMemo(() => {
    const byGroup = new Map<string, DashboardCommandEntry[]>();
    for (const entry of entries) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return [...byGroup.entries()];
  }, [entries]);

  const go = (href: string, external?: boolean) => {
    onOpenChange(false);
    if (external) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  };

  const showShortcuts = search.trim() === "";

  const renderItem = (entry: DashboardCommandEntry, prefix: string, shortcut?: string) => {
    const Icon = entryIcon(entry);
    const isCurrent = entry.id === currentId;
    return (
      <CommandItem
        key={`${prefix}-${entry.id}`}
        value={prefix === "all" ? entry.id : `${prefix}:${entry.id}`}
        keywords={[entry.label, entry.keywords]}
        onSelect={() => go(entry.href, entry.external)}
        className="gap-2.5"
      >
        <ToneIcon tone={entryTone(entry)} icon={Icon} />
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        {isCurrent ? <span className="text-[11px] text-muted-foreground">Bu sayfa</span> : null}
        {entry.external ? <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-label="Yeni sekmede açılır" /> : null}
        {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
      </CommandItem>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} commandProps={{ filter: turkishFilter }}>
      <CommandInput placeholder="Sayfa veya işlem ara…" value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[min(60vh,420px)]">
        <CommandEmpty>Sonuç yok. Farklı bir kelime deneyin.</CommandEmpty>
        {showShortcuts && pinnedEntries.length > 0 ? (
          <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><Pin className="size-3" />Sabitlenenler</span>}>
            {pinnedEntries.map((entry, index) => renderItem(entry, "pinned", `Alt ${index + 1}`))}
          </CommandGroup>
        ) : null}
        {showShortcuts && recentEntries.length > 0 ? (
          <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><Clock className="size-3" />Son kullanılanlar</span>}>
            {recentEntries.map((entry) => renderItem(entry, "recent"))}
          </CommandGroup>
        ) : null}
        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => renderItem(item, "all"))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border px-1">↑</kbd>
          <kbd className="rounded border border-border px-1">↓</kbd>
          gezin
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border px-1">↵</kbd>
          aç
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border px-1">Esc</kbd>
          kapat
        </span>
        <span className="ml-auto hidden items-center gap-1 sm:inline-flex">
          <kbd className="rounded border border-border px-1">/</kbd>
          ara
        </span>
      </div>
    </CommandDialog>
  );
}

export function useCommandPaletteHotkey(onToggle: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggle]);
}
