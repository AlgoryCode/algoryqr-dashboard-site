"use client";

import { Bell, BellOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  soundOn: boolean;
  onSoundOnChange: (next: boolean) => void;
  /** 0–1 */
  volume: number;
  onVolumeChange: (next: number) => void;
  onPreview: (volume?: number) => void;
};

/** The bell next to the orders header: turns the new-order sound on or off and sets how loud it is. */
export function OrderSoundControl({ soundOn, onSoundOnChange, volume, onVolumeChange, onPreview }: Props) {
  const percent = Math.round(volume * 100);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Yeni sipariş sesi ayarları"
          title={soundOn ? `Yeni siparişte ses çalar (%${percent})` : "Ses kapalı"}
        >
          {soundOn ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full gap-1.5"
          disabled={!soundOn}
          onClick={() => onPreview()}
        >
          <Volume2 className="size-4" />
          Sesi dene
        </Button>
      </PopoverContent>
    </Popover>
  );
}
