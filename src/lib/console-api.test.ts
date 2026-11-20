import { describe, expect, it } from "vitest";

import {
  applyDiscount,
  formatDays,
  formatRemaining,
  formatStopwatch,
  livePlayedSeconds,
  parseRateInput,
  remainingSeconds,
} from "@/lib/console-api";

describe("console-api helpers", () => {
  it("reads Turkish and plain amounts", () => {
    expect(parseRateInput("120,50")).toBe("120.50");
    expect(parseRateInput("1.250")).toBe("1250");
    expect(parseRateInput("12.5")).toBe("12.5");
    expect(parseRateInput("1.250,5")).toBe("1250.5");
    expect(parseRateInput("")).toBeNull();
    expect(parseRateInput("-3")).toBeUndefined();
  });

  it("formats a stopwatch", () => {
    expect(formatStopwatch(0)).toBe("0:00:00");
    expect(formatStopwatch(309)).toBe("0:05:09");
    expect(formatStopwatch(5400)).toBe("1:30:00");
  });

  it("keeps a running clock moving but freezes a paused one", () => {
    const fetchedAt = 1_000_000;
    const running = { playedSeconds: 600, paused: false, active: true };
    expect(livePlayedSeconds(running, fetchedAt, fetchedAt + 30_500)).toBe(630);
    expect(livePlayedSeconds({ ...running, paused: true }, fetchedAt, fetchedAt + 30_500)).toBe(600);
    expect(livePlayedSeconds({ ...running, active: false }, fetchedAt, fetchedAt + 30_500)).toBe(600);
  });

  it("counts the planned time down and past zero", () => {
    expect(remainingSeconds(null, 100)).toBeNull();
    expect(remainingSeconds(60, 3000)).toBe(600);
    expect(formatRemaining(600)).toBe("0:10:00 kaldı");
    expect(formatRemaining(-61)).toBe("2 dk aşıldı");
  });

  it("applies a discount without going below zero", () => {
    expect(applyDiscount(190, "percent", "10")).toBe(171);
    expect(applyDiscount(190, "amount", "40,5")).toBe(149.5);
    expect(applyDiscount(30, "amount", "500")).toBe(0);
    expect(applyDiscount(30, "amount", "")).toBe(30);
  });

  it("names common day sets", () => {
    expect(formatDays([1, 2, 3, 4, 5, 6, 7])).toBe("Her gün");
    expect(formatDays([5, 4, 3, 2, 1])).toBe("Hafta içi");
    expect(formatDays([6, 7])).toBe("Hafta sonu");
    expect(formatDays([1, 3])).toBe("Pzt, Çar");
  });
});
