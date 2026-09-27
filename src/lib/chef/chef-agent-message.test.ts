import { describe, expect, it } from "vitest";

import { buildChefAgentUserMessage } from "./chef-agent-message";

describe("buildChefAgentUserMessage", () => {
  const catalog = [
    { productId: 1, menuId: 1, name: "Burger" },
    { productId: 2, menuId: 1, name: "Kola" },
  ] as const;

  it("adds cart context in default mode", () => {
    const message = buildChefAgentUserMessage("Tatlı öner", "default", [1], [...catalog]);
    expect(message).toContain("Burger");
    expect(message).toContain("Tatlı öner");
  });

  it("uses general mode without requiring cart", () => {
    const message = buildChefAgentUserMessage("", "general", [1], [...catalog]);
    expect(message).toContain("Genel menü önerisi");
    expect(message).toContain("Sepete bakma");
  });
});
