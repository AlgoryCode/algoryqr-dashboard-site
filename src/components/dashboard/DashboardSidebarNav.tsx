"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Pin, PinOff } from "lucide-react";

import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
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
  navChildren,
} from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Shared easing for the rail: quick start, long soft settle. */
export const SIDEBAR_EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

// The icon keeps the same left offset in both states, so collapsing only clips the
// label: nothing re-centres or jumps while the width animates.
/** Every sidebar icon uses the brand rose, matching the mobile "Daha fazla" sheet. */
const NAV_TONE: Tone = "red";

function rowClass(tone: Tone, selected: boolean) {
  return cn(
    "relative flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-[10px] px-2 text-sm transition-colors",
    FOCUS_RING,
    selected
      ? cn(TONE_ROW[tone].selected, "font-semibold text-foreground")
      : cn(TONE_ROW[tone].hover, "font-medium text-foreground/70 hover:text-foreground"),
  );
}

export function sidebarLabelClass(collapsed: boolean) {
  return cn(
    "min-w-0 truncate whitespace-nowrap transition-[opacity,transform] motion-reduce:transition-none",
    SIDEBAR_EASE,
    collapsed
      ? "pointer-events-none -translate-x-1 opacity-0 duration-150"
      : "translate-x-0 opacity-100 duration-300 delay-75",
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
          className={cn(rowClass(tone, selected), !collapsed && "pr-8")}
        >
          <ToneIcon tone={tone} icon={icon} solid={selected} />
          <span className={sidebarLabelClass(collapsed)} aria-hidden={collapsed}>
            {label}
          </span>
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
  const [moreBelow, setMoreBelow] = useState(false);

  // Shows the "more below" hint while part of the list is hidden under the fold.
  const updateMoreBelow = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    updateMoreBelow();
    // The list grows after first paint (access profile, pins, sub-items), so re-measure on
    // size changes of the box and on any change to its content.
    const resize = new ResizeObserver(updateMoreBelow);
    resize.observe(el);
    const mutation = new MutationObserver(updateMoreBelow);
    mutation.observe(el, { childList: true, subtree: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [updateMoreBelow]);

  const scrollDown = () => {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({ top: Math.max(el.clientHeight * 0.6, 160), behavior: "smooth" });
  };

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
    <div className="relative mt-4 flex min-h-0 flex-1 flex-col">
    <nav
      ref={navRef}
      onScroll={updateMoreBelow}
      className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Ana menü"
    >
      {pinnedTargets.length > 0 ? (
        <NavGroup label="Sabitlenenler" collapsed={collapsed}>
          {pinnedTargets.map((target) => (
            <NavRow
              key={target.id}
              href={target.href}
              tone={NAV_TONE}
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
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-card via-card/90 to-transparent pb-1 transition-opacity duration-200",
          moreBelow ? "opacity-100" : "opacity-0",
        )}
        aria-hidden={!moreBelow}
      >
        <button
          type="button"
          onClick={scrollDown}
          tabIndex={moreBelow ? 0 : -1}
          aria-label="Menüde aşağı kaydır"
          className={cn(
            "flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-[#FFF0F3] hover:text-[#F03245]",
            moreBelow ? "pointer-events-auto animate-bounce [animation-duration:2s]" : "",
          )}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
    </div>
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
      {label ? (
        // Same height in both states: the title fades out and a divider fades in, so the
        // rows below never move vertically.
        <div className="relative h-6">
          <p className={cn("absolute inset-x-2 top-0 text-xs font-medium text-muted-foreground", sidebarLabelClass(collapsed))}>
            {label}
          </p>
          <div
            role="presentation"
            className={cn(
              "absolute left-2 right-2 top-2.5 border-t border-border transition-opacity duration-300 motion-reduce:transition-none",
              SIDEBAR_EASE,
              collapsed ? "opacity-100 delay-100" : "opacity-0",
            )}
          />
        </div>
      ) : null}
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
  const tone = NAV_TONE;
  const children = navChildren(item);
  const parentActive = isDashboardNavActive(pathname, item.href, item.key);
  const childActive = children.some((child) => isDashboardNavActive(pathname, child.href));

  const showChildren = !collapsed && (parentActive || childActive) && children.length > 0;

  return (
    <div className="space-y-0.5">
      {collapsed && children.length > 0 ? (
        <DropdownMenu>
          <RailTooltip collapsed label={item.label}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={rowClass(tone, parentActive || childActive)} aria-label={item.label}>
                <ToneIcon tone={tone} icon={icon} solid={parentActive || childActive} />
                <span className={sidebarLabelClass(true)} aria-hidden>
                  {item.label}
                </span>
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
      ) : (
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
      )}
      {/* Alt sayfalar yalnızca o bölümdeyken görünür; menü kısa kalır, ayrıca açıp kapatmak gerekmez. */}
      {(parentActive || childActive) && children.length > 0 ? (
        // Height animates through grid rows (0fr ↔ 1fr), so the rows below glide instead of jumping.
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none",
            SIDEBAR_EASE,
            showChildren ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
          inert={!showChildren}
        >
        <div className="min-h-0 overflow-hidden">
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
        </div>
        </div>
      ) : null}
    </div>
  );
}
