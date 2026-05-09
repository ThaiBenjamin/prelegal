"use client";

import type { Ref } from "react";
import type { NdaFormData } from "@/lib/nda-types";
import { fallback, formatHumanDate, formatYears } from "@/lib/nda-format";
import { NDA_BLOCK_ATTR, NDA_PAGE_ATTR } from "@/lib/nda-selectors";

type Props = { data: NdaFormData; ref?: Ref<HTMLDivElement> };

const CrossRef = ({ children }: { children: React.ReactNode }) => (
  <span className="italic text-[#1d4ed8]">{children}</span>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 text-base font-bold text-black">{children}</h2>
);

function Block({ children }: { children: React.ReactNode }) {
  const props = { [NDA_BLOCK_ATTR]: "" };
  return (
    <div {...props} className="mb-3">
      {children}
    </div>
  );
}

function Page({
  kind,
  children,
}: {
  kind: "cover" | "terms";
  children: React.ReactNode;
}) {
  const props = { [NDA_PAGE_ATTR]: kind };
  return (
    <section {...props} style={pageStyle}>
      {children}
    </section>
  );
}

const pageStyle: React.CSSProperties = {
  width: "8.5in",
  minHeight: "11in",
  padding: "0.75in",
  fontFamily: '"Times New Roman", Times, serif',
  fontSize: "11pt",
  lineHeight: 1.5,
  color: "#000",
  backgroundColor: "#fff",
};

function PartyBlock({ label, party }: { label: string; party: NdaFormData["party1"] }) {
  return (
    <div className="border border-black p-3">
      <div className="mb-2 text-sm font-bold uppercase tracking-wide">{label}</div>
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-semibold">Company:</span>{" "}
          {fallback(party.company, "_______________________")}
        </div>
        <div>
          <span className="font-semibold">Print Name:</span>{" "}
          {fallback(party.signatoryName, "_______________________")}
        </div>
        <div>
          <span className="font-semibold">Title:</span>{" "}
          {fallback(party.signatoryTitle, "_______________________")}
        </div>
        <div>
          <span className="font-semibold">Notice Address:</span>{" "}
          {fallback(party.noticeAddress, "_______________________")}
        </div>
        <div>
          <span className="font-semibold">Signature:</span>{" "}
          <span className="text-gray-500">_______________________</span>
        </div>
        <div>
          <span className="font-semibold">Date:</span>{" "}
          <span className="text-gray-500">_______________________</span>
        </div>
      </div>
    </div>
  );
}

