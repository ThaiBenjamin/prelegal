export type LayoutMetrics = {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  blockGap: number;
  epsilon: number;
};

export const DEFAULT_METRICS: LayoutMetrics = {
  pageWidth: 8.5,
  pageHeight: 11,
  margin: 0.75,
  blockGap: 0.12,
  epsilon: 0.01,
};

export type BlockMeasurement = {
  section: number;
  heightIn: number;
};

export type BlockPlacement = {
  blockIndex: number;
  pageIndex: number;
  y: number;
  heightIn: number;
  oversizedTilePages?: number;
};

export type LayoutResult = {
  placements: BlockPlacement[];
  totalPages: number;
};

export function usableHeight(m: LayoutMetrics): number {
  return m.pageHeight - 2 * m.margin;
}

export function contentWidth(m: LayoutMetrics): number {
  return m.pageWidth - 2 * m.margin;
}

export function usableBottomY(m: LayoutMetrics): number {
  return m.pageHeight - m.margin;
}

export function planLayout(
  blocks: BlockMeasurement[],
  metrics: LayoutMetrics = DEFAULT_METRICS,
): LayoutResult {
  if (blocks.length === 0) {
    return { placements: [], totalPages: 1 };
  }

  const usable = usableHeight(metrics);
  const placements: BlockPlacement[] = [];
  let pageIndex = 0;
  let cursorY = metrics.margin;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prev = i > 0 ? blocks[i - 1] : null;

    if (prev !== null && block.section !== prev.section) {
      pageIndex++;
      cursorY = metrics.margin;
    }

    if (block.heightIn > usable + metrics.epsilon) {
      if (cursorY > metrics.margin + metrics.epsilon) {
        pageIndex++;
        cursorY = metrics.margin;
      }
      const tilePages = Math.ceil(block.heightIn / usable);
      placements.push({
        blockIndex: i,
        pageIndex,
        y: cursorY,
        heightIn: block.heightIn,
        oversizedTilePages: tilePages,
      });
      pageIndex += tilePages - 1;
      const remainder = block.heightIn % usable;
      cursorY = metrics.margin + (remainder < metrics.epsilon ? usable : remainder);
    } else {
      if (cursorY + block.heightIn > usableBottomY(metrics) + metrics.epsilon) {
        pageIndex++;
        cursorY = metrics.margin;
      }
      placements.push({
        blockIndex: i,
        pageIndex,
        y: cursorY,
        heightIn: block.heightIn,
      });
      cursorY += block.heightIn;
    }

    const next = i < blocks.length - 1 ? blocks[i + 1] : null;
    const sameSectionNext = next !== null && next.section === block.section;
    if (sameSectionNext) cursorY += metrics.blockGap;
  }

  return { placements, totalPages: pageIndex + 1 };
}
