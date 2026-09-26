"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { useBranchReportSelection } from "@/components/dashboard/BranchReportPicker";
import { AskAssistantButton } from "@/components/ui/ask-assistant-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { hasProduct } from "@/lib/auth-user";
import { postDashboardAssistantMessage } from "@/lib/dashboard-assistant/client";
import { prefetchAssistantSalesReports } from "@/lib/dashboard-assistant/prefetch-sales";
import { readAssistantSalesCache } from "@/lib/dashboard-assistant/sales-cache";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Bugün ciro nasıl?",
  "En çok satan ne?",
  "Yoğun saat hangisi?",
  "Son 7 gün özeti",
] as const;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

let messageSeq = 0;
function nextMessageId() {
  messageSeq += 1;
  return `dash-assistant-${messageSeq}`;
}

type DashboardAssistantChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardAssistantChat({ open, onOpenChange }: DashboardAssistantChatProps) {
  const profileQuery = useAccessProfile();
  const profile = profileQuery.data;
  const entitled =
    hasProduct(profile, "SMART_ASSISTANT") || hasProduct(profile, "QR_AGENT");

  const { branchId, menuId, selection, loading: branchLoading } = useBranchReportSelection(
    null,
    null,
    open,
  );

  const [prefetching, setPrefetching] = useState(false);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const loadReports = useCallback(async () => {
    if (branchId == null) {
      setPrefetchError("Satış raporu için önce bir şube seçin.");
      return;
    }
    setPrefetching(true);
    setPrefetchError(null);
    try {
      await prefetchAssistantSalesReports({
        branchId,
        menuId,
        branchName: selection?.branch.name ?? null,
        menuName: selection?.menu?.businessName ?? null,
      });
    } catch (error) {
      setPrefetchError(error instanceof Error ? error.message : "Satış raporları alınamadı");
    } finally {
      setPrefetching(false);
    }
  }, [branchId, menuId, selection?.branch.name, selection?.menu?.businessName]);

  useEffect(() => {
    if (!open || branchLoading || branchId == null) return;
    void loadReports();
  }, [open, branchLoading, branchId, menuId, loadReports]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || sending) return;

    if (!entitled) {
      setMessages((prev) => [
        ...prev,
        { id: nextMessageId(), role: "assistant", text: "Akıllı asistan paketi bu hesapta aktif değil." },
      ]);
      return;
    }

    if (branchId == null) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: "assistant",
          text: "Önce panelde bir şube tanımlayın; raporlar şube bazlı çekilir.",
        },
      ]);
      return;
    }

    setDraft("");
    setSending(true);
    setMessages((prev) => [...prev, { id: nextMessageId(), role: "user", text: value }]);

    const pendingId = nextMessageId();
    setMessages((prev) => [
      ...prev,
      { id: pendingId, role: "assistant", text: "Satış raporuna bakıyorum…" },
    ]);

    try {
      if (!readAssistantSalesCache(branchId, menuId)) {
        await loadReports();
      }
      const result = await postDashboardAssistantMessage(value, branchId, menuId, {
        conversationId,
      });
      setConversationId(result.conversationId);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId ? { ...message, text: result.reply } : message,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                text: error instanceof Error ? error.message : "Yanıt alınamadı",
              }
            : message,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const branchLabel = selection?.branch.name ?? (branchId != null ? `Şube #${branchId}` : "Şube seçilmedi");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-orange-400 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            İşletme asistanı
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            {branchLabel}
            {prefetching ? " · raporlar güncelleniyor…" : null}
            {prefetchError ? ` · ${prefetchError}` : null}
          </SheetDescription>
        </SheetHeader>

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[14rem] flex-col justify-center gap-3">
              <p className="text-sm text-muted-foreground">
                Sohbet açıldığında bugün, son 7 ve 30 günlük satış özetleri tarayıcıda saklanır;
                sorularınız bu veriye göre yanıtlanır.
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sending || prefetching}
                    onClick={() => void send(prompt)}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground",
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          className="border-t border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="Ciro, ürün veya yoğunluk sor…"
              className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sending}
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

type DashboardAssistantLauncherProps = {
  className?: string;
};

export function DashboardAssistantLauncher({ className }: DashboardAssistantLauncherProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AskAssistantButton
        className={className}
        aria-label="Asistana sor"
        onClick={() => setOpen(true)}
      />
      <DashboardAssistantChat open={open} onOpenChange={setOpen} />
    </>
  );
}
