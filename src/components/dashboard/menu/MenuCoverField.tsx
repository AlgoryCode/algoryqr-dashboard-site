"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deleteMenuCover, uploadMenuCover } from "@/lib/uploadMenuCover";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type MenuCoverFieldProps = {
  menuId: number;
  value: string | null | undefined;
  onChange: (coverUrl: string | null) => void;
  disabled?: boolean;
};

export function MenuCoverField({
  menuId,
  value,
  onChange,
  disabled = false,
}: MenuCoverFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(value || null);
  }, [value]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Desteklenen formatlar: JPEG, PNG, WebP");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Kapak boyutu en fazla 5 MB olabilir");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (menuId <= 0) {
      setError("Menü seçili değil");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const profile = await uploadMenuCover(menuId, file);
      onChange(profile.coverUrl ?? null);
      setPreviewUrl(profile.coverUrl ?? null);
    } catch (uploadError) {
      setPreviewUrl(value || null);
      setError(uploadError instanceof Error ? uploadError.message : "Kapak yüklenemedi");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) {
      onChange(null);
      setPreviewUrl(null);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      await deleteMenuCover(menuId);
      onChange(null);
      setPreviewUrl(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Kapak silinemedi");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || disabled;

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Kapak görseli</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            "flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30",
            !previewUrl && "border-dashed",
          )}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Kapak görseli"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80 disabled:opacity-50"
            onChange={(e) => void handleFileChange(e)}
          />
          <p className="text-xs text-muted-foreground">
            JPEG, PNG veya WebP · en fazla 5 MB. Menü hero alanında arka plan olarak görünür.
          </p>
          {value ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="w-fit"
              onClick={() => void handleRemove()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kapağı kaldır
            </Button>
          ) : null}
          {uploading ? (
            <p className="text-xs text-muted-foreground">Yükleniyor…</p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
