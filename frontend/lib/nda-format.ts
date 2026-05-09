export function formatHumanDate(iso: string): string {
  if (!iso) return "[Effective Date]";
  const date = new Date(iso + "T00:00:00");
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatYears(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return "[N] year(s)";
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export function fallback(value: string, placeholder: string): string {
  const trimmed = value?.trim?.() ?? "";
  return trimmed.length > 0 ? trimmed : placeholder;
}
