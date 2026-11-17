"use client";

import { Bell, BellOff, Check, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ORDER_TONES, type OrderToneId } from "@/lib/order-sound";
import { cn } from "@/lib/utils";

type Props = {
  soundOn: boolean;
  onSoundOnChange: (next: boolean) => void;
  /** 0–1 */
  volume: number;
  onVolumeChange: (next: number) => void;
  tone: OrderToneId;
  onToneChange: (next: OrderToneId) => void;
  /** Plays `tone`, or the chosen one when left out, at the chosen volume. */
  onPreview: (tone?: OrderToneId) => void;
};

/** The bell next to the orders header: turns the new-order sound on or off, picks the ringtone and sets how loud it is. */
export function OrderSoundControl({
  soundOn,
  onSoundOnChange,
  volume,
  onVolumeChange,
  tone,
  onToneChange,
  onPreview,
}: Props) {
  const percent = Math.round(volume * 100);
  const toneLabel = ORDER_TONES.find((option) => option.id === tone)?.label ?? "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Yeni sipariş sesi ayarları"
          title={soundOn ? `Yeni siparişte ${toneLabel} çalar (%${percent})` : "Ses kapalı"}
        >
          {soundOn ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Yeni sipariş sesi</p>
          <Button
            type="button"
            variant={soundOn ? "default" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => onSoundOnChange(!soundOn)}
            aria-pressed={soundOn}
          >
            {soundOn ? "Açık" : "Kapalı"}
          </Button>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Zil sesi</p>
          <ul role="radiogroup" aria-label="Zil sesi" className="space-y-1">
            {ORDER_TONES.map((option) => {
              const selected = option.id === tone;
              return (
                <li key={option.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!soundOn}
                    data-order-tone={option.id}
                    onClick={() => {
                      onToneChange(option.id);
                      onPreview(option.id);
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors disabled:opacity-50",
                      selected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm leading-tight">{option.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-2 text-xs"
                    disabled={!soundOn}
                    onClick={() => onPreview(option.id)}
                    aria-label={`${option.label} sesini dinle`}
                  >
                    <Play className="size-3" />
                    Dinle
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ses düzeyi</span>
            <span className="tabular-nums">%{percent}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={percent}
            disabled={!soundOn}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
            onPointerUp={() => onPreview()}
            onKeyUp={(event) => {
              if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") onPreview();
            }}
            aria-label="Yeni sipariş sesi düzeyi"
            data-order-sound-volume
            className="w-full accent-primary disabled:opacity-50"
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}
