import { getDashboardCommandEntries } from "@/lib/dashboard-command";
import {
  DASHBOARD_NAV_GROUPS,
  isDashboardNavActive,
  type DashboardNavItem,
  type DashboardNavKey,
} from "@/lib/dashboard-routes";

/** Sidebar'da gidilebilen tek bir hedef: üst sayfa ya da alt sayfa (ör. Ürünler › Kategoriler). */
export type NavTarget = {
  /** Komut paletiyle aynı kimlik: üst sayfada `key`, alt sayfada `key-childKey`. */
  id: string;
  label: string;
  href: string;
  parentKey: DashboardNavKey;
  parentLabel?: string;
  groupLabel: string;
  keywords: string;
  isChild: boolean;
};

export const MAX_PINNED = 9;
export const MAX_RECENT = 5;

/** Türkçe karakterleri sadeleştirir: "Şube" ile "sube" eşleşsin. */
export function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function buildNavTargets(items: DashboardNavItem[]): NavTarget[] {
  const keywordsById = new Map(getDashboardCommandEntries().map((entry) => [entry.id, entry.keywords]));
  const groupByKey = new Map<DashboardNavKey, string>();
  for (const group of DASHBOARD_NAV_GROUPS) {
    for (const key of group.items) groupByKey.set(key, group.label || "Genel");
  }
  return items.flatMap((item) => {
    const groupLabel = groupByKey.get(item.key) ?? "Genel";
    const parent: NavTarget = {
      id: item.key,
      label: item.label,
      href: item.href,
      parentKey: item.key,
      groupLabel,
      keywords: keywordsById.get(item.key) ?? `${item.label} ${item.mobileLabel}`,
      isChild: false,
    };
    const children = (item.children ?? []).map((child) => {
      const id = `${item.key}-${child.key}`;
      return {
        id,
        label: child.label,
        href: child.href,
        parentKey: item.key,
        parentLabel: item.label,
        groupLabel,
        keywords: keywordsById.get(id) ?? `${child.label} ${item.label}`,
        isChild: true,
      } satisfies NavTarget;
    });
    return [parent, ...children];
  });
}

/**
 * Sayfa adı ve anahtar kelimelerde arar. Ad ile başlayanlar önce, adında geçenler sonra,
 * yalnızca anahtar kelimede geçenler en sonda gelir.
 */
export function searchNavTargets(targets: NavTarget[], query: string): NavTarget[] {
  const needle = foldTurkish(query.trim());
  if (!needle) return [];
  const scored: { target: NavTarget; score: number; index: number }[] = [];
  targets.forEach((target, index) => {
    const label = foldTurkish(target.label);
    const words = label.split(/\s+/);
    let score = -1;
    if (label.startsWith(needle)) score = 0;
    else if (words.some((word) => word.startsWith(needle))) score = 1;
    else if (label.includes(needle)) score = 2;
    else if (foldTurkish(`${target.keywords} ${target.parentLabel ?? ""} ${target.groupLabel}`).includes(needle)) score = 3;
    if (score >= 0) scored.push({ target, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((row) => row.target);
}

/** Bulunulan sayfaya karşılık gelen hedef; alt sayfa üst sayfadan önceliklidir. */
export function activeNavTargetId(pathname: string, targets: NavTarget[]): string | null {
  const child = targets.find((target) => target.isChild && isDashboardNavActive(pathname, target.href));
  if (child) return child.id;
  const parent = targets.find(
    (target) => !target.isChild && isDashboardNavActive(pathname, target.href, target.parentKey),
  );
  return parent?.id ?? null;
}

export function togglePinnedId(list: string[], id: string, max = MAX_PINNED): string[] {
  if (list.includes(id)) return list.filter((entry) => entry !== id);
  if (list.length >= max) return list;
  return [...list, id];
}

export function pushRecentId(list: string[], id: string, max = MAX_RECENT): string[] {
  return [id, ...list.filter((entry) => entry !== id)].slice(0, max);
}

export function movePinnedId(list: string[], id: string, direction: -1 | 1): string[] {
  const index = list.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
