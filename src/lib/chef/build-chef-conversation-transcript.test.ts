import { describe, expect, it } from "vitest";

import { buildChefConversationTranscript } from "./build-chef-conversation-transcript";
import type { ChefChatMessage } from "./chef-chat-session";

describe("buildChefConversationTranscript", () => {
  it("includes recent user and assistant turns", () => {
    const messages: ChefChatMessage[] = [
      { id: "welcome", role: "assistant", text: "Merhaba" },
      { id: "u1", role: "user", text: "Vegan öner" },
      { id: "a1", role: "assistant", text: "Birkaç seçenek", products: [{ productId: 1, menuId: 1, name: "A", price: 1, currency: "TRY", description: null, subCategoryId: null, imageUrl: null, available: true }] },
    ];
    const transcript = buildChefConversationTranscript(messages);
    expect(transcript).toContain("Vegan öner");
    expect(transcript).toContain("1 ürün önerildi");
  });
});
