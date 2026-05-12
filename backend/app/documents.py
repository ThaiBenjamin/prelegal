"""Catalog of supported legal-document templates and their fillable fields.

Each ``Document`` describes one template the assistant can help draft. The
``fields`` list is the cover-page schema: the AI captures these via chat,
the frontend renders them in the live preview, and the standard terms
markdown is appended to the PDF.

The Mutual NDA has a bespoke preview component (``NdaPreview``); every
other document is rendered with a generic cover page.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

FieldKind = Literal["text", "longtext", "date"]


@dataclass(frozen=True)
class FieldSpec:
    name: str
    label: str
    kind: FieldKind
    placeholder: str | None = None


@dataclass(frozen=True)
class Document:
    id: str
    name: str
    short_name: str
    description: str
    standard_terms_path: str
    fields: tuple[FieldSpec, ...]


_PARTY_TEXT_PLACEHOLDER = "Company name (and optionally signatory and address)"


DOCUMENTS: tuple[Document, ...] = (
    Document(
        id="mutual-nda",
        name="Mutual Non-Disclosure Agreement",
        short_name="Mutual NDA",
        description=(
            "Bilateral confidentiality agreement for two companies sharing "
            "information while exploring a relationship."
        ),
        standard_terms_path="templates/Mutual-NDA.md",
        # Mutual NDA uses its own bespoke chat schema (NdaUpdates); this
        # field list is informational and is not used to build a generic
        # schema for the LLM.
        fields=(),
    ),
    Document(
        id="csa",
        name="Cloud Service Agreement",
        short_name="CSA",
        description=(
            "Standard terms for selling and buying cloud software / SaaS, "
            "used together with an Order Form."
        ),
        standard_terms_path="templates/CSA.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("effectiveDate", "Effective Date", "date"),
            FieldSpec("orderDate", "Order Date", "date"),
            FieldSpec("subscriptionPeriod", "Subscription Period", "text", "e.g. 12 months from the Order Date"),
            FieldSpec("useLimitations", "Use Limitations", "longtext", "Seats, MAUs, environments, etc."),
            FieldSpec("technicalSupport", "Technical Support", "longtext", "Channels, hours, response targets"),
            FieldSpec("generalCapAmount", "General Cap Amount", "text", "e.g. fees paid in the prior 12 months"),
            FieldSpec("governingLaw", "Governing Law", "text", "e.g. Delaware"),
            FieldSpec("chosenCourts", "Chosen Courts", "text", "e.g. state and federal courts in New Castle, DE"),
        ),
    ),
    Document(
        id="design-partner-agreement",
        name="Design Partner Agreement",
        short_name="Design Partner Agreement",
        description=(
            "Early-access design partnership where a partner uses a "
            "developing product and provides feedback."
        ),
        standard_terms_path="templates/design-partner-agreement.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("partner", "Partner", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("effectiveDate", "Effective Date", "date"),
            FieldSpec("term", "Term", "text", "e.g. 6 months from the Effective Date"),
            FieldSpec("program", "Program", "longtext", "What the design-partner program looks like"),
            FieldSpec("fees", "Fees", "text", "e.g. None"),
            FieldSpec("governingLaw", "Governing Law", "text"),
            FieldSpec("chosenCourts", "Chosen Courts", "text"),
            FieldSpec("noticeAddress", "Notice Address", "text", "Email or postal address for both parties"),
        ),
    ),
    Document(
        id="sla",
        name="Service Level Agreement",
        short_name="SLA",
        description=(
            "SLA terms (uptime targets, response times, service credits) "
            "designed to be incorporated into a CSA Order Form."
        ),
        standard_terms_path="templates/sla.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("targetUptime", "Target Uptime", "text", "e.g. 99.9% per calendar month"),
            FieldSpec("targetResponseTime", "Target Response Time", "text", "e.g. 1 business day for P1 incidents"),
            FieldSpec("supportChannel", "Support Channel", "text", "e.g. support@provider.com"),
            FieldSpec("subscriptionPeriod", "Subscription Period", "text"),
            FieldSpec("uptimeCredit", "Uptime Credit", "text", "Credit owed when uptime falls below target"),
            FieldSpec("responseTimeCredit", "Response Time Credit", "text", "Credit owed when response time misses target"),
            FieldSpec("scheduledDowntime", "Scheduled Downtime", "longtext", "Maintenance windows excluded from uptime"),
        ),
    ),
    Document(
        id="psa",
        name="Professional Services Agreement",
        short_name="PSA",
        description=(
            "Master terms for engagements where one party performs services "
            "or builds deliverables under one or more SOWs."
        ),
        standard_terms_path="templates/psa.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("effectiveDate", "Effective Date", "date"),
            FieldSpec("sowTerm", "SOW Term", "text", "Default term for individual SOWs"),
            FieldSpec("generalCapAmount", "General Cap Amount", "text"),
            FieldSpec("insuranceMinimums", "Insurance Minimums", "longtext", "Required insurance coverage"),
            FieldSpec("securityPolicy", "Security Policy", "text", "URL or referenced doc"),
            FieldSpec("governingLaw", "Governing Law", "text"),
            FieldSpec("chosenCourts", "Chosen Courts", "text"),
        ),
    ),
    Document(
        id="dpa",
        name="Data Processing Agreement",
        short_name="DPA",
        description=(
            "GDPR/UK-GDPR processor terms for a Provider that handles "
            "personal data on behalf of a Customer."
        ),
        standard_terms_path="templates/DPA.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("categoriesOfDataSubjects", "Categories of Data Subjects", "longtext", "e.g. Customer's end users"),
            FieldSpec("categoriesOfPersonalData", "Categories of Personal Data", "longtext", "e.g. name, email, IP address"),
            FieldSpec("natureAndPurposeOfProcessing", "Nature and Purpose of Processing", "longtext"),
            FieldSpec("durationOfProcessing", "Duration of Processing", "text", "e.g. for the term of the Agreement"),
            FieldSpec("frequencyOfTransfer", "Frequency of Transfer", "text", "e.g. continuous"),
            FieldSpec("governingMemberState", "Governing Member State", "text", "e.g. Ireland"),
            FieldSpec("providerSecurityContact", "Provider Security Contact", "text", "Email"),
            FieldSpec("securityPolicy", "Security Policy", "text", "URL or referenced doc"),
        ),
    ),
    Document(
        id="software-license-agreement",
        name="Software License Agreement",
        short_name="Software License Agreement",
        description=(
            "Terms for licensing on-premises or installable software, used "
            "together with an Order Form."
        ),
        standard_terms_path="templates/Software-License-Agreement.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("effectiveDate", "Effective Date", "date"),
            FieldSpec("orderDate", "Order Date", "date"),
            FieldSpec("permittedUses", "Permitted Uses", "longtext", "How the Software may be used"),
            FieldSpec("licenseLimits", "License Limits", "text", "Seats, installations, etc."),
            FieldSpec("subscriptionPeriod", "Subscription Period", "text"),
            FieldSpec("warrantyPeriod", "Warranty Period", "text", "e.g. 30 days from delivery"),
            FieldSpec("generalCapAmount", "General Cap Amount", "text"),
            FieldSpec("governingLaw", "Governing Law", "text"),
            FieldSpec("chosenCourts", "Chosen Courts", "text"),
        ),
    ),
    Document(
        id="partnership-agreement",
        name="Partnership Agreement",
        short_name="Partnership Agreement",
        description=(
            "Commercial partnership terms covering each party's obligations, "
            "trademark licensing, payments, and dispute escalation."
        ),
        standard_terms_path="templates/Partnership-Agreement.md",
        fields=(
            FieldSpec("company", "Company", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("partner", "Partner", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("effectiveDate", "Effective Date", "date"),
            FieldSpec("brandGuidelines", "Brand Guidelines", "longtext", "URL or summary"),
            FieldSpec("generalCapAmount", "General Cap Amount", "text"),
            FieldSpec("governingLaw", "Governing Law", "text"),
            FieldSpec("chosenCourts", "Chosen Courts", "text"),
        ),
    ),
    Document(
        id="pilot-agreement",
        name="Pilot Agreement",
        short_name="Pilot Agreement",
        description=(
            "Short-term, evaluation-only access to a product before "
            "committing to a full commercial agreement."
        ),
        standard_terms_path="templates/Pilot-Agreement.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("effectiveDate", "Effective Date", "date"),
            FieldSpec("pilotPeriod", "Pilot Period", "text", "e.g. 60 days from the Effective Date"),
            FieldSpec("generalCapAmount", "General Cap Amount", "text"),
            FieldSpec("governingLaw", "Governing Law", "text"),
            FieldSpec("chosenCourts", "Chosen Courts", "text"),
            FieldSpec("noticeAddress", "Notice Address", "text"),
        ),
    ),
    Document(
        id="baa",
        name="Business Associate Agreement",
        short_name="BAA",
        description=(
            "HIPAA-required terms governing a Business Associate's handling "
            "of Protected Health Information on behalf of a Covered Entity."
        ),
        standard_terms_path="templates/BAA.md",
        fields=(
            FieldSpec("provider", "Provider (Business Associate)", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("company", "Company (Covered Entity)", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("baaEffectiveDate", "BAA Effective Date", "date"),
            FieldSpec("breachNotificationPeriod", "Breach Notification Period", "text", "e.g. within 5 business days"),
            FieldSpec("limitations", "Limitations", "longtext", "Any restrictions on PHI use"),
        ),
    ),
    Document(
        id="ai-addendum",
        name="AI Addendum",
        short_name="AI Addendum",
        description=(
            "Supplements an underlying agreement to govern AI service usage, "
            "including input/output ownership and model-training rights."
        ),
        standard_terms_path="templates/AI-Addendum.md",
        fields=(
            FieldSpec("provider", "Provider", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("customer", "Customer", "text", _PARTY_TEXT_PLACEHOLDER),
            FieldSpec("trainingPurposes", "Training Purposes", "longtext", "What Provider may train models on"),
            FieldSpec("trainingData", "Training Data", "longtext", "What data is in scope for training"),
            FieldSpec("trainingRestrictions", "Training Restrictions", "longtext", "Limits on training"),
            FieldSpec("improvementRestrictions", "Improvement Restrictions", "longtext", "Limits on using Customer data to improve the service"),
        ),
    ),
)


_BY_ID = {d.id: d for d in DOCUMENTS}


def get_document(doc_id: str) -> Document | None:
    return _BY_ID.get(doc_id)


def document_summaries() -> list[dict]:
    """Lightweight payload for the frontend selector."""
    return [
        {
            "id": d.id,
            "name": d.name,
            "shortName": d.short_name,
            "description": d.description,
        }
        for d in DOCUMENTS
    ]
