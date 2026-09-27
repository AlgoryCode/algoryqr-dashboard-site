"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Hand, RotateCcw, ShoppingBag, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  CHEF_WELCOME_MESSAGE,
  clearChefChatSession,
  getChefChatSession,
  setChefChatSession,
  type ChefChatMessage,
} from "@/lib/chef/chef-chat-session";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";
import {
  buildChefAgentUserMessage,
  type ChefAgentRecommendationMode,
} from "@/lib/chef/chef-agent-message";
import { useCartSheetHostOptional, useMenuLocaleOptional, useOrderingOptional } from "../shared";
import { buildChefConversationTranscript } from "@/lib/chef/build-chef-conversation-transcript";
import {
  buildChefPersonalizationContext,
  chefPersonalizationPrefix,
  type ChefMenuLocale,
} from "@/lib/chef/build-chef-personalization-context";
import { consumeChefSearchSse } from "@/lib/chef/consume-chef-search-sse";
import { isChefSearchStreamingEnabled } from "@/lib/chef/chef-funnel-flags";
import { useChefPriorOrderProductIds } from "@/hooks/use-chef-prior-order-product-ids";

import { ChefProductGalleryProvider } from "./ChefProductGallery";
import { MenuChefInlineBadges } from "./MenuChefInlineBadges";
import { assistantCaptionForProductReply } from "@/lib/chef/chef-recommendation-display";
import { recentChefRecommendationProductIds } from "@/lib/chef/recent-chef-recommendation-ids";
import {
  submitChefTurnFeedback,
  type ChefTurnFeedbackValue,
} from "@/lib/chef/submit-chef-turn-feedback";
import { useChefChatAnalytics } from "@/hooks/use-chef-chat-analytics";

import { ChefChatAnalyticsContext } from "./ChefChatAnalyticsContext";
import { ChefChatCatalogProvider } from "./ChefChatCatalogContext";
import { MenuChefCartCoachEffect } from "./MenuChefCartCoachEffect";
import { MenuChefChatTrackedEffects } from "./MenuChefChatTrackedEffects";
import { MenuChefProductCardGrid } from "./MenuChefProductCardGrid";
import { MenuChefRecommendationFeedback } from "./MenuChefRecommendationFeedback";
import { MenuChefQuickBadges } from "./MenuChefQuickBadges";
import { MenuChefAddToast } from "./MenuChefAddToast";
import { MenuChefSearchComplete } from "./MenuChefSearchComplete";
import { useChefChatCatalog } from "./use-chef-chat-catalog";
import { useResolveChefChatProducts } from "./use-resolve-chef-chat-products";
import { isSearchCompleteVisible, type SearchCompletePayload } from "@/lib/chef/search-complete";

type MenuChefChatProps = {
  publicId: string;
  chefDisplayName: string;
  chefAvatarUrl: string;
  open: boolean;
  onClose: () => void;
};

let messageSeq = 0;
function nextId() {
  messageSeq += 1;
  return `chef-msg-${messageSeq}`;
}

const EMPTY_RECOMMENDATION_TEXT =
  "Bu soruya uygun ürün bulamadım. Aşağıdaki hazır filtreleri deneyebilirsiniz.";

