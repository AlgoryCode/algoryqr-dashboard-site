"use client";

import { useEffect, useMemo, useRef, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pin, PinOff } from "lucide-react";

import { DASHBOARD_NAV_ICONS, DASHBOARD_NAV_TONES } from "@/components/dashboard/nav-icons";
import { TONE_ROW, TONE_SOLID, ToneIcon, type Tone } from "@/components/dashboard/tone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardNavPrefs } from "@/hooks/use-dashboard-nav-prefs";
import { activeNavTargetId, buildNavTargets, type NavTarget } from "@/lib/dashboard-nav-prefs";
import {
  getVisibleDashboardNavGroups,
  isDashboardNavActive,
  type DashboardNavItem,
} from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function rowClass(tone: Tone, selected: boolean, collapsed = false) {
  return cn(
    "relative flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-[10px] text-sm transition-colors",
    collapsed ? "justify-center" : "px-1.5",
    FOCUS_RING,
    selected
      ? cn(TONE_ROW[tone].selected, "font-semibold text-foreground")
      : cn(TONE_ROW[tone].hover, "font-medium text-foreground/70 hover:text-foreground"),
  );
}

export function sidebarLabelClass(collapsed: boolean) {
  return cn(
    "min-w-0 truncate whitespace-nowrap transition-opacity duration-200 ease-in-out",
    collapsed ? "pointer-events-none opacity-0 duration-150" : "opacity-100 delay-100",
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function PinButton({
  pinned,
  disabled,
  label,
  onToggle,
}: {
  pinned: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  const text = pinned ? `${label} sabitlemesini kaldır` : disabled ? "En fazla 9 sayfa sabitlenebilir" : `${label} sayfasını sabitle`;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled || pinned) onToggle();
      }}
      aria-label={text}
      title={text}
      aria-pressed={pinned}
      className={cn(
        "absolute inset-y-0 right-1 my-auto flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/nav:opacity-100",
        FOCUS_RING,
        disabled && !pinned && "cursor-not-allowed",
      )}
    >
      {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
    </button>
  );
}

/** Icon-only rail entries explain themselves with a tooltip; the full-width row needs none. */
function RailTooltip({ collapsed, label, children }: { collapsed: boolean; label: string; children: ReactNode }) {
  return (
    <Tooltip open={collapsed ? undefined : false}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function NavRow({
  href,
  tone,
  icon,
  label,
  selected,
  collapsed,
  pin,
}: {
  href: string;
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  collapsed: boolean;
  pin?: ReactNode;
}) {
  return (
    <RailTooltip collapsed={collapsed} label={label}>
      <div className="group/nav relative">
        <Link
          href={href}
          aria-label={collapsed ? label : undefined}
          aria-current={selected ? "page" : undefined}
          className={cn(rowClass(tone, selected, collapsed), !collapsed && "pr-8")}
        >
          <ToneIcon tone={tone} icon={icon} solid={selected} />
          {!collapsed ? <span className={sidebarLabelClass(false)}>{label}</span> : null}
        </Link>
        {!collapsed ? pin : null}
      </div>
    </RailTooltip>
  );
}

export function DashboardSidebarNav({
  items,
  pathname,
  collapsed,
  onOpenPalette,
}: {
  items: DashboardNavItem[];
  pathname: string;
  collapsed: boolean;
  onOpenPalette: () => void;
}) {
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const { pinned, canPinMore, togglePinned, recordVisit } = useDashboardNavPrefs();

  const targets = useMemo(() => buildNavTargets(items), [items]);
  const targetById = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const navGroups = useMemo(() => getVisibleDashboardNavGroups(items), [items]);
  const pinnedTargets = useMemo(
    () => pinned.map((id) => targetById.get(id)).filter((target): target is NavTarget => target != null),
    [pinned, targetById],
  );
  const activeId = useMemo(() => activeNavTargetId(pathname, targets), [pathname, targets]);
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

  // Ziyaret geçmişi (komut paletindeki "Son kullanılanlar" için).
  useEffect(() => {
    if (activeId) recordVisit(activeId);
  }, [activeId, recordVisit]);

  // Seçili sayfa kaydırılan alanın dışında kalmasın.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, items, collapsed]);

  // Kısayollar: "/" aramayı açar, Alt+1…9 sabitlenen sayfaya gider.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && /^Digit[1-9]$/.test(event.code)) {
        const target = pinnedTargets[Number(event.code.slice(5)) - 1];
        if (target) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        onOpenPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenPalette, pinnedTargets, router]);

  return (
    <nav
      ref={navRef}
      className="-mx-1 mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-1 pb-1 [scrollbar-width:thin]"
      aria-label="Ana menü"
    >
      {pinnedTargets.length > 0 ? (
        <NavGroup label="Sabitlenenler" collapsed={collapsed}>
          {pinnedTargets.map((target) => (
            <NavRow
              key={target.id}
              href={target.href}
              tone={DASHBOARD_NAV_TONES[target.parentKey]}
              icon={DASHBOARD_NAV_ICONS[target.parentKey]}
              label={target.label}
              selected={target.id === activeId}
              collapsed={collapsed}
              pin={<PinButton pinned label={target.label} onToggle={() => togglePinned(target.id)} />}
            />
          ))}
        </NavGroup>
      ) : null}

      {navGroups.map(({ group, items: groupItems }) => (
        <NavGroup key={group.id} label={group.label} collapsed={collapsed}>
          {groupItems.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
              pinnedSet={pinnedSet}
              canPinMore={canPinMore}
              onTogglePin={togglePinned}
            />
          ))}
        </NavGroup>
      ))}
    </nav>
  );
}

function NavGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      {label && !collapsed ? (
        <p className="truncate px-1.5 pb-1 text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      {label && collapsed ? <div className="mx-2 mb-2 border-t border-border" role="presentation" /> : null}
      {children}
    </div>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  pathname,
  pinnedSet,
  canPinMore,
  onTogglePin,
}: {
  item: DashboardNavItem;
  collapsed: boolean;
  pathname: string;
  pinnedSet: Set<string>;
  canPinMore: boolean;
  onTogglePin: (id: string) => void;
}) {
  const icon = DASHBOARD_NAV_ICONS[item.key];
  const tone = DASHBOARD_NAV_TONES[item.key];
  const children = item.children ?? [];
  const parentActive = isDashboardNavActive(pathname, item.href, item.key);
  const childActive = children.some((child) => isDashboardNavActive(pathname, child.href));

  if (collapsed && children.length > 0) {
    return (
      <DropdownMenu>
        <RailTooltip collapsed label={item.label}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={rowClass(tone, parentActive || childActive, true)} aria-label={item.label}>
              <ToneIcon tone={tone} icon={icon} solid={parentActive || childActive} />
            </button>
          </DropdownMenuTrigger>
        </RailTooltip>
        <DropdownMenuContent side="right" align="start" sideOffset={12} className="min-w-44">
          <DropdownMenuItem asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
          {children.map((child) => (
            <DropdownMenuItem key={child.key} asChild>
              <Link href={child.href}>{child.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-0.5">
      <NavRow
        href={item.href}
        tone={tone}
        icon={icon}
        label={item.label}
        selected={parentActive || (childActive && collapsed)}
        collapsed={collapsed}
        pin={
          <PinButton
            pinned={pinnedSet.has(item.key)}
            disabled={!canPinMore}
            label={item.label}
            onToggle={() => onTogglePin(item.key)}
          />
        }
      />
      {/* Alt sayfalar yalnızca o bölümdeyken görünür; menü kısa kalır, ayrıca açıp kapatmak gerekmez. */}
      {!collapsed && (parentActive || childActive) && children.length > 0 ? (
        <div className="ml-[1.125rem] space-y-0.5 border-l border-border pl-2.5">
          {children.map((child) => {
            const active = isDashboardNavActive(pathname, child.href);
            const id = `${item.key}-${child.key}`;
            return (
              <div key={child.key} className="group/nav relative">
                <Link
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 w-full items-center gap-2 rounded-lg px-2 pr-8 text-[13px] transition-colors",
                    FOCUS_RING,
                    active
                      ? cn(TONE_ROW[tone].selected, "font-semibold text-foreground")
                      : cn(TONE_ROW[tone].hover, "font-medium text-foreground/60 hover:text-foreground"),
                  )}
                >
                  {active ? <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_SOLID[tone])} /> : null}
                  <span className="truncate">{child.label}</span>
                </Link>
                <PinButton
                  pinned={pinnedSet.has(id)}
                  disabled={!canPinMore}
                  label={child.label}
                  onToggle={() => onTogglePin(id)}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
