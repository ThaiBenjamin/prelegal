import { describe, it, expect } from "vitest";
import {
  DEFAULT_METRICS,
  contentWidth,
  planLayout,
  usableHeight,
  type BlockMeasurement,
  type LayoutMetrics,
} from "./pdf-layout";

const M: LayoutMetrics = DEFAULT_METRICS;

function block(section: number, heightIn: number): BlockMeasurement {
  return { section, heightIn };
}

describe("metric helpers", () => {
  it("usableHeight = pageHeight - 2*margin", () => {
    expect(usableHeight(M)).toBeCloseTo(11 - 1.5, 6);
  });

  it("contentWidth = pageWidth - 2*margin", () => {
    expect(contentWidth(M)).toBeCloseTo(8.5 - 1.5, 6);
  });
});

describe("planLayout", () => {
  it("returns a single empty page for no blocks", () => {
    expect(planLayout([], M)).toEqual({ placements: [], totalPages: 1 });
  });

  it("places a single short block at the top margin of page 0", () => {
    const result = planLayout([block(0, 2)], M);
    expect(result.totalPages).toBe(1);
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0]).toMatchObject({
      blockIndex: 0,
      pageIndex: 0,
      y: M.margin,
      heightIn: 2,
    });
    expect(result.placements[0].oversizedTilePages).toBeUndefined();
  });

  it("stacks blocks within the same section with a block-gap between them", () => {
    const result = planLayout([block(0, 2), block(0, 1.5)], M);
    expect(result.totalPages).toBe(1);
    expect(result.placements[0].pageIndex).toBe(0);
    expect(result.placements[0].y).toBeCloseTo(M.margin, 6);
    expect(result.placements[1].pageIndex).toBe(0);
    expect(result.placements[1].y).toBeCloseTo(M.margin + 2 + M.blockGap, 6);
  });

  it("starts a fresh page when the next block would overflow the current page", () => {
    const usable = usableHeight(M);
    const result = planLayout(
      [block(0, usable - 0.5), block(0, 1.0)],
      M,
    );
    expect(result.totalPages).toBe(2);
    expect(result.placements[0].pageIndex).toBe(0);
    expect(result.placements[1].pageIndex).toBe(1);
    expect(result.placements[1].y).toBeCloseTo(M.margin, 6);
  });

  it("does not break a paragraph that fits exactly on the current page", () => {
    const usable = usableHeight(M);
    const result = planLayout([block(0, usable)], M);
    expect(result.totalPages).toBe(1);
    expect(result.placements[0].oversizedTilePages).toBeUndefined();
  });

  it("forces a fresh page at section boundaries", () => {
    const result = planLayout([block(0, 1), block(1, 1)], M);
    expect(result.totalPages).toBe(2);
    expect(result.placements[0].pageIndex).toBe(0);
    expect(result.placements[1].pageIndex).toBe(1);
    expect(result.placements[1].y).toBeCloseTo(M.margin, 6);
  });

  it("does NOT add inter-block gap across a section boundary", () => {
    const result = planLayout([block(0, 1), block(1, 1)], M);
    expect(result.placements[1].y).toBeCloseTo(M.margin, 6);
  });

  it("falls back to image tiling when a block exceeds usable page height", () => {
    const usable = usableHeight(M);
    const oversized = usable * 2.5;
    const result = planLayout([block(0, oversized)], M);
    expect(result.placements[0].oversizedTilePages).toBe(3);
    expect(result.totalPages).toBe(3);
  });

  it("starts an oversized block on a fresh page if cursor is mid-page", () => {
    const usable = usableHeight(M);
    const result = planLayout(
      [block(0, 2), block(0, usable + 1)],
      M,
    );
    expect(result.placements[1].pageIndex).toBe(1);
    expect(result.placements[1].y).toBeCloseTo(M.margin, 6);
  });

  it("places oversized block at top of current page when cursor is already at top margin", () => {
    const usable = usableHeight(M);
    const result = planLayout([block(0, usable + 1)], M);
    expect(result.placements[0].pageIndex).toBe(0);
    expect(result.placements[0].y).toBeCloseTo(M.margin, 6);
  });

  it("computes the realistic NDA cover layout with no overflow on page 0", () => {
    const blocks = [
      block(0, 1.4),
      block(0, 0.5),
      block(0, 0.5),
      block(0, 0.5),
      block(0, 0.7),
      block(0, 0.6),
      block(0, 0.4),
      block(0, 1.5),
    ];
    const result = planLayout(blocks, M);
    expect(result.placements.every((p) => p.pageIndex === 0)).toBe(true);
  });

  it("handles many small blocks across multiple pages without losing any", () => {
    const heights = Array.from({ length: 30 }, () => 0.6);
    const blocks = heights.map((h) => block(0, h));
    const result = planLayout(blocks, M);
    expect(result.placements).toHaveLength(30);
    const usable = usableHeight(M);
    for (const p of result.placements) {
      expect(p.y).toBeGreaterThanOrEqual(M.margin - M.epsilon);
      expect(p.y + p.heightIn).toBeLessThanOrEqual(
        M.margin + usable + M.epsilon,
      );
    }
  });

  it("never produces a placement with negative Y", () => {
    const blocks = Array.from({ length: 50 }, (_, i) => block(i % 3, 0.4));
    const result = planLayout(blocks, M);
    for (const p of result.placements) {
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("each placement fits inside usable area unless flagged as tiled", () => {
    const usable = usableHeight(M);
    const blocks = Array.from({ length: 25 }, () => block(0, 1.0));
    const result = planLayout(blocks, M);
    for (const p of result.placements) {
      if (p.oversizedTilePages) continue;
      const bottom = p.y + p.heightIn;
      expect(bottom).toBeLessThanOrEqual(M.margin + usable + M.epsilon);
    }
  });

  it("totalPages reports 1 + maximum pageIndex used", () => {
    const usable = usableHeight(M);
    const result = planLayout(
      [block(0, usable - 0.1), block(0, 0.5), block(0, 0.5)],
      M,
    );
    const max = Math.max(...result.placements.map((p) => p.pageIndex));
    expect(result.totalPages).toBe(max + 1);
  });
});