function ChefAvatar({
  size = 36,
  src,
  name,
  onClick,
}: {
  size?: number;
  src: string;
  name: string;
  onClick?: () => void;
}) {
  const content = (
    <span
      className="relative block overflow-hidden rounded-full bg-[#e8ebe9] shadow-[inset_0_0_0_1px_rgba(28,40,36,0.06)]"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={name}
        className="h-full w-full object-cover object-top"
      />
    </span>
  );

  if (!onClick) {
    return <span className="shrink-0">{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full transition hover:brightness-[0.97] active:scale-95"
      aria-label="Şef fotoğrafını büyüt"
    >
      {content}
    </button>
  );
}

function ChefAvatarLightbox({
  open,
  src,
  name,
  onClose,
}: {
  open: boolean;
  src: string;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="chef-avatar-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Şef fotoğrafı"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f1613]/72 p-6 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className="relative h-[min(72vw,22rem)] w-[min(72vw,22rem)] overflow-hidden rounded-full bg-[#e8ebe9] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/25"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={name}
              className="h-full w-full object-cover object-top"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const userMotion = {
  initial: { opacity: 0, y: 18, x: 28, scale: 0.88 },
  animate: { opacity: 1, y: 0, x: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.94 },
};

const assistantMotion = {
  initial: { opacity: 0, y: 18, x: -24, scale: 0.88 },
  animate: { opacity: 1, y: 0, x: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.94 },
};

const bubbleShellMotion = {
  initial: { opacity: 0, scale: 0.82, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
};

const bubbleTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 24,
  mass: 0.7,
};

function AssistantBubble({
  msg,
  animateEnter,
  onEntered,
  onAvatarClick,
  chefAvatarUrl,
  chefDisplayName,
  publicId,
  badgesDisabled,
  onBadgeSelect,
  onRecommendationFeedback,
  onQuickAddSuccess,
}: {
  msg: Extract<ChefChatMessage, { role: "assistant" }>;
  animateEnter: boolean;
  onEntered: () => void;
  onAvatarClick: () => void;
  chefAvatarUrl: string;
  chefDisplayName: string;
  publicId: string;
  badgesDisabled: boolean;
  onBadgeSelect: (badge: ChefChatBadge) => void;
  onRecommendationFeedback?: (feedback: ChefTurnFeedbackValue) => void;
  onQuickAddSuccess?: () => void;
}) {
  const onEnteredRef = useRef(onEntered);
  onEnteredRef.current = onEntered;

  const products = msg.products?.length ? msg.products : undefined;
  const displayText = products
    ? assistantCaptionForProductReply(msg.text, products.length, msg.text)
    : msg.text;
  const upsellBadges = msg.upsellBadges?.length ? msg.upsellBadges : undefined;
  const showFeedback = Boolean(msg.showRecommendationFeedback && onRecommendationFeedback);

  return (
    <motion.div
      layout
      initial={animateEnter ? assistantMotion.initial : false}
      animate={assistantMotion.animate}
      exit={assistantMotion.exit}
      transition={bubbleTransition}
      onAnimationComplete={() => onEnteredRef.current()}
      className="flex max-w-[min(100%,34rem)] items-end gap-2.5 origin-bottom-left"
    >
      <motion.div
        initial={animateEnter ? { opacity: 0, scale: 0.55 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...bubbleTransition, delay: 0.02 }}
      >
        <ChefAvatar
          size={28}
          src={chefAvatarUrl}
          name={chefDisplayName}
          onClick={onAvatarClick}
        />
      </motion.div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {displayText || msg.id === "welcome" || msg.showEmptyStateBadges ? (
          <motion.div
            initial={animateEnter ? bubbleShellMotion.initial : false}
            animate={bubbleShellMotion.animate}
            transition={{ ...bubbleTransition, delay: 0.06 }}
            className="origin-bottom-left rounded-[1.35rem] rounded-bl-md border border-white/70 bg-white/80 px-4 py-3 text-[14.5px] leading-relaxed tracking-[-0.01em] text-[#24302c] shadow-[0_8px_28px_rgba(28,40,36,0.05)] backdrop-blur-sm"
          >
            {msg.id === "welcome" ? (
              <p className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#1c2824]">
                <span>Merhaba!</span>
                <Hand className="h-5 w-5 animate-chef-hand-wave text-[#5f7a6d]" aria-hidden />
              </p>
            ) : null}
            {displayText ? (
              <p className="whitespace-pre-wrap">{displayText}</p>
            ) : null}
            {upsellBadges ? (
              <MenuChefInlineBadges
                badges={upsellBadges}
                disabled={badgesDisabled}
                onSelect={onBadgeSelect}
              />
            ) : null}
            {msg.id === "welcome" || msg.showEmptyStateBadges ? (
              <MenuChefQuickBadges
                publicId={publicId}
                disabled={badgesDisabled}
                onSelect={onBadgeSelect}
              />
            ) : null}
          </motion.div>
        ) : null}
        {products ? (
          <motion.div
            initial={animateEnter ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...bubbleTransition, delay: 0.08 }}
          >
            <MenuChefProductCardGrid
              products={products}
              showBlockTitle
              blockTitle="Öneriler"
              onQuickAddSuccess={onQuickAddSuccess}
            />
          </motion.div>
        ) : null}
        {showFeedback ? (
          <MenuChefRecommendationFeedback
            value={msg.feedback}
            disabled={badgesDisabled}
            onSelect={(feedback) => onRecommendationFeedback?.(feedback)}
          />
        ) : null}
        {msg.searchComplete ? (
          <MenuChefSearchComplete visible={isSearchCompleteVisible()} payload={msg.searchComplete} />
        ) : null}
      </div>
    </motion.div>
  );
}

function ChefResetConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="chef-reset-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="chef-reset-title"
          aria-describedby="chef-reset-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-[#0f1613]/55 p-5 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="w-full max-w-[20.5rem] rounded-[1.25rem] border border-white/80 bg-white/95 p-5 text-[#1c2824] shadow-[0_20px_50px_rgba(28,40,36,0.22)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="chef-reset-title" className="text-[16px] font-semibold tracking-[-0.01em]">
              Sohbeti sıfırla?
            </h2>
            <p id="chef-reset-desc" className="mt-2 text-[13.5px] leading-relaxed text-[#5f6f68]">
              Tüm sohbet geçmişi ve öneriler temizlenecek. Bu işlem geri alınamaz.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-9 items-center justify-center rounded-full px-3.5 text-[13px] font-medium text-[#3d4a45] transition hover:bg-[#1c2824]/[0.06]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#2a3833] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#1f2b27]"
              >
                Temizle
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MenuChefChat({
  publicId,
  chefDisplayName,
  chefAvatarUrl,
  open,
  onClose,
}: MenuChefChatProps) {
  const ordering = useOrderingOptional();
  const menuLocale = useMenuLocaleOptional();
  const chefAnalytics = useChefChatAnalytics(publicId);
  const priorOrderProductIds = useChefPriorOrderProductIds(publicId, open);
  const setChefChatCartHost = useCartSheetHostOptional()?.setChefChatActive;
  const {
    menuProducts: chefMenuProducts,
    loading: catalogLoading,
    error: catalogError,
    ready: catalogReady,
  } = useChefChatCatalog(publicId, open);
  const resolveChefChatProducts = useResolveChefChatProducts(publicId, chefMenuProducts);
  const saved = getChefChatSession(publicId);
  const [messages, setMessages] = useState<ChefChatMessage[]>(
    () => saved?.messages ?? [CHEF_WELCOME_MESSAGE],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    () => saved?.conversationId,
  );
  const [sendPulse, setSendPulse] = useState(0);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [addToastOpen, setAddToastOpen] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const enteredIdsRef = useRef(
    new Set<string>(saved?.messages.map((msg) => msg.id) ?? ["welcome"]),
  );

  useEffect(() => {
    setChefChatSession(publicId, { messages, conversationId });
  }, [publicId, messages, conversationId]);

  useEffect(() => {
    setChefChatCartHost?.(open);
    return () => {
      setChefChatCartHost?.(false);
    };
  }, [open, setChefChatCartHost]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch(`/api/menu/chef/badges?publicId=${encodeURIComponent(publicId)}`)
      .then((res) => res.json())
      .then((data: { welcomeMessage?: string }) => {
        if (cancelled || !data.welcomeMessage?.trim()) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === "welcome" && msg.role === "assistant"
              ? { ...msg, text: data.welcomeMessage!.trim() }
              : msg,
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, publicId]);

  useEffect(() => {
    if (!open) {
      setAvatarOpen(false);
      setResetConfirmOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const scrollToBottom = () => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!open) return;
    scrollToBottom();
  }, [messages, loading, open]);

  const canReset =
    Boolean(conversationId) || messages.some((msg) => msg.id !== "welcome");

  const resetChat = () => {
    if (loading) return;
    clearChefChatSession(publicId);
    enteredIdsRef.current = new Set(["welcome"]);
    setConversationId(undefined);
    setInput("");
    setMessages([{ ...CHEF_WELCOME_MESSAGE }]);
    setResetConfirmOpen(false);
  };

  const cartProductIds = ordering?.localItems.map((item) => item.productId) ?? [];

  const handleRecommendationFeedback = (
    messageId: string,
    feedback: ChefTurnFeedbackValue,
  ) => {
    const target = messages.find((entry) => entry.id === messageId);
    if (!target || target.role !== "assistant" || target.feedback === feedback) return;

    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === messageId && entry.role === "assistant"
          ? { ...entry, feedback }
          : entry,
      ),
    );

    chefAnalytics.trackRecommendationFeedback(feedback, {
      turnId: target.turnId,
      messageId,
    });

    if (target.turnId) {
      void submitChefTurnFeedback(publicId, target.turnId, feedback).catch(() => undefined);
    }
  };

  const runAgentSearch = async (
    text: string,
    mode: ChefAgentRecommendationMode,
    options?: { addUserMessage?: boolean; addAssistantToChat?: boolean },
  ) => {
    const addUserMessage = options?.addUserMessage ?? true;
    const addAssistantToChat = options?.addAssistantToChat ?? true;
    const baseAgentMessage = buildChefAgentUserMessage(text, mode, cartProductIds, chefMenuProducts);
    const localeCode = (menuLocale?.locale ?? "tr") as ChefMenuLocale;
    const personalization = buildChefPersonalizationContext(localeCode, priorOrderProductIds);
    const agentMessage = `${chefPersonalizationPrefix(personalization)}\n${baseAgentMessage}`;
    if (!agentMessage.trim() || loading || !catalogReady) return;

    chefAnalytics.trackRecommendationRequest(
      mode === "general" ? "general" : mode === "cart" ? "cart" : "default",
    );

    if (addUserMessage) {
      setSendPulse((value) => value + 1);
      const userLabel =
        mode === "general"
          ? "Genel öneri"
          : mode === "cart" && !text.trim()
            ? "Sepetime uygun öneriler"
            : text.trim();
      setMessages((prev) => [...prev, { id: nextId(), role: "user", text: userLabel }]);
    }

    const recentlyShownProductIds = recentChefRecommendationProductIds(messages);
    const conversationTranscript = buildChefConversationTranscript(messages);
    const searchBody = {
      publicId,
      message: agentMessage,
      conversationId,
      menuProducts: chefMenuProducts,
      cartProductIds,
      recentlyShownProductIds,
      priorOrderProductIds,
      conversationTranscript,
      locale: localeCode,
    };

    setLoading(true);
    setStreamingReply("");
    try {
      const useStream = isChefSearchStreamingEnabled();
      let data: {
        reply?: string;
        conversationId?: string;
        turnId?: string;
        message?: string;
        productIds?: number[];
        products?: ChefProductItem[];
        searchComplete?: SearchCompletePayload;
      } = {};

      if (useStream) {
        const res = await fetch("/api/menu/chef/search/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchBody),
        });
        if (!res.ok) {
          data = (await res.json().catch(() => ({}))) as typeof data;
          if (addAssistantToChat) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: data.message || "Öneri alınamadı. Lütfen tekrar deneyin.",
              },
            ]);
          }
          return;
        }
        data = await consumeChefSearchSse(res, (chunk) => {
          setStreamingReply((prev) => prev + chunk);
        });
      } else {
        const res = await fetch("/api/menu/chef/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchBody),
        });
        data = (await res.json().catch(() => ({}))) as typeof data;
        if (!res.ok) {
          if (addAssistantToChat) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: data.message || "Öneri alınamadı. Lütfen tekrar deneyin.",
              },
            ]);
          }
          return;
        }
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      const reply = data.reply?.trim();
      const products = await resolveChefChatProducts({
        productIds: data.productIds,
        products: data.products,
        searchComplete: data.searchComplete,
      });
      const productList = products?.length ? products : undefined;
      if (productList?.length) {
        chefAnalytics.trackRecommendationShown(productList.length, 0);
      }
      if (addAssistantToChat) {
        const assistantMsg: ChefChatMessage = productList?.length
          ? {
              id: nextId(),
              role: "assistant",
              text: assistantCaptionForProductReply(reply, productList.length),
              products: productList,
              turnId: data.turnId,
              showRecommendationFeedback: true,
              ...(data.searchComplete ? { searchComplete: data.searchComplete } : {}),
            }
          : {
              id: nextId(),
              role: "assistant",
              text: reply?.trim() || EMPTY_RECOMMENDATION_TEXT,
              showEmptyStateBadges: true,
              showRecommendationFeedback: true,
              turnId: data.turnId,
            };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      if (addAssistantToChat) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: "Bağlantı hatası. Lütfen tekrar deneyin.",
          },
        ]);
      }
    } finally {
      setLoading(false);
      setStreamingReply("");
    }
  };

  const showAddToast = () => {
    setAddToastOpen(true);
    window.setTimeout(() => setAddToastOpen(false), 4500);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !catalogReady) return;
    setInput("");
    await runAgentSearch(trimmed, "default");
  };

  const sendGeneralRecommendation = async () => {
    if (loading || !catalogReady) return;
    await runAgentSearch("Bugün için genel ürün önerileri sun.", "general");
  };

  const sendBadge = async (badge: ChefChatBadge) => {
    if (loading || !catalogReady) return;
    chefAnalytics.trackRecommendationRequest("badge");
    setSendPulse((value) => value + 1);
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: badge.label }]);
    const recentlyShownProductIds = recentChefRecommendationProductIds(messages);

    setLoading(true);
    try {
      const res = await fetch("/api/menu/chef/badge-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId,
          badgeId: badge.id,
          recentlyShownProductIds,
          locale: (menuLocale?.locale ?? "tr") as ChefMenuLocale,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        message?: string;
        productIds?: number[];
        products?: ChefProductItem[];
      };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: data.message || "Öneri alınamadı. Lütfen tekrar deneyin.",
          },
        ]);
        return;
      }
      const reply = data.reply?.trim();
      const products = await resolveChefChatProducts({
        productIds: data.productIds,
        products: data.products,
      });
      const productList = products?.length ? products : undefined;
      if (productList?.length) {
        chefAnalytics.trackRecommendationShown(productList.length, 0);
      }
      setMessages((prev) => [
        ...prev,
        productList?.length
          ? {
              id: nextId(),
              role: "assistant",
              text: assistantCaptionForProductReply(reply, productList.length),
              products: productList,
              showRecommendationFeedback: true,
            }
          : {
              id: nextId(),
              role: "assistant",
              text: reply?.trim() || EMPTY_RECOMMENDATION_TEXT,
              showEmptyStateBadges: true,
              showRecommendationFeedback: true,
            },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "Bağlantı hatası. Lütfen tekrar deneyin.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    await sendMessage(text);
  };

  if (!portalReady) return null;

  return createPortal(
    <ChefChatAnalyticsContext.Provider value={chefAnalytics}>
      <ChefChatCatalogProvider catalog={chefMenuProducts}>
        <ChefProductGalleryProvider>
          <MenuChefChatTrackedEffects open={open} conversationId={conversationId} />
          <MenuChefCartCoachEffect
            open={open}
            ordering={ordering}
            chefMenuProducts={chefMenuProducts}
            setMessages={setMessages}
          />
    <AnimatePresence>
      {open ? (
        <motion.div
          key="chef-chat-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#f3f5f4]"
        >
          <div className="relative flex h-full min-h-0 flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.9),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(186,210,198,0.28),_transparent_45%),linear-gradient(180deg,#f7f8f7_0%,#eef1ef_100%)]"
            />

            <header className="relative z-10 border-b border-[#1c2824]/[0.06] bg-white/55 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ChefAvatar
                    size={42}
                    src={chefAvatarUrl}
                    name={chefDisplayName}
                    onClick={() => setAvatarOpen(true)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1c2824]">
                      {chefDisplayName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#5f6f68]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span
                          className={`absolute inline-flex h-full w-full rounded-full ${
                            catalogLoading
                              ? "animate-ping bg-amber-400/70 opacity-70"
                              : "animate-ping bg-emerald-400/70 opacity-70"
                          }`}
                        />
                        <span
                          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                            catalogReady ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                      </span>
                      {catalogLoading
                        ? "Menü ürünleri yükleniyor…"
                        : catalogReady
                          ? `Menü hazır · ${chefMenuProducts.length} ürün`
                          : catalogError || "Menü yüklenemedi"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {ordering ? (
                    <button
                      type="button"
                      onClick={() => {
                        chefAnalytics.trackCartOpen("header");
                        ordering.setCartOpen(true);
                      }}
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1c2824]/[0.04] text-[#3d4a45] transition hover:bg-[#1c2824]/[0.08] hover:text-[#1c2824]"
                      aria-label="Sepet"
                    >
                      <ShoppingBag className="h-4 w-4" strokeWidth={2.1} aria-hidden />
                      {ordering.cartCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-[#2a3833] px-1 text-[10px] font-semibold leading-none text-white">
                          {ordering.cartCount > 99 ? "99+" : ordering.cartCount}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canReset || loading) return;
                      setResetConfirmOpen(true);
                    }}
                    disabled={!canReset || loading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1c2824]/[0.04] px-3 text-[12px] font-medium text-[#3d4a45] transition hover:bg-[#1c2824]/[0.08] hover:text-[#1c2824] disabled:pointer-events-none disabled:opacity-35"
                    aria-label="Sohbeti sıfırla"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
                    <span className="hidden sm:inline">Sıfırla</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1c2824]/[0.04] text-[#3d4a45] transition hover:bg-[#1c2824]/[0.08] hover:text-[#1c2824]"
                    aria-label="Kapat"
                  >
                    <X className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </div>
              </div>
            </header>

            <div
              ref={listRef}
              data-chef-scroll
              className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => {
                    const shouldEnter = !enteredIdsRef.current.has(msg.id);
                    const markEntered = () => {
                      enteredIdsRef.current.add(msg.id);
                    };
                    if (msg.role === "assistant") {
                      return (
                        <AssistantBubble
                          key={msg.id}
                          msg={msg}
                          animateEnter={shouldEnter}
                          onEntered={markEntered}
                          onAvatarClick={() => setAvatarOpen(true)}
                          chefAvatarUrl={chefAvatarUrl}
                          chefDisplayName={chefDisplayName}
                          publicId={publicId}
                          badgesDisabled={loading || !catalogReady}
                          onBadgeSelect={(badge) => {
                            void sendBadge(badge);
                          }}
                          onRecommendationFeedback={
                            msg.showRecommendationFeedback
                              ? (feedback) => handleRecommendationFeedback(msg.id, feedback)
                              : undefined
                          }
                          onQuickAddSuccess={showAddToast}
                        />
                      );
                    }
                    return (
                      <motion.div
                        key={msg.id}
                        layout
                        initial={shouldEnter ? userMotion.initial : false}
                        animate={userMotion.animate}
                        exit={userMotion.exit}
                        transition={bubbleTransition}
                        onAnimationComplete={markEntered}
                        className="ml-auto flex max-w-[min(100%,28rem)] justify-end origin-bottom-right"
                      >
                        <motion.div
                          initial={shouldEnter ? bubbleShellMotion.initial : false}
                          animate={bubbleShellMotion.animate}
                          transition={{ ...bubbleTransition, delay: 0.04 }}
                          className="origin-bottom-right whitespace-pre-wrap rounded-[1.35rem] rounded-br-md bg-[#2a3833] px-4 py-3 text-[14.5px] leading-relaxed tracking-[-0.01em] text-[#f4f7f5] shadow-[0_10px_28px_rgba(28,40,36,0.14)]"
                        >
                          {msg.text}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <AnimatePresence>
                  {loading ? (
                    <motion.div
                      key="chef-typing"
                      initial={{ opacity: 0, y: 10, x: -8 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={bubbleTransition}
                      className="flex items-end gap-2.5"
                    >
                      <ChefAvatar
                        size={28}
                        src={chefAvatarUrl}
                        name={chefDisplayName}
                        onClick={() => setAvatarOpen(true)}
                      />
                      <div className="max-w-[min(100%,28rem)] rounded-[1.35rem] rounded-bl-md border border-white/70 bg-white/80 px-4 py-3.5 shadow-[0_8px_28px_rgba(28,40,36,0.05)] backdrop-blur-sm">
                        {streamingReply ? (
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#24302c]">
                            {streamingReply}
                          </p>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="animate-chef-typing-dot h-1.5 w-1.5 rounded-full bg-[#8a9a93] [animation-delay:0ms]" />
                            <span className="animate-chef-typing-dot h-1.5 w-1.5 rounded-full bg-[#8a9a93] [animation-delay:140ms]" />
                            <span className="animate-chef-typing-dot h-1.5 w-1.5 rounded-full bg-[#8a9a93] [animation-delay:280ms]" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {ordering ? (
              <div className="relative z-10 border-t border-[#1c2824]/[0.06] bg-white/70 px-4 pt-2 backdrop-blur-xl">
                <div className="mx-auto max-w-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      chefAnalytics.trackCartOpen("complete_cta");
                      ordering.setCartOpen(true);
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2a3833] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_24px_rgba(28,40,36,0.12)] transition hover:bg-[#1f2b27]"
                  >
                    <ShoppingBag className="h-4 w-4" strokeWidth={2.1} />
                    Siparişi tamamla
                    {ordering.cartCount > 0 ? (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[12px] tabular-nums">
                        {ordering.cartCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            ) : null}

            <form
              className="relative z-10 border-t border-[#1c2824]/[0.06] bg-white/60 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <div className="mx-auto mb-2 flex max-w-2xl justify-start">
                <button
                  type="button"
                  disabled={loading || !catalogReady}
                  onClick={() => void sendGeneralRecommendation()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#1c2824]/10 bg-white/90 px-3 py-1.5 text-[12.5px] font-medium text-[#2a3833] shadow-sm transition hover:bg-white disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#5f7a6d]" strokeWidth={2} aria-hidden />
                  Öneri
                </button>
              </div>
              <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-[#1c2824]/[0.08] bg-white/90 p-1.5 shadow-[0_10px_30px_rgba(28,40,36,0.06)]">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    catalogLoading
                      ? "Menü ürünleri yükleniyor…"
                      : catalogReady
                        ? "Ne önerelim? Örn. etli ürünler"
                        : "Menü hazır değil, lütfen bekleyin"
                  }
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[14.5px] text-[#1c2824] outline-none placeholder:text-[#8a9a93]"
                  disabled={loading || !catalogReady}
                />
                <motion.button
                  key={sendPulse}
                  type="submit"
                  disabled={loading || !catalogReady || !input.trim()}
                  initial={sendPulse > 0 ? { scale: 0.86 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 18 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a3833] text-white transition enabled:hover:bg-[#1f2b27] disabled:opacity-35"
                  aria-label="Gönder"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </motion.button>
              </div>
            </form>

            <ChefAvatarLightbox
              open={avatarOpen}
              src={chefAvatarUrl}
              name={chefDisplayName}
              onClose={() => setAvatarOpen(false)}
            />
            <ChefResetConfirm
              open={resetConfirmOpen}
              onCancel={() => setResetConfirmOpen(false)}
              onConfirm={resetChat}
            />
            <MenuChefAddToast
              open={addToastOpen}
              onDismiss={() => setAddToastOpen(false)}
              onOpenCart={
                ordering
                  ? () => {
                      chefAnalytics.trackCartOpen("cross_sell");
                      ordering.setCartOpen(true);
                      setAddToastOpen(false);
                    }
                  : undefined
              }
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
        </ChefProductGalleryProvider>
      </ChefChatCatalogProvider>
    </ChefChatAnalyticsContext.Provider>,
    document.body,
  );
}
