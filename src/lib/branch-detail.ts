export function formatBranchAmount(value: number, currency?: string | null): string {
  const rounded = Math.round(value).toLocaleString("tr-TR");
  if (currency === "USD") return `$${rounded}`;
  if (currency === "EUR") return `€${rounded}`;
  return `₺${rounded}`;
}

export function formatCancelPercent(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  const percent = rate <= 1 ? rate * 100 : rate;
  return `%${percent.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatManagerShort(firstName?: string | null, lastName?: string | null): string | null {
  const first = firstName?.trim();
  if (!first) return null;
  const last = lastName?.trim();
  if (!last) return first;
  return `${first} ${last.charAt(0).toLocaleUpperCase("tr-TR")}.`;
}

export function branchStatusLabel(active: boolean): string {
  return active ? "Açık" : "Kapalı";
}

export function branchMetaLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(" · ");
}
