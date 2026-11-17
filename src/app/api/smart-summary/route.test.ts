import { describe, expect, it, vi, beforeEach } from "vitest";

const cookiesMock = vi.fn();
const axiosPost = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

vi.mock("axios", () => ({
  default: {
    post: (...args: unknown[]) => axiosPost(...args),
  },
  AxiosError: class AxiosError extends Error {
    code?: string;
    response?: { status: number; data?: unknown };
  },
}));

vi.mock("@/lib/config", () => ({
  AI_SERVICE_BASE_URL: "http://ai.test",
  AI_SERVICE_API_KEY: "test-key",
}));

const gate = vi.fn();
vi.mock("@/lib/server/product-gate", () => ({
  requireProduct: (...args: unknown[]) => gate(...args),
}));

describe("smart-summary BFF", () => {
  beforeEach(() => {
    cookiesMock.mockResolvedValue({});
    axiosPost.mockReset();
    gate.mockResolvedValue({ ok: true, accessToken: "access-token", profile: {} });
  });

  it("POST proxies product object to ai-service and returns description", async () => {
    axiosPost.mockResolvedValue({
      status: 200,
      data: {
        description: "Baharatlı kıymalı klasik lahmacun.",
        model: "gpt-4.1",
        promptVersion: "1:test",
      },
    });

    const { POST } = await import("@/app/api/smart-summary/route");
    const response = await POST(
      new Request("http://localhost/api/smart-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: { name: "Lahmacun", price: "120", currency: "TRY" },
          locale: "tr",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      description: "Baharatlı kıymalı klasik lahmacun.",
      model: "gpt-4.1",
      promptVersion: "1:test",
    });
    expect(axiosPost).toHaveBeenCalledWith(
      "http://ai.test/api/v1/product-descriptions",
      expect.objectContaining({
        product: { name: "Lahmacun", price: "120", currency: "TRY" },
        locale: "tr",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-API-Key": "test-key" }),
      }),
    );
  });

  it("POST rejects missing product name", async () => {
    const { POST } = await import("@/app/api/smart-summary/route");
    const response = await POST(
      new Request("http://localhost/api/smart-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { price: "10" } }),
      }),
    );
    expect(response.status).toBe(400);
    expect(axiosPost).not.toHaveBeenCalled();
  });
  it("refuses callers whose plan lacks SMART_SUMMARY without calling the AI", async () => {
    gate.mockResolvedValue({ ok: false, status: 403, message: "Bu özellik paketinizde yok." });

    const { POST } = await import("@/app/api/smart-summary/route");
    const response = await POST(
      new Request("http://localhost/api/smart-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { name: "Lahmacun" } }),
      }),
    );

    expect(response.status).toBe(403);
    expect(gate).toHaveBeenCalledWith("SMART_SUMMARY");
    expect(axiosPost).not.toHaveBeenCalled();
  });
});
