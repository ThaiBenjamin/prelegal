import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { NdaPreview } from "./nda-preview";
import { defaultFormData } from "@/lib/nda-defaults";
import type { NdaFormData } from "@/lib/nda-types";

function build(overrides: Partial<NdaFormData> = {}): NdaFormData {
  return { ...defaultFormData, ...overrides };
}

describe("<NdaPreview />", () => {
  it("renders both cover and standard-terms sections marked for PDF capture", () => {
    const { container } = render(<NdaPreview data={build()} />);
    expect(
      container.querySelector('[data-nda-page="cover"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-nda-page="terms"]'),
    ).toBeInTheDocument();
  });

  it("emits at least one [data-nda-block] for every numbered standard term", () => {
    const { container } = render(<NdaPreview data={build()} />);
    const terms = container.querySelector('[data-nda-page="terms"]')!;
    const blocks = within(terms as HTMLElement).getAllByText(
      /^\d+\./,
      { selector: "b" },
    );
    expect(blocks.length).toBeGreaterThanOrEqual(11);
  });

  it("displays the entered company names in the signature blocks", () => {
    render(
      <NdaPreview
        data={build({
          party1: { ...defaultFormData.party1, company: "Acme, Inc." },
          party2: { ...defaultFormData.party2, company: "Globex Corp." },
        })}
      />,
    );
    expect(screen.getByText("Acme, Inc.")).toBeInTheDocument();
    expect(screen.getByText("Globex Corp.")).toBeInTheDocument();
  });

  it("shows the placeholder for missing governing law", () => {
    render(<NdaPreview data={build({ governingLawState: "" })} />);
    expect(
      screen.getAllByText(/State of \[Fill in state\]/i).length,
    ).toBeGreaterThan(0);
  });

  it("substitutes the user's governing law into both the cover page and section 9 of the terms", () => {
    render(<NdaPreview data={build({ governingLawState: "Delaware" })} />);
    const matches = screen.getAllByText(/State of Delaware/);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the modifications block only when modifications text is present", () => {
    const { rerender, container } = render(
      <NdaPreview data={build({ modifications: "" })} />,
    );
    expect(
      within(container).queryByText("MNDA Modifications"),
    ).not.toBeInTheDocument();

    rerender(
      <NdaPreview data={build({ modifications: "Section 5 redlined." })} />,
    );
    expect(screen.getByText("MNDA Modifications")).toBeInTheDocument();
    expect(screen.getByText("Section 5 redlined.")).toBeInTheDocument();
  });

  it("shows 'Continues until terminated' when MNDA term is open-ended", () => {
    render(
      <NdaPreview
        data={build({ mndaTerm: { kind: "until-terminated" } })}
      />,
    );
    expect(
      screen.getByText(/Continues until terminated/i),
    ).toBeInTheDocument();
  });

  it("shows 'In perpetuity.' when confidentiality is perpetual", () => {
    render(
      <NdaPreview
        data={build({
          termOfConfidentiality: { kind: "perpetuity" },
        })}
      />,
    );
    expect(screen.getByText("In perpetuity.")).toBeInTheDocument();
  });

  it("formats the effective date as a long-form English date", () => {
    render(<NdaPreview data={build({ effectiveDate: "2026-05-09" })} />);
    expect(screen.getByText("May 9, 2026")).toBeInTheDocument();
  });

  it("renders read-only date and term text when no onChange is provided", () => {
    render(
      <NdaPreview
        data={build({ effectiveDate: "2026-05-09", mndaTerm: { kind: "years", years: 2 } })}
      />,
    );
    expect(screen.queryByLabelText(/Effective Date/i)).not.toBeInTheDocument();
    expect(screen.getByText("May 9, 2026")).toBeInTheDocument();
  });

  it("renders editable Effective Date and MNDA Term inputs when onChange is provided", () => {
    const onChange = vi.fn();
    render(<NdaPreview data={build()} onChange={onChange} />);
    expect(screen.getByLabelText(/Effective Date$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/MNDA Term in years/)).toBeInTheDocument();
    expect(screen.getByLabelText(/MNDA Term until terminated/)).toBeInTheDocument();
  });

  it("propagates Effective Date edits via onChange", async () => {
    function Harness() {
      const [data, setData] = useState<NdaFormData>(build());
      return <NdaPreview data={data} onChange={setData} />;
    }
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText(/Effective Date$/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "2027-01-15");
    expect(input.value).toBe("2027-01-15");
    expect(screen.getByText(/January 15, 2027/i)).toBeInTheDocument();
  });

  it("switches MNDA Term to until-terminated and back to years via the radio", async () => {
    function Harness() {
      const [data, setData] = useState<NdaFormData>(build());
      return <NdaPreview data={data} onChange={setData} />;
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByLabelText(/MNDA Term until terminated/));
    expect(
      screen.getByLabelText(/MNDA Term until terminated/) as HTMLInputElement,
    ).toBeChecked();
    expect(screen.getByLabelText(/MNDA Term years/)).toBeDisabled();

    await user.click(screen.getByLabelText(/MNDA Term in years/));
    expect(screen.getByLabelText(/MNDA Term years/)).not.toBeDisabled();
  });

  it("forwards a ref to the document wrapper", () => {
    let captured: HTMLDivElement | null = null;
    function Wrapper() {
      return (
        <NdaPreview
          ref={(el) => {
            captured = el;
          }}
          data={defaultFormData}
        />
      );
    }
    render(<Wrapper />);
    expect(captured).not.toBeNull();
    expect(captured!.querySelectorAll("[data-nda-page]").length).toBe(2);
  });
});
