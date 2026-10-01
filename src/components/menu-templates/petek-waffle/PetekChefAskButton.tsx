"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";

import { resolveChefAvatarSrc } from "@/lib/chef/chef-identity";
import { MenuChefChat } from "../chef/MenuChefChat";

type PetekChefAskButtonProps = {
  publicId: string;
  chefName?: string | null;
  chefDisplayName?: string | null;
  chefAvatarUrl?: string | null;
};

const PROMPTS = [
  "Tatlı mı tuzlu mu çekiyor?",
  "200 ₺ altına ne var?",
  "Çocuğa ne önerirsin?",
  "Dondurmalı olanı var mı?",
  "İlk kez geldim, ne yesem?",
] as const;

function WaffleMascot() {
  return (
    <svg className="pw-ai-mascot" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="62.5" rx="22" ry="2" fill="#000" opacity=".13" />
      <path className="pw-ai-stm" style={{ "--x": "0s" } as CSSProperties} d="M18 9q-4-3 0-7" />
      <path className="pw-ai-stm" style={{ "--x": ".12s" } as CSSProperties} d="M32 7q-4-3 0-7" />
      <path className="pw-ai-stm" style={{ "--x": ".24s" } as CSSProperties} d="M46 9q-4-3 0-7" />
      <rect x="12" y="57" width="9" height="4" rx="2" fill="#5fb89a" />
      <rect x="43" y="57" width="9" height="4" rx="2" fill="#5fb89a" />
      <rect x="6" y="34" width="52" height="26" rx="9" fill="#8fd8bd" />
      <rect x="10" y="30" width="44" height="9" rx="3" fill="#efc47e" />
      <path d="M10 34.5h44M24 30v9M38 30v9" stroke="#c98f3e" strokeWidth="1.5" opacity=".8" />
      <g className="pw-ai-lid"><rect x="6" y="14" width="52" height="20" rx="9" fill="#ffb3c6" /><path d="M8 24h48M23 14v20M41 14v20" stroke="#ff8fb0" strokeWidth="2" opacity=".8" /><rect x="25" y="9" width="14" height="7" rx="3.5" fill="#e8527a" /></g>
      <circle cx="56" cy="34" r="2.2" fill="#5fb89a" />
      {[23, 41].map((x) => <g key={x} className="pw-ai-eye"><ellipse cx={x} cy="47" rx="4.6" ry="5.4" fill="#fff" /><g className="pw-ai-pu"><circle cx={x} cy="47.4" r="2.9" fill="#4a1d2e" /><circle cx={x + 1} cy="46" r=".9" fill="#fff" /></g></g>)}
      <circle cx="13" cy="53" r="3" fill="#ff9fb7" opacity=".85" /><circle cx="51" cy="53" r="3" fill="#ff9fb7" opacity=".85" />
      <path d="M28.5 53q3.5 3.5 7 0" stroke="#4a1d2e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="56" cy="10" r="7" fill="#d93f6b" /><text x="56" y="14" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Fredoka">?</text>
    </svg>
  );
}

export function PetekChefAskButton({
  publicId,
  chefName,
  chefDisplayName,
  chefAvatarUrl,
}: PetekChefAskButtonProps) {
  const [open, setOpen] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number }>();
  const mascotRef = useRef<HTMLElement | null>(null);
  const displayName = "Waffle asistanı";
  const avatarSrc = resolveChefAvatarSrc(chefAvatarUrl);

  const openAssistant = (source?: HTMLElement | null) => {
    if (source) {
      const rect = source.getBoundingClientRect();
      setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    setChatMounted(true);
    setOpen(true);
  };

  useEffect(() => {
    const svg = mascotRef.current;
    if (!svg) return;
    const pupils = [...svg.querySelectorAll<SVGGElement>(".pw-ai-pu")];
    const look = (x: number, y: number) => {
      const rect = svg.getBoundingClientRect();
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height * 0.6);
      const distance = Math.hypot(dx, dy) || 1;
      const shift = Math.min(1, distance / 140) * 2.8;
      pupils.forEach((pupil) => {
        pupil.style.transform = `translate(${((dx / distance) * shift).toFixed(2)}px,${((dy / distance) * shift).toFixed(2)}px)`;
      });
    };
    const onMove = (event: PointerEvent) => look(event.clientX, event.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const onPromptOpen = () => openAssistant();
    window.addEventListener("petek-waffle-open-assistant", onPromptOpen);
    return () => window.removeEventListener("petek-waffle-open-assistant", onPromptOpen);
  }, []);

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
          origin={origin}
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
        onClick={(event) => openAssistant(event.currentTarget)}
      >
        <span ref={mascotRef} className="pw-ai-mascot-wrap">
          <WaffleMascot />
        </span>
      </button>
      <span className="pw-ai-label" aria-hidden={open}>Asistana sor</span>
    </>
  );
}

export function PetekChefPromptBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % PROMPTS.length), 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <button
      type="button"
      className="pw-ai-prompt"
      aria-label="Waffle asistanına soru sor"
      onClick={() => window.dispatchEvent(new Event("petek-waffle-open-assistant"))}
    >
      <Sparkles className="pw-ai-prompt-icon" strokeWidth={2.1} aria-hidden />
      <span key={PROMPTS[index]}>{PROMPTS[index]}</span>
      <b>Sor</b>
    </button>
  );
}
