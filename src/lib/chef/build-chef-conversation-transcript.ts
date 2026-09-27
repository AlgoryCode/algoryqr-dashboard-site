import type { ChefChatMessage } from "@/lib/chef/chef-chat-session";

const MAX_TURNS = 6;
const MAX_CHARS = 1200;

/**
 * Token-limited transcript for qr-agent context (last user/assistant turns).
 */
export function buildChefConversationTranscript(messages: ChefChatMessage[]): string {
  const lines: string[] = [];

  for (let i = messages.length - 1; i >= 0 && lines.length < MAX_TURNS * 2; i--) {
    const msg = messages[i];
    if (msg.id === "welcome" || msg.id.startsWith("coach-")) continue;

    if (msg.role === "user") {
      lines.unshift(`Misafir: ${msg.text.trim()}`);
    } else {
      const productHint = msg.products?.length
        ? ` [${msg.products.length} ürün önerildi]`
        : "";
      lines.unshift(`Şef: ${msg.text.trim()}${productHint}`);
    }
  }

  let body = lines.join("\n");
  if (body.length > MAX_CHARS) {
    body = body.slice(body.length - MAX_CHARS);
    const cut = body.indexOf("\n");
    if (cut > 0) body = body.slice(cut + 1);
  }
  return body;
}
