"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  DEFAULT_METRICS,
  contentWidth,
  planLayout,
  usableHeight,
  type BlockMeasurement,
  type LayoutMetrics,
} from "./pdf-layout";
import { NDA_BLOCK_ATTR, NDA_PAGE_ATTR } from "./nda-selectors";

type CapturedBlock = { dataUrl: string; widthPx: number; heightPx: number };

async function capture(element: HTMLElement): Promise<CapturedBlock> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthPx: canvas.width,
    heightPx: canvas.height,
  };
}

function maskMargins(pdf: jsPDF, metrics: LayoutMetrics): void {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, metrics.pageWidth, metrics.margin, "F");
  pdf.rect(
    0,
    metrics.pageHeight - metrics.margin,
    metrics.pageWidth,
    metrics.margin,
    "F",
  );
}

export function collectBlocks(
  root: HTMLElement,
): { element: HTMLElement; section: number }[] {
  const sections = Array.from(
    root.querySelectorAll<HTMLElement>(`[${NDA_PAGE_ATTR}]`),
  );
  const sectionList = sections.length > 0 ? sections : [root];
  const flat: { element: HTMLElement; section: number }[] = [];
  for (let s = 0; s < sectionList.length; s++) {
    const blocks = Array.from(
      sectionList[s].querySelectorAll<HTMLElement>(`[${NDA_BLOCK_ATTR}]`),
    );
    const targets = blocks.length > 0 ? blocks : [sectionList[s]];
    for (const element of targets) flat.push({ element, section: s });
  }
  return flat;
}

export async function downloadElementAsPdf(
  root: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });
  const metrics: LayoutMetrics = {
    ...DEFAULT_METRICS,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
  };
  const width = contentWidth(metrics);
  const slice = usableHeight(metrics);

  const flat = collectBlocks(root);
  const captures = await Promise.all(flat.map((b) => capture(b.element)));

  const measurements: BlockMeasurement[] = captures.map((c, i) => ({
    section: flat[i].section,
    heightIn: (c.heightPx * width) / c.widthPx,
  }));

  const { placements } = planLayout(measurements, metrics);

  let currentPage = 0;
  for (const placement of placements) {
    while (currentPage < placement.pageIndex) {
      pdf.addPage();
      currentPage++;
    }

    const cap = captures[placement.blockIndex];

    if (placement.oversizedTilePages) {
      pdf.addImage(
        cap.dataUrl,
        "PNG",
        metrics.margin,
        metrics.margin,
        width,
        placement.heightIn,
      );
      maskMargins(pdf, metrics);
      let drawn = slice;
      while (drawn < placement.heightIn - metrics.epsilon) {
        pdf.addPage();
        currentPage++;
        pdf.addImage(
          cap.dataUrl,
          "PNG",
          metrics.margin,
          metrics.margin - drawn,
          width,
          placement.heightIn,
        );
        maskMargins(pdf, metrics);
        drawn += slice;
      }
    } else {
      pdf.addImage(
        cap.dataUrl,
        "PNG",
        metrics.margin,
        placement.y,
        width,
        placement.heightIn,
      );
    }
  }

  pdf.save(filename);
}
