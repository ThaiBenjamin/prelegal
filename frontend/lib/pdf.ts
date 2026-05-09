"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

const PAGE_MARGIN_IN = 0.75;
const BLOCK_GAP_IN = 0.12;
const EPSILON = 0.01;

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

function placeBlockOnPage(
  pdf: jsPDF,
  block: CapturedBlock,
  cursorY: number,
  contentWidth: number,
  pageHeight: number,
): number {
  const blockHeightIn = (block.heightPx * contentWidth) / block.widthPx;
  const usableBottom = pageHeight - PAGE_MARGIN_IN;

  if (blockHeightIn > pageHeight - 2 * PAGE_MARGIN_IN) {
    return placeOversizedBlock(pdf, block, cursorY, contentWidth, pageHeight);
  }

  let y = cursorY;
  if (y + blockHeightIn > usableBottom + EPSILON) {
    pdf.addPage();
    y = PAGE_MARGIN_IN;
  }

  pdf.addImage(
    block.dataUrl,
    "PNG",
    PAGE_MARGIN_IN,
    y,
    contentWidth,
    blockHeightIn,
  );
  return y + blockHeightIn;
}

function placeOversizedBlock(
  pdf: jsPDF,
  block: CapturedBlock,
  cursorY: number,
  contentWidth: number,
  pageHeight: number,
): number {
  const blockHeightIn = (block.heightPx * contentWidth) / block.widthPx;
  const usableHeight = pageHeight - 2 * PAGE_MARGIN_IN;

  if (cursorY > PAGE_MARGIN_IN + EPSILON) {
    pdf.addPage();
  }

  let drawn = 0;
  let isFirstSlice = true;
  while (drawn < blockHeightIn - EPSILON) {
    if (!isFirstSlice) pdf.addPage();
    pdf.addImage(
      block.dataUrl,
      "PNG",
      PAGE_MARGIN_IN,
      PAGE_MARGIN_IN - drawn,
      contentWidth,
      blockHeightIn,
    );
    drawn += usableHeight;
    isFirstSlice = false;
  }
  return PAGE_MARGIN_IN + (blockHeightIn % usableHeight || usableHeight);
}

export async function downloadElementAsPdf(
  root: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * PAGE_MARGIN_IN;

  const sections = Array.from(
    root.querySelectorAll<HTMLElement>("[data-nda-page]"),
  );
  const sectionList = sections.length > 0 ? sections : [root];

  for (let s = 0; s < sectionList.length; s++) {
    if (s > 0) pdf.addPage();
    let cursorY = PAGE_MARGIN_IN;

    const blocks = Array.from(
      sectionList[s].querySelectorAll<HTMLElement>("[data-nda-block]"),
    );
    const targets = blocks.length > 0 ? blocks : [sectionList[s]];

    for (let b = 0; b < targets.length; b++) {
      const captured = await capture(targets[b]);
      cursorY = placeBlockOnPage(
        pdf,
        captured,
        cursorY,
        contentWidth,
        pageHeight,
      );
      if (b < targets.length - 1) cursorY += BLOCK_GAP_IN;
    }
  }

  pdf.save(filename);
}
