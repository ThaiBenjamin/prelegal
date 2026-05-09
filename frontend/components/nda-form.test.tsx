import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NdaForm } from "./nda-form";
import { defaultFormData } from "@/lib/nda-defaults";
import type { NdaFormData } from "@/lib/nda-types";
import { useState } from "react";

function Harness({
  initial = defaultFormData,
  onChange,
}: {
  initial?: NdaFormData;
  onChange?: (next: NdaFormData) => void;
}) {
  const [data, setData] = useState<NdaFormData>(initial);
  return (
    <NdaForm
      data={data}
      onChange={(next) => {
        setData(next);
        onChange?.(next);
      }}
    />
  );
}

function clickLabelText(text: RegExp | string) {
  const label = screen.getByText(text, { selector: "label" });
  fireEvent.click(label);
}

describe("<NdaForm />", () => {
  it("renders party 1, party 2, and agreement cards", () => {
    render(<Harness />);
    expect(screen.getByText("Party 1")).toBeInTheDocument();
    expect(screen.getByText("Party 2")).toBeInTheDocument();
    expect(screen.getByText("Agreement details")).toBeInTheDocument();
  });

  it("propagates Party 1 company changes via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const input = screen.getAllByLabelText(/Company/i)[0] as HTMLInputElement;
    await user.type(input, "Acme");

    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.party1.company).toBe("Acme");
  });

  it("propagates governing-law state changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const input = screen.getByLabelText(/Governing law/i);
    await user.type(input, "Delaware");

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.governingLawState).toBe("Delaware");
  });

  it("switches MNDA term to 'until-terminated' when that radio is clicked", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    clickLabelText(/Continues until terminated/i);

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.mndaTerm).toEqual({ kind: "until-terminated" });
  });

  it("preserves the user's typed year value across an until-terminated round-trip", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const yearsInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    fireEvent.change(yearsInput, { target: { value: "5" } });

    clickLabelText(/Continues until terminated/i);
    clickLabelText(/^Expires/i);

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.mndaTerm).toEqual({ kind: "years", years: 5 });
  });

  it("preserves the user's typed year value across a perpetuity round-trip", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const yearsInput = screen.getAllByRole("spinbutton")[1] as HTMLInputElement;
    fireEvent.change(yearsInput, { target: { value: "7" } });

    clickLabelText(/^In perpetuity$/i);
    clickLabelText(/year\(s\) from effective date \(trade secrets continue\)/i);

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.termOfConfidentiality).toEqual({ kind: "years", years: 7 });
  });

  it("switches confidentiality term to 'perpetuity' when that radio is clicked", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    clickLabelText(/^In perpetuity$/i);

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.termOfConfidentiality).toEqual({ kind: "perpetuity" });
  });

  it("updates the years input for MNDA term", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const yearsInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    fireEvent.change(yearsInput, { target: { value: "5" } });

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.mndaTerm).toEqual({ kind: "years", years: 5 });
  });

  it("clamps year input to a minimum of 1 when given invalid input", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const yearsInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    fireEvent.change(yearsInput, { target: { value: "0" } });

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    if (last.mndaTerm.kind === "years") {
      expect(last.mndaTerm.years).toBeGreaterThanOrEqual(1);
    }
  });

  it("disables the year input when MNDA term is set to 'until-terminated'", () => {
    render(
      <Harness
        initial={{ ...defaultFormData, mndaTerm: { kind: "until-terminated" } }}
      />,
    );

    const yearsInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    expect(yearsInput).toBeDisabled();
  });

  it("propagates modifications text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const textarea = screen.getByLabelText(/MNDA modifications/i);
    await user.type(textarea, "Custom note");

    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.modifications).toBe("Custom note");
  });
});
