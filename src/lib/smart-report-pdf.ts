import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function markdownToHtmlForTest(markdown: string): string {
  return markdownToHtml(markdown, { inlineStyles: true });
}

export function smartReportMarkdownToHtml(
  markdown: string,
  options?: { inlineStyles?: boolean },
): string {
  return markdownToHtml(markdown, options);
}

function markdownToHtml(
  markdown: string,
  options?: { inlineStyles?: boolean },
): string {
  const styled = options?.inlineStyles !== false;
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const parts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      parts.push(
        styled
          ? `<h3 style="font-size:14px;margin:14px 0 6px;font-weight:700">${escapeHtml(line.slice(4))}</h3>`
          : `<h3>${escapeHtml(line.slice(4))}</h3>`,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      parts.push(
        styled
          ? `<h2 style="font-size:16px;margin:16px 0 8px;font-weight:700">${escapeHtml(line.slice(3))}</h2>`
          : `<h2>${escapeHtml(line.slice(3))}</h2>`,
      );
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      parts.push(
        styled
          ? `<h1 style="font-size:18px;margin:18px 0 10px;font-weight:700">${escapeHtml(line.slice(2))}</h1>`
          : `<h1>${escapeHtml(line.slice(2))}</h1>`,
      );
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        parts.push(
          styled ? '<ul style="margin:0 0 10px;padding-left:18px;list-style:disc outside">' : "<ul>",
        );
        inList = true;
      }
      parts.push(
        styled
          ? `<li style="margin:0 0 4px">${escapeHtml(line.slice(2))}</li>`
          : `<li>${escapeHtml(line.slice(2))}</li>`,
      );
      continue;
    }
    closeList();
    parts.push(
      styled
        ? `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`
        : `<p>${escapeHtml(line)}</p>`,
    );
  }
  closeList();
  return parts.join("");
}

/**
 * Picks page-end offsets (canvas px) for a tall render so pages break in blank
 * space instead of through a line of text. `breakpoints` are safe cut rows in
 * canvas px; a page falls back to a hard cut when none lies in its lower half.
 */
export function planPdfPageSlices(
  totalHeight: number,
  pageHeight: number,
  breakpoints: number[],
): { start: number; end: number }[] {
  const sorted = [...new Set(breakpoints.map((b) => Math.round(b)))].sort((a, b) => a - b);
  const slices: { start: number; end: number }[] = [];
  let start = 0;
  while (start < totalHeight) {
    let end = Math.min(start + pageHeight, totalHeight);
    if (end < totalHeight) {
      const minEnd = start + pageHeight * 0.5;
      for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const candidate = sorted[i];
        if (candidate <= end && candidate > minEnd) {
          end = candidate;
          break;
        }
      }
    }
    slices.push({ start, end });
    start = end;
  }
  return slices;
}

/**
 * Middle rows of horizontal bands that are entirely white in the rendered
 * canvas, i.e. the gaps between lines and blocks. Measured on the pixels
 * themselves because html2canvas layout can drift from the live DOM.
 */
export function blankBandBreakpoints(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  minBand = 4,
): number[] {
  const points: number[] = [];
  let runStart = -1;
  for (let y = 0; y <= height; y += 1) {
    let blank = y < height;
    if (blank) {
      const rowStart = y * width * 4;
      for (let x = 0; x < width * 4; x += 4) {
        const i = rowStart + x;
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          blank = false;
          break;
        }
      }
    }
    if (blank && runStart < 0) runStart = y;
    if (!blank && runStart >= 0) {
      if (y - runStart >= minBand) points.push(Math.floor((runStart + y) / 2));
      runStart = -1;
    }
  }
  return points;
}

export async function downloadSmartReportPdf(input: {
  title: string;
  markdown: string;
  fileName: string;
  /** Line under the title, e.g. scope and period. */
  subtitle?: string;
  prefixHtml?: string;
}): Promise<void> {
  const markdown = input.markdown?.trim() || "";
  if (!markdown && !input.title?.trim() && !input.prefixHtml?.trim()) {
    throw new Error("PDF icin icerik bulunamadi");
  }

  const container = document.createElement("div");
  container.setAttribute("data-smart-report-pdf", "1");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "720px";
  container.style.padding = "24px";
  container.style.boxSizing = "border-box";
  container.style.color = "#111111";
  container.style.background = "#ffffff";
  container.style.fontFamily = "Segoe UI, Arial, Helvetica, sans-serif";
  container.style.fontSize = "12px";
  container.style.lineHeight = "1.5";
  container.style.opacity = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  const subtitle = input.subtitle?.trim()
    ? `<p style="font-size:11px;color:#6b7280;margin:-10px 0 16px">${escapeHtml(input.subtitle.trim())}</p>`
    : "";
  container.innerHTML = `
    <h1 style="font-size:20px;margin:0 0 16px;font-weight:700;color:#111">${escapeHtml(input.title)}</h1>
    ${subtitle}
    ${input.prefixHtml?.trim() || ""}
    <div style="font-size:12px;color:#111">${markdownToHtml(markdown)}</div>
  `;
  document.body.appendChild(container);
  void container.offsetHeight;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(container.scrollWidth, 720),
      windowHeight: Math.max(container.scrollHeight, 1),
      onclone: (_clonedDoc, element) => {
        element.style.opacity = "1";
        element.style.position = "static";
        element.style.left = "auto";
        element.style.top = "auto";
        element.style.zIndex = "auto";
        element.style.pointerEvents = "auto";
        element.style.transform = "none";
        element.style.visibility = "visible";
      },
    });

    if (canvas.width < 2 || canvas.height < 2) {
      throw new Error("PDF olusturulamadi: bos goruntu");
    }

    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    // Canvas pixels per PDF point.
    const pxPerPt = canvas.width / usableWidth;
    const sourceCtx = canvas.getContext("2d");
    const breakpoints = sourceCtx
      ? blankBandBreakpoints(
          sourceCtx.getImageData(0, 0, canvas.width, canvas.height).data,
          canvas.width,
          canvas.height,
        )
      : [];
    const slices = planPdfPageSlices(
      canvas.height,
      Math.floor(usableHeight * pxPerPt),
      breakpoints,
    );

    slices.forEach((slice, index) => {
      const sliceHeight = slice.end - slice.start;
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = sliceHeight;
      const ctx = page.getContext("2d");
      if (!ctx) throw new Error("PDF olusturulamadi: canvas");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, page.width, page.height);
      ctx.drawImage(canvas, 0, slice.start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (index > 0) doc.addPage();
      doc.addImage(
        page.toDataURL("image/jpeg", 0.92),
        "JPEG",
        margin,
        margin,
        usableWidth,
        sliceHeight / pxPerPt,
        undefined,
        "FAST",
      );
    });

    const total = slices.length;
    for (let i = 1; i <= total; i += 1) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${i} / ${total}`, pageWidth - margin, pageHeight - 16, { align: "right" });
    }

    doc.setProperties({ title: input.title, creator: "AlgoryQR" });
    doc.save(input.fileName.endsWith(".pdf") ? input.fileName : `${input.fileName}.pdf`);
  } finally {
    container.remove();
  }
}