export function NdaPreview({ data, ref }: Props) {
  const purpose = fallback(data.purpose, "[Purpose]");
  const effectiveDate = formatHumanDate(data.effectiveDate);
  const governingLaw = fallback(data.governingLawState, "[Fill in state]");
  const jurisdiction = fallback(
    data.jurisdiction,
    "[Fill in city or county and state]",
  );
  const mndaTermText =
    data.mndaTerm.kind === "years"
      ? `Expires ${formatYears(data.mndaTerm.years)} from the Effective Date.`
      : "Continues until terminated in accordance with the terms of this MNDA.";
  const confidentialityTermText =
    data.termOfConfidentiality.kind === "years"
      ? `${formatYears(data.termOfConfidentiality.years)} from the Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
      : "In perpetuity.";

  return (
    <div
      ref={ref}
      data-nda-document
      className="mx-auto flex flex-col gap-6 bg-white text-black"
    >
      <Page kind="cover">
        <Block>
          <h1 className="mb-3 text-center text-2xl font-bold">
            Mutual Non-Disclosure Agreement
          </h1>
          <p className="text-sm">
            This Mutual Non-Disclosure Agreement (the &ldquo;<b>MNDA</b>
            &rdquo;) consists of: (1) this Cover Page (&ldquo;
            <b>Cover Page</b>&rdquo;) and (2) the Common Paper Mutual NDA
            Standard Terms Version 1.0 (&ldquo;<b>Standard Terms</b>&rdquo;)
            identical to those posted at
            commonpaper.com/standards/mutual-nda/1.0. Any modifications of
            the Standard Terms should be made on the Cover Page, which will
            control over conflicts with the Standard Terms.
          </p>
        </Block>

        <Block>
          <SectionHeading>Purpose</SectionHeading>
          <p>{purpose}</p>
        </Block>

        <Block>
          <SectionHeading>Effective Date</SectionHeading>
          <p>{effectiveDate}</p>
        </Block>

        <Block>
          <SectionHeading>MNDA Term</SectionHeading>
          <p>{mndaTermText}</p>
        </Block>

        <Block>
          <SectionHeading>Term of Confidentiality</SectionHeading>
          <p>{confidentialityTermText}</p>
        </Block>

        <Block>
          <SectionHeading>Governing Law &amp; Jurisdiction</SectionHeading>
          <p>
            <b>Governing Law:</b> State of {governingLaw}
          </p>
          <p>
            <b>Jurisdiction:</b> Courts located in {jurisdiction}
          </p>
        </Block>

        {data.modifications.trim().length > 0 && (
          <Block>
            <SectionHeading>MNDA Modifications</SectionHeading>
            <p className="whitespace-pre-wrap">{data.modifications}</p>
          </Block>
        )}

        <Block>
          <p className="text-sm">
            By signing this Cover Page, each party agrees to enter into this
            MNDA as of the Effective Date.
          </p>
        </Block>

        <Block>
          <div className="grid grid-cols-2 gap-4">
            <PartyBlock label="Party 1" party={data.party1} />
            <PartyBlock label="Party 2" party={data.party2} />
          </div>
        </Block>
      </Page>

      <Page kind="terms">
        <Block>
          <h1 className="text-center text-xl font-bold">Standard Terms</h1>
        </Block>

        <Block>
          <p className="text-sm">
            <b>1. Introduction.</b> This Mutual Non-Disclosure Agreement
            (which incorporates these Standard Terms and the Cover Page
            (defined below)) (&ldquo;<b>MNDA</b>&rdquo;) allows each party
            (&ldquo;<b>Disclosing Party</b>&rdquo;) to disclose or make
            available information in connection with the{" "}
            <CrossRef>Purpose</CrossRef> which (1) the Disclosing Party
            identifies to the receiving party (&ldquo;
            <b>Receiving Party</b>&rdquo;) as &ldquo;confidential&rdquo;,
            &ldquo;proprietary&rdquo;, or the like or (2) should be
            reasonably understood as confidential or proprietary due to its
            nature and the circumstances of its disclosure (&ldquo;
            <b>Confidential Information</b>&rdquo;). Each party&rsquo;s
            Confidential Information also includes the existence and status
            of the parties&rsquo; discussions and information on the Cover
            Page. Confidential Information includes technical or business
            information, product designs or roadmaps, requirements, pricing,
            security and compliance documentation, technology, inventions
            and know-how. To use this MNDA, the parties must complete and
            sign a cover page incorporating these Standard Terms (&ldquo;
            <b>Cover Page</b>&rdquo;). Each party is identified on the Cover
            Page and capitalized terms have the meanings given herein or on
            the Cover Page.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>2. Use and Protection of Confidential Information.</b> The
            Receiving Party shall: (a) use Confidential Information solely
            for the <CrossRef>Purpose</CrossRef>; (b) not disclose
            Confidential Information to third parties without the Disclosing
            Party&rsquo;s prior written approval, except that the Receiving
            Party may disclose Confidential Information to its employees,
            agents, advisors, contractors and other representatives having a
            reasonable need to know for the <CrossRef>Purpose</CrossRef>,
            provided these representatives are bound by confidentiality
            obligations no less protective of the Disclosing Party than the
            applicable terms in this MNDA and the Receiving Party remains
            responsible for their compliance with this MNDA; and (c) protect
            Confidential Information using at least the same protections the
            Receiving Party uses for its own similar information but no less
            than a reasonable standard of care.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>3. Exceptions.</b> The Receiving Party&rsquo;s obligations in
            this MNDA do not apply to information that it can demonstrate:
            (a) is or becomes publicly available through no fault of the
            Receiving Party; (b) it rightfully knew or possessed prior to
            receipt from the Disclosing Party without confidentiality
            restrictions; (c) it rightfully obtained from a third party
            without confidentiality restrictions; or (d) it independently
            developed without using or referencing the Confidential
            Information.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>4. Disclosures Required by Law.</b> The Receiving Party may
            disclose Confidential Information to the extent required by law,
            regulation or regulatory authority, subpoena or court order,
            provided (to the extent legally permitted) it provides the
            Disclosing Party reasonable advance notice of the required
            disclosure and reasonably cooperates, at the Disclosing
            Party&rsquo;s expense, with the Disclosing Party&rsquo;s efforts
            to obtain confidential treatment for the Confidential
            Information.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>5. Term and Termination.</b> This MNDA commences on the{" "}
            <CrossRef>Effective Date</CrossRef> and expires at the end of
            the <CrossRef>MNDA Term</CrossRef>. Either party may terminate
            this MNDA for any or no reason upon written notice to the other
            party. The Receiving Party&rsquo;s obligations relating to
            Confidential Information will survive for the{" "}
            <CrossRef>Term of Confidentiality</CrossRef>, despite any
            expiration or termination of this MNDA.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>6. Return or Destruction of Confidential Information.</b>{" "}
            Upon expiration or termination of this MNDA or upon the
            Disclosing Party&rsquo;s earlier request, the Receiving Party
            will: (a) cease using Confidential Information; (b) promptly
            after the Disclosing Party&rsquo;s written request, destroy all
            Confidential Information in the Receiving Party&rsquo;s
            possession or control or return it to the Disclosing Party; and
            (c) if requested by the Disclosing Party, confirm its compliance
            with these obligations in writing. As an exception to subsection
            (b), the Receiving Party may retain Confidential Information in
            accordance with its standard backup or record retention policies
            or as required by law, but the terms of this MNDA will continue
            to apply to the retained Confidential Information.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>7. Proprietary Rights.</b> The Disclosing Party retains all
            of its intellectual property and other rights in its
            Confidential Information and its disclosure to the Receiving
            Party grants no license under such rights.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>8. Disclaimer.</b> ALL CONFIDENTIAL INFORMATION IS PROVIDED
            &ldquo;AS IS&rdquo;, WITH ALL FAULTS, AND WITHOUT WARRANTIES,
            INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND
            FITNESS FOR A PARTICULAR PURPOSE.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>9. Governing Law and Jurisdiction.</b> This MNDA and all
            matters relating hereto are governed by, and construed in
            accordance with, the laws of the State of {governingLaw},
            without regard to the conflict of laws provisions of such State
            of {governingLaw}. Any legal suit, action, or proceeding
            relating to this MNDA must be instituted in the federal or state
            courts located in {jurisdiction}. Each party irrevocably submits
            to the exclusive jurisdiction of such courts in any such suit,
            action, or proceeding.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>10. Equitable Relief.</b> A breach of this MNDA may cause
            irreparable harm for which monetary damages are an insufficient
            remedy. Upon a breach of this MNDA, the Disclosing Party is
            entitled to seek appropriate equitable relief, including an
            injunction, in addition to its other remedies.
          </p>
        </Block>

        <Block>
          <p className="text-sm">
            <b>11. General.</b> Neither party has an obligation under this
            MNDA to disclose Confidential Information to the other or
            proceed with any proposed transaction. Neither party may assign
            this MNDA without the prior written consent of the other party,
            except that either party may assign this MNDA in connection
            with a merger, reorganization, acquisition or other transfer of
            all or substantially all its assets or voting securities. Any
            assignment in violation of this Section is null and void. This
            MNDA will bind and inure to the benefit of each party&rsquo;s
            permitted successors and assigns. Waivers must be signed by the
            waiving party&rsquo;s authorized representative and cannot be
            implied from conduct. If any provision of this MNDA is held
            unenforceable, it will be limited to the minimum extent
            necessary so the rest of this MNDA remains in effect. This MNDA
            (including the Cover Page) constitutes the entire agreement of
            the parties with respect to its subject matter, and supersedes
            all prior and contemporaneous understandings, agreements,
            representations, and warranties, whether written or oral,
            regarding such subject matter. This MNDA may only be amended,
            modified, waived, or supplemented by an agreement in writing
            signed by both parties. Notices, requests and approvals under
            this MNDA must be sent in writing to the email or postal
            addresses on the Cover Page and are deemed delivered on
            receipt. This MNDA may be executed in counterparts, including
            electronic copies, each of which is deemed an original and
            which together form the same agreement.
          </p>
        </Block>

        <Block>
          <p className="mt-4 text-center text-xs text-gray-600">
            Common Paper Mutual Non-Disclosure Agreement (Version 1.0) —
            free to use under CC BY 4.0.
          </p>
        </Block>
      </Page>
    </div>
  );
}
