"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

const EPSILON = 0.01;

async function renderSection(
  pdf: jsPDF,
  element: HTMLElement,
  isFirst: boolean,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (!isFirst) pdf.addPage();

  let heightRemaining = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightRemaining -= pageHeight;

  while (heightRemaining > EPSILON) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightRemaining -= pageHeight;
  }
}

export async function downloadElementAsPdf(
  root: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });

  const sections = Array.from(
    root.querySelectorAll<HTMLElement>("[data-nda-page]"),
  );
  const elements = sections.length > 0 ? sections : [root];

  for (let i = 0; i < elements.length; i++) {
    await renderSection(pdf, elements[i], i === 0);
  }

  pdf.save(filename);
}
