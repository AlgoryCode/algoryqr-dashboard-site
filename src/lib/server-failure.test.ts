import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { isServerFailure, isServerStatus } from "@/lib/server-failure";

describe("isServerFailure", () => {
  it("treats network loss and 5xx as server failures", () => {
    expect(isServerStatus(0)).toBe(true);
    expect(isServerStatus(500)).toBe(true);
    expect(isServerStatus(503)).toBe(true);
    expect(isServerFailure(new ApiError(500, "Sunucu hatası"))).toBe(true);
    expect(isServerFailure(new ApiError(0, "Network Error"))).toBe(true);
    expect(isServerFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isServerFailure({ code: "ECONNABORTED" })).toBe(true);
    expect(isServerFailure({ response: null })).toBe(true);
  });

  it("leaves package, permission, and validation errors outside server failures", () => {
    expect(isServerStatus(400)).toBe(false);
    expect(isServerStatus(401)).toBe(false);
    expect(isServerStatus(403)).toBe(false);
    expect(isServerStatus(404)).toBe(false);
    expect(isServerFailure(new ApiError(403, "Paket gerekli"))).toBe(false);
    expect(isServerFailure(new ApiError(404, "Bulunamadı"))).toBe(false);
    expect(isServerFailure(new Error("Şube hakkı yok"))).toBe(false);
  });
});
