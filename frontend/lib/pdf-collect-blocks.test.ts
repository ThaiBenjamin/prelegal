import { describe, it, expect, vi } from "vitest";

vi.mock("html2canvas-pro", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ default: vi.fn() }));

import { collectBlocks } from "./pdf";

function makeDom(html: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper.firstElementChild as HTMLElement;
}

describe("collectBlocks", () => {
  it("flattens [data-nda-block] children inside [data-nda-page] sections, tagging each with its section index", () => {
    const root = makeDom(`
      <div>
        <section data-nda-page="cover">
          <div data-nda-block>A</div>
          <div data-nda-block>B</div>
        </section>
        <section data-nda-page="terms">
          <div data-nda-block>1</div>
          <div data-nda-block>2</div>
          <div data-nda-block>3</div>
        </section>
      </div>
    `);
    const flat = collectBlocks(root);
    expect(flat.map((b) => b.section)).toEqual([0, 0, 1, 1, 1]);
    expect(flat.map((b) => b.element.textContent)).toEqual([
      "A",
      "B",
      "1",
      "2",
      "3",
    ]);
  });

  it("falls back to the section element itself when it has no [data-nda-block] children", () => {
    const root = makeDom(`
      <div>
        <section data-nda-page="cover">No blocks here.</section>
      </div>
    `);
    const flat = collectBlocks(root);
    expect(flat).toHaveLength(1);
    expect(flat[0].section).toBe(0);
  });

  it("falls back to the root element when there are no [data-nda-page] sections", () => {
    const root = makeDom(`<div>just some text</div>`);
    const flat = collectBlocks(root);
    expect(flat).toHaveLength(1);
    expect(flat[0].element).toBe(root);
    expect(flat[0].section).toBe(0);
  });
});
