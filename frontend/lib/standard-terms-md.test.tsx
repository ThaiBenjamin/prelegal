import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderStandardTermsMarkdown } from "./standard-terms-md";

function Wrapper({ md }: { md: string }) {
  return <div>{renderStandardTermsMarkdown(md)}</div>;
}

describe("renderStandardTermsMarkdown", () => {
  it("renders the H1 title", () => {
    render(<Wrapper md={"# Pilot Agreement\n"} />);
    expect(
      screen.getByRole("heading", { name: "Pilot Agreement" }),
    ).toBeInTheDocument();
  });

  it("strips inline <span> wrappers but keeps their text", () => {
    render(
      <Wrapper
        md={
          '1. <span class="header_2">Overview</span> The <span class="coverpage_link">Provider</span> grants access.\n'
        }
      />,
    );
    expect(
      screen.getByText(/Overview The Provider grants access/i),
    ).toBeInTheDocument();
  });

  it("renders **bold** runs as <strong>", () => {
    const { container } = render(
      <Wrapper md={"1. **Term and Termination** body.\n"} />,
    );
    const strongs = container.querySelectorAll("strong");
    expect(
      Array.from(strongs).some((el) => el.textContent === "Term and Termination"),
    ).toBe(true);
  });

  it("indents nested numbered items more than top-level items", () => {
    const md = "1. Top.\n    1. Nested.\n        a. Deep.\n";
    const { container } = render(<Wrapper md={md} />);
    const items = container.querySelectorAll("div[style*='margin-left']");
    const lefts = Array.from(items).map((el) =>
      (el as HTMLElement).style.marginLeft,
    );
    expect(lefts).toContain("0px");
    expect(lefts).toContain("1.5rem");
    expect(lefts).toContain("3rem");
  });
});
