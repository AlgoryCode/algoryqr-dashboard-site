"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { TONES, TONE_SOLID, type Tone } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsPhone } from "@/hooks/use-media-query";
import { foldSearchText } from "@/lib/product-list";
import { cn } from "@/lib/utils";

export type FilterMenuOption<T extends string> = {
  value: T;
  label: string;
  /** Dot colour in the list, and the button colour once this option is chosen. */
  tone?: Tone;
  count?: number;
};

type CommonProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Button colour while a value is chosen, when the option has no tone of its own. */
  tone?: Tone;
  className?: string;
};

type OptionsProps<T extends string> = CommonProps & {
  options: ReadonlyArray<FilterMenuOption<T>>;
  value: T;
  /** The value that means "no filter"; choosing it, or the x, clears the button. */
  emptyValue: T;
  /** Show the default option's name faintly, for filters whose default is not "everything". */
  showIdleValue?: boolean;
  onChange: (value: T) => void;
  multiple?: false;
  content?: never;
};

type MultiProps<T extends string> = CommonProps & {
  /** Several values at once; an empty list means "no filter". Options should not include an "all" entry. */
  multiple: true;
  options: ReadonlyArray<FilterMenuOption<T>>;
  values: readonly T[];
  onValuesChange: (values: T[]) => void;
  content?: never;
};

type ContentProps = CommonProps & {
  /** Free content, such as a date range picker. */
  content: (close: () => void) => ReactNode;
  /** Text after the label while active, e.g. "7 gün". Null means the filter is off. */
  activeLabel: string | null;
  /** Shown faintly after the label while the filter is at its default, e.g. "Bugün". */
  idleLabel?: string;
  onClear: () => void;
  options?: never;
  multiple?: false;
};

/** Lists longer than this get a search box. */
const SEARCHABLE_AFTER = 7;

/** "Hazır", "Hazır +2" — the button text for one or more chosen options. */
export function multiFilterLabel(labels: readonly string[]): string | null {
  if (labels.length === 0) return null;
  return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
}

/**
 * One filter as a button. Click opens a small popover on desktop and a bottom sheet on a phone.
 * While a value is chosen the button wears its colour (soft tint, coloured text, like the sidebar
 * icons) and shows an x in its top right corner that clears it.
 * With `multiple`, the list has checkboxes and stays open, so several values can be picked at once.
 */
