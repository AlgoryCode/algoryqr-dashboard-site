"use client";

import { useEffect, useState } from "react";
import { ChefHat, Sparkles } from "lucide-react";

import { resolveChefAvatarSrc, resolveChefDisplayName } from "@/lib/chef/chef-identity";
import { MenuChefChat } from "../chef/MenuChefChat";

type PetekChefAskButtonProps = {
  publicId: string;
  chefName?: string | null;
  chefDisplayName?: string | null;
  chefAvatarUrl?: string | null;
};

export function PetekChefAskButton({
  publicId,
  chefName,
  chefDisplayName,
  chefAvatarUrl,
}: PetekChefAskButtonProps) {
  const [open, setOpen] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);
  const displayName = resolveChefDisplayName(chefDisplayName, chefName);
  const avatarSrc = resolveChefAvatarSrc(chefAvatarUrl);

  useEffect(() => {
    if (!open) return;
    const allowScroll = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-chef-scroll]"));
    const onWheel = (event: WheelEvent) => {
      if (!allowScroll(event.target)) event.preventDefault();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!allowScroll(event.target)) event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [open]);

  return (
    <>
      {chatMounted ? (
        <MenuChefChat
          publicId={publicId}
          chefDisplayName={displayName}
          chefAvatarUrl={avatarSrc}
          open={open}
          onClose={() => setOpen(false)}
          themeVariant="petek-waffle"
        />
      ) : null}

      <button
        type="button"
        className="pw-ai-ask"
        aria-label="Waffle asistanına sor"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        disabled={open}
        onClick={() => {
          setChatMounted(true);
          setOpen(true);
        }}
      >
        <span className="pw-ai-ask-icon">
          <ChefHat className="h-5 w-5" strokeWidth={2.1} aria-hidden />
          <Sparkles className="pw-ai-ask-spark" strokeWidth={2.4} aria-hidden />
        </span>
        <span>Waffle asistanına sor</span>
      </button>
    </>
  );
}
