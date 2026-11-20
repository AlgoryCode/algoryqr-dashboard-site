import { describe, expect, it } from "vitest";

import {
  applyDiscount,
  cashDifference,
  daysSince,
  deviceQrLink,
  formatDays,
  gamesForDevice,
  matchesByRound,
  packagesForDevice,
  quoteQuery,
  roundLabel,
  type DeviceGame,
  type DevicePackage,
  type TournamentMatch,
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

  it("asks the quote only for the chosen options", () => {
    expect(quoteQuery({})).toBe("");
    expect(quoteQuery({ useLoyaltyMinutes: false, useBonusBalance: true })).toBe("?useBonusBalance=true");
    expect(quoteQuery({ useMembershipMinutes: true, discountPercent: "10" })).toBe(
      "?useMembershipMinutes=true&discountPercent=10",
    );
    expect(quoteQuery({ discountAmount: "12.5", discountPercent: "10" })).toBe("?discountAmount=12.5");
  });

  it("builds the device QR link", () => {
    expect(deviceQrLink("https://qr.algorycode.com/", "abc 1")).toBe("https://qr.algorycode.com/cihaz/abc%201");
    expect(deviceQrLink("https://qr.algorycode.com", "tok")).toBe("https://qr.algorycode.com/cihaz/tok");
  });

  it("offers active packages of the device type, usable ones first", () => {
    const base = { branchId: 1, days: [], startTime: null, endTime: null, active: true, availableNow: true };
    const packages: DevicePackage[] = [
      { ...base, id: 1, name: "PC 3 saat", deviceType: "PC", minutes: 180, price: 150 },
      { ...base, id: 2, name: "Gece", deviceType: null, minutes: 240, price: 200, availableNow: false },
      { ...base, id: 3, name: "PS 2 saat", deviceType: "PLAYSTATION", minutes: 120, price: "120" },
      { ...base, id: 4, name: "Kapalı", deviceType: null, minutes: 60, price: 10, active: false },
      { ...base, id: 5, name: "Her tür", deviceType: null, minutes: 60, price: 50 },
    ];
    expect(packagesForDevice(packages, "PLAYSTATION").map((p) => p.id)).toEqual([5, 3, 2]);
  });

  it("puts the games installed on the device first", () => {
    const games: DeviceGame[] = [
      { id: 1, branchId: 1, name: "Zelda", consoleIds: [] },
      { id: 2, branchId: 1, name: "FIFA", consoleIds: [7] },
      { id: 3, branchId: 1, name: "Çiftlik", consoleIds: [] },
    ];
    expect(gamesForDevice(games, 7).map((g) => [g.game.id, g.installed])).toEqual([
      [2, true],
      [3, false],
      [1, false],
    ]);
  });

  it("groups a bracket by round and names the last rounds", () => {
    const match = (id: number, round: number, position: number): TournamentMatch => ({
      id,
      round,
      position,
      ready: false,
    });
    const grouped = matchesByRound([match(3, 2, 0), match(2, 1, 1), match(1, 1, 0)]);
    expect(grouped.map((r) => [r.round, r.matches.map((m) => m.id)])).toEqual([
      [1, [1, 2]],
      [2, [3]],
    ]);
    expect(roundLabel(3, 3)).toBe("Final");
    expect(roundLabel(2, 3)).toBe("Yarı final");
    expect(roundLabel(2, 4)).toBe("Çeyrek final");
    expect(roundLabel(1, 4)).toBe("1. tur");
  });

  it("tells the cash difference and days since a visit", () => {
    expect(cashDifference(1250.5, "1.300")).toBe(49.5);
    expect(cashDifference("100", "90,25")).toBe(-9.75);
    expect(cashDifference(100, "")).toBeNull();
    expect(cashDifference(100, "abc")).toBeNull();
    const now = new Date("2026-11-20T12:00:00");
    expect(daysSince("2026-11-10T13:00:00", now)).toBe(9);
    expect(daysSince(null, now)).toBeNull();
  });
});
