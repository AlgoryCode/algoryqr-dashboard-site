import { describe, expect, it } from "vitest";

import { buildChefAgentContextMessage } from "./chef-agent-message";

describe("buildChefAgentContextMessage", () => {
  const catalog = [
    { productId: 1, menuId: 1, name: "Burger" },
    { productId: 2, menuId: 1, name: "Kola" },
  ] as const;

  it("adds cart context without embedding the guest sentence", () => {
    const message = buildChefAgentContextMessage("default", [1], [...catalog], "Tatlı öner");
    expect(message).toContain("Burger");
    expect(message).toContain("userQuery");
    expect(message).not.toContain("Tatlı öner");
  });

  it("uses general mode without requiring cart", () => {
    const message = buildChefAgentContextMessage("general", [1], [...catalog]);
    expect(message).toContain("genel öneri");
    expect(message).toContain("Sepete bakma");
  });
});
