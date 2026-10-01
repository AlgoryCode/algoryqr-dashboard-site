import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import type { SearchCompletePayload } from "@/lib/chef/search-complete";
import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";

export type ChefSearchStreamDone = {
  reply?: string;
  conversationId?: string;
  turnId?: string;
  productIds?: number[];
  products?: ChefProductItem[];
  searchComplete?: SearchCompletePayload;
  suggestedProducts?: ChefChatBadge[];
};

export async function consumeChefSearchSse(
  response: Response,
  onReplyDelta: (text: string) => void,
): Promise<ChefSearchStreamDone> {
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: ChefSearchStreamDone = {};

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (event === "reply_delta" && typeof parsed.text === "string") {
        onReplyDelta(parsed.text);
      }
      if (event === "done") {
        donePayload = parsed as ChefSearchStreamDone;
      }
    }
  }

  return donePayload;
}
