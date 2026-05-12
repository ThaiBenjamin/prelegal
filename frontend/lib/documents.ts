/**
 * TypeScript mirror of backend/app/documents.py.
 *
 * Each entry describes one supported legal-document template. The Mutual
 * NDA has a bespoke preview component (`NdaPreview`); every other document
 * is rendered with the generic cover-page preview built from `fields`.
 *
 * Keep this list in sync with the backend module; the dev loop catches
 * drift quickly because the backend's `/api/documents` is the source the
 * selector consumes (`fields` are local to the renderer).
 */

export type FieldKind = "text" | "longtext" | "date";

export type FieldSpec = {
  name: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
};

export type Document = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  standardTermsFile: string;
  fields: FieldSpec[];
};

const PARTY_PLACEHOLDER =
  "Company name (and optionally signatory and address)";

export const DOCUMENTS: Document[] = [
  {
    id: "mutual-nda",
    name: "Mutual Non-Disclosure Agreement",
    shortName: "Mutual NDA",
    description:
      "Bilateral confidentiality agreement for two companies sharing information while exploring a relationship.",
    standardTermsFile: "templates/Mutual-NDA.md",
    fields: [],
  },
  {
    id: "csa",
    name: "Cloud Service Agreement",
    shortName: "CSA",
    description:
      "Standard terms for selling and buying cloud software / SaaS, used together with an Order Form.",
    standardTermsFile: "templates/CSA.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "effectiveDate", label: "Effective Date", kind: "date" },
      { name: "orderDate", label: "Order Date", kind: "date" },
      { name: "subscriptionPeriod", label: "Subscription Period", kind: "text", placeholder: "e.g. 12 months from the Order Date" },
      { name: "useLimitations", label: "Use Limitations", kind: "longtext", placeholder: "Seats, MAUs, environments, etc." },
      { name: "technicalSupport", label: "Technical Support", kind: "longtext", placeholder: "Channels, hours, response targets" },
      { name: "generalCapAmount", label: "General Cap Amount", kind: "text", placeholder: "e.g. fees paid in the prior 12 months" },
      { name: "governingLaw", label: "Governing Law", kind: "text", placeholder: "e.g. Delaware" },
      { name: "chosenCourts", label: "Chosen Courts", kind: "text", placeholder: "e.g. state and federal courts in New Castle, DE" },
    ],
  },
  {
    id: "design-partner-agreement",
    name: "Design Partner Agreement",
    shortName: "Design Partner Agreement",
    description:
      "Early-access design partnership where a partner uses a developing product and provides feedback.",
    standardTermsFile: "templates/design-partner-agreement.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "partner", label: "Partner", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "effectiveDate", label: "Effective Date", kind: "date" },
      { name: "term", label: "Term", kind: "text", placeholder: "e.g. 6 months from the Effective Date" },
      { name: "program", label: "Program", kind: "longtext", placeholder: "What the design-partner program looks like" },
      { name: "fees", label: "Fees", kind: "text", placeholder: "e.g. None" },
      { name: "governingLaw", label: "Governing Law", kind: "text" },
      { name: "chosenCourts", label: "Chosen Courts", kind: "text" },
      { name: "noticeAddress", label: "Notice Address", kind: "text", placeholder: "Email or postal address for both parties" },
    ],
  },
  {
    id: "sla",
    name: "Service Level Agreement",
    shortName: "SLA",
    description:
      "SLA terms (uptime targets, response times, service credits) designed to be incorporated into a CSA Order Form.",
    standardTermsFile: "templates/sla.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "targetUptime", label: "Target Uptime", kind: "text", placeholder: "e.g. 99.9% per calendar month" },
      { name: "targetResponseTime", label: "Target Response Time", kind: "text", placeholder: "e.g. 1 business day for P1 incidents" },
      { name: "supportChannel", label: "Support Channel", kind: "text", placeholder: "e.g. support@provider.com" },
      { name: "subscriptionPeriod", label: "Subscription Period", kind: "text" },
      { name: "uptimeCredit", label: "Uptime Credit", kind: "text", placeholder: "Credit owed when uptime falls below target" },
      { name: "responseTimeCredit", label: "Response Time Credit", kind: "text", placeholder: "Credit owed when response time misses target" },
      { name: "scheduledDowntime", label: "Scheduled Downtime", kind: "longtext", placeholder: "Maintenance windows excluded from uptime" },
    ],
  },
  {
    id: "psa",
    name: "Professional Services Agreement",
    shortName: "PSA",
    description:
      "Master terms for engagements where one party performs services or builds deliverables under one or more SOWs.",
    standardTermsFile: "templates/psa.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "effectiveDate", label: "Effective Date", kind: "date" },
      { name: "sowTerm", label: "SOW Term", kind: "text", placeholder: "Default term for individual SOWs" },
      { name: "generalCapAmount", label: "General Cap Amount", kind: "text" },
      { name: "insuranceMinimums", label: "Insurance Minimums", kind: "longtext", placeholder: "Required insurance coverage" },
      { name: "securityPolicy", label: "Security Policy", kind: "text", placeholder: "URL or referenced doc" },
      { name: "governingLaw", label: "Governing Law", kind: "text" },
      { name: "chosenCourts", label: "Chosen Courts", kind: "text" },
    ],
  },
  {
    id: "dpa",
    name: "Data Processing Agreement",
    shortName: "DPA",
    description:
      "GDPR/UK-GDPR processor terms for a Provider that handles personal data on behalf of a Customer.",
    standardTermsFile: "templates/DPA.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "categoriesOfDataSubjects", label: "Categories of Data Subjects", kind: "longtext", placeholder: "e.g. Customer's end users" },
      { name: "categoriesOfPersonalData", label: "Categories of Personal Data", kind: "longtext", placeholder: "e.g. name, email, IP address" },
      { name: "natureAndPurposeOfProcessing", label: "Nature and Purpose of Processing", kind: "longtext" },
      { name: "durationOfProcessing", label: "Duration of Processing", kind: "text", placeholder: "e.g. for the term of the Agreement" },
      { name: "frequencyOfTransfer", label: "Frequency of Transfer", kind: "text", placeholder: "e.g. continuous" },
      { name: "governingMemberState", label: "Governing Member State", kind: "text", placeholder: "e.g. Ireland" },
      { name: "providerSecurityContact", label: "Provider Security Contact", kind: "text", placeholder: "Email" },
      { name: "securityPolicy", label: "Security Policy", kind: "text", placeholder: "URL or referenced doc" },
    ],
  },
  {
    id: "software-license-agreement",
    name: "Software License Agreement",
    shortName: "Software License Agreement",
    description:
      "Terms for licensing on-premises or installable software, used together with an Order Form.",
    standardTermsFile: "templates/Software-License-Agreement.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "effectiveDate", label: "Effective Date", kind: "date" },
      { name: "orderDate", label: "Order Date", kind: "date" },
      { name: "permittedUses", label: "Permitted Uses", kind: "longtext", placeholder: "How the Software may be used" },
      { name: "licenseLimits", label: "License Limits", kind: "text", placeholder: "Seats, installations, etc." },
      { name: "subscriptionPeriod", label: "Subscription Period", kind: "text" },
      { name: "warrantyPeriod", label: "Warranty Period", kind: "text", placeholder: "e.g. 30 days from delivery" },
      { name: "generalCapAmount", label: "General Cap Amount", kind: "text" },
      { name: "governingLaw", label: "Governing Law", kind: "text" },
      { name: "chosenCourts", label: "Chosen Courts", kind: "text" },
    ],
  },
  {
    id: "partnership-agreement",
    name: "Partnership Agreement",
    shortName: "Partnership Agreement",
    description:
      "Commercial partnership terms covering each party's obligations, trademark licensing, payments, and dispute escalation.",
    standardTermsFile: "templates/Partnership-Agreement.md",
    fields: [
      { name: "company", label: "Company", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "partner", label: "Partner", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "effectiveDate", label: "Effective Date", kind: "date" },
      { name: "brandGuidelines", label: "Brand Guidelines", kind: "longtext", placeholder: "URL or summary" },
      { name: "generalCapAmount", label: "General Cap Amount", kind: "text" },
      { name: "governingLaw", label: "Governing Law", kind: "text" },
      { name: "chosenCourts", label: "Chosen Courts", kind: "text" },
    ],
  },
  {
    id: "pilot-agreement",
    name: "Pilot Agreement",
    shortName: "Pilot Agreement",
    description:
      "Short-term, evaluation-only access to a product before committing to a full commercial agreement.",
    standardTermsFile: "templates/Pilot-Agreement.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "effectiveDate", label: "Effective Date", kind: "date" },
      { name: "pilotPeriod", label: "Pilot Period", kind: "text", placeholder: "e.g. 60 days from the Effective Date" },
      { name: "generalCapAmount", label: "General Cap Amount", kind: "text" },
      { name: "governingLaw", label: "Governing Law", kind: "text" },
      { name: "chosenCourts", label: "Chosen Courts", kind: "text" },
      { name: "noticeAddress", label: "Notice Address", kind: "text" },
    ],
  },
  {
    id: "baa",
    name: "Business Associate Agreement",
    shortName: "BAA",
    description:
      "HIPAA-required terms governing a Business Associate's handling of Protected Health Information on behalf of a Covered Entity.",
    standardTermsFile: "templates/BAA.md",
    fields: [
      { name: "provider", label: "Provider (Business Associate)", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "company", label: "Company (Covered Entity)", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "baaEffectiveDate", label: "BAA Effective Date", kind: "date" },
      { name: "breachNotificationPeriod", label: "Breach Notification Period", kind: "text", placeholder: "e.g. within 5 business days" },
      { name: "limitations", label: "Limitations", kind: "longtext", placeholder: "Any restrictions on PHI use" },
    ],
  },
  {
    id: "ai-addendum",
    name: "AI Addendum",
    shortName: "AI Addendum",
    description:
      "Supplements an underlying agreement to govern AI service usage, including input/output ownership and model-training rights.",
    standardTermsFile: "templates/AI-Addendum.md",
    fields: [
      { name: "provider", label: "Provider", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "customer", label: "Customer", kind: "text", placeholder: PARTY_PLACEHOLDER },
      { name: "trainingPurposes", label: "Training Purposes", kind: "longtext", placeholder: "What Provider may train models on" },
      { name: "trainingData", label: "Training Data", kind: "longtext", placeholder: "What data is in scope for training" },
      { name: "trainingRestrictions", label: "Training Restrictions", kind: "longtext", placeholder: "Limits on training" },
      { name: "improvementRestrictions", label: "Improvement Restrictions", kind: "longtext", placeholder: "Limits on using Customer data to improve the service" },
    ],
  },
];

const BY_ID = new Map(DOCUMENTS.map((d) => [d.id, d]));

export function getDocument(id: string): Document | undefined {
  return BY_ID.get(id);
}