export function FilterMenu<T extends string>(props: OptionsProps<T> | MultiProps<T> | ContentProps) {
  const { label, icon: Icon, className } = props;
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isOptions = props.options != null;
  const isMulti = props.multiple === true;
  const selectedValues: readonly T[] =
    props.multiple === true ? props.values : props.options != null ? [props.value] : [];
  const chosenOptions = (props.options ?? []).filter((option) => selectedValues.includes(option.value));
  const chosen = props.multiple === true ? undefined : chosenOptions[0];
  const active =
    props.multiple === true
      ? props.values.length > 0
      : props.options != null
        ? props.value !== props.emptyValue
        : props.activeLabel != null;
  const activeText =
    props.multiple === true
      ? multiFilterLabel(chosenOptions.map((option) => option.label))
      : props.options != null
        ? chosen?.label ?? null
        : props.activeLabel;
  // One shared colour when every chosen option has the same one; otherwise the filter's own colour.
  const chosenTones = [...new Set(chosenOptions.map((option) => option.tone).filter(Boolean))];
  const tone: Tone = (chosenTones.length === 1 && chosenOptions.every((option) => option.tone) ? chosenTones[0] : undefined) ?? props.tone ?? "blue";

  const clear = () => {
    if (props.multiple === true) props.onValuesChange([]);
    else if (props.options != null) props.onChange(props.emptyValue);
    else props.onClear();
  };
  const toggleValue = (value: T) => {
    if (props.multiple !== true) return;
    const next = props.values.includes(value) ? props.values.filter((item) => item !== value) : [...props.values, value];
    // Keep the order of the option list, so the address and the button text stay stable.
    props.onValuesChange(props.options.map((option) => option.value).filter((item) => next.includes(item)));
  };
  const close = () => {
    setOpen(false);
    setSearch("");
  };

  const visibleOptions = useMemo(() => {
    if (props.options == null) return [];
    const needle = foldSearchText(search);
    return needle ? props.options.filter((option) => foldSearchText(option.label).includes(needle)) : props.options;
  }, [props.options, search]);

  const body =
    props.options != null ? (
      <div className="flex max-h-[min(22rem,60vh)] flex-col">
        {props.options.length > SEARCHABLE_AFTER ? (
          <div className="relative p-2 pb-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus={!phone}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`${label} ara`}
              className="h-8 pl-8 text-sm"
            />
          </div>
        ) : null}
        <ul role="listbox" aria-label={label} aria-multiselectable={isMulti || undefined} className="overflow-y-auto p-1.5">
          {visibleOptions.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={option.count != null ? `${option.label} (${option.count})` : option.label}
                  onClick={() => {
                    if (props.multiple === true) {
                      toggleValue(option.value);
                      return;
                    }
                    if (props.options != null) props.onChange(option.value);
                    close();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    selected && "font-medium",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      option.tone ? TONE_SOLID[option.tone] : "bg-muted-foreground/30",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.count != null ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{option.count}</span>
                  ) : null}
                  {isMulti ? (
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                        selected ? cn("border-transparent", option.tone ? TONE_SOLID[option.tone] : "bg-foreground text-background") : "border-border",
                      )}
                    >
                      {selected ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                  ) : (
                    <Check className={cn("size-4 shrink-0", selected ? "text-foreground" : "invisible")} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
          {visibleOptions.length === 0 ? (
            <li className="px-2.5 py-6 text-center text-sm text-muted-foreground">Sonuç yok</li>
          ) : null}
        </ul>
        {isMulti && !phone ? (
          <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
            <button
              type="button"
              onClick={clear}
              disabled={!active}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Tamam
            </button>
          </div>
        ) : null}
      </div>
    ) : (
      <div className="p-3">{props.content(close)}</div>
    );

  const trigger = (
    <button
      type="button"
      onClick={phone ? () => setOpen(true) : undefined}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        "flex h-9 max-w-[15rem] shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? cn("border-transparent", TONES[tone])
          : "border-border bg-card text-foreground hover:bg-muted/60",
        className,
      )}
    >
      <Icon className={cn("size-4 shrink-0", !active && "text-muted-foreground")} />
      <span className="truncate">
        {label}
        {active && activeText ? <span className="font-semibold">: {activeText}</span> : null}
        {!active && (isOptions ? (props.multiple !== true && props.showIdleValue ? chosen?.label : undefined) : props.idleLabel) ? (
          <span className="font-normal text-muted-foreground">
            : {isOptions ? chosen?.label : props.idleLabel}
          </span>
        ) : null}
      </span>
      {!active ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </button>
  );

  return (
    <div className="relative shrink-0">
      {phone ? (
        <>
          {trigger}
          <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
            <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </SheetTitle>
              </SheetHeader>
              {body}
              {isMulti ? (
                <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                  <Button type="button" variant="outline" disabled={!active} onClick={clear}>
                    Temizle
                  </Button>
                  <Button type="button" onClick={close}>
                    Tamam
                  </Button>
                </div>
              ) : active ? (
                <div className="border-t border-border p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      clear();
                      close();
                    }}
                  >
                    Filtreyi kaldır
                  </Button>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className={cn("rounded-xl p-0 shadow-lg", isOptions ? "w-64" : "w-auto max-w-[min(42rem,90vw)]")}
          >
            {body}
          </PopoverContent>
        </Popover>
      )}

      {active ? (
        <button
          type="button"
          onClick={clear}
          aria-label={`${label} filtresini kaldır`}
          title="Filtreyi kaldır"
          className={cn(
            "absolute -right-1.5 -top-1.5 flex size-[1.125rem] items-center justify-center rounded-full ring-2 ring-card transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-ring",
            TONE_SOLID[tone],
          )}
        >
          <X className="size-2.5" strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
}
