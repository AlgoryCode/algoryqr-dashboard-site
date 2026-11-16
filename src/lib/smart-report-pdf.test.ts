import { describe, expect, it } from "vitest";

import {
  blankBandBreakpoints,
  markdownToHtmlForTest,
  planPdfPageSlices,
} from "./smart-report-pdf";

describe("smart-report-pdf helpers", () => {
  it("converts markdown headings", () => {
    const html = markdownToHtmlForTest("# Başlık\n\n- madde");
    expect(html).toMatch(/<h1\b/);
    expect(html).toMatch(/<li\b/);
    expect(html).toContain("Başlık");
    expect(html).toContain("madde");
  });

  it("escapes HTML while keeping Turkish characters", () => {
    const html = markdownToHtmlForTest("Şube <b>ığüşöç</b> İĞÜŞÖÇ");
    expect(html).toContain("Şube &lt;b&gt;ığüşöç&lt;/b&gt; İĞÜŞÖÇ");
  });

  it("breaks pages at block boundaries instead of mid-line", () => {
    const slices = planPdfPageSlices(2500, 1000, [300, 900, 1050, 1800, 2500]);
    expect(slices).toEqual([
      { start: 0, end: 900 },
      { start: 900, end: 1800 },
      { start: 1800, end: 2500 },
    ]);
  });

  it("falls back to a hard cut when no block ends in the lower half of a page", () => {
    expect(planPdfPageSlices(2100, 1000, [100, 2100])).toEqual([
      { start: 0, end: 1000 },
      { start: 1000, end: 2000 },
      { start: 2000, end: 2100 },
    ]);
  });

  it("finds blank bands between inked rows", () => {
    const width = 2;
    // 1 = a row with ink, 0 = an all-white row.
    const rows = [1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1];
    const data = new Uint8ClampedArray(width * rows.length * 4).fill(255);
    rows.forEach((ink, y) => {
      if (ink) data[y * width * 4] = 0;
    });
    expect(blankBandBreakpoints(data, width, rows.length, 4)).toEqual([4, 12]);
  });
});
