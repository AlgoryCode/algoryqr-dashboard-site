/**
 * Several values of one filter in the address, as a repeated parameter: `?kategori=A&kategori=B`.
 * Repeating keeps names with commas intact, which a joined list would split.
 */
export function readList<T extends string = string>(
  params: URLSearchParams,
  key: string,
  allowed?: readonly T[],
): T[] {
  const seen = new Set<string>();
  const values: T[] = [];
  for (const raw of params.getAll(key)) {
    // Older links used one comma-joined value; accept those for the fixed lists.
    const parts = allowed ? raw.split(",") : [raw];
    for (const part of parts) {
      const value = part.trim();
      if (!value || value === "all" || seen.has(value)) continue;
      if (allowed && !allowed.includes(value as T)) continue;
      seen.add(value);
      values.push(value as T);
    }
  }
  return values;
}

export function writeList(params: URLSearchParams, key: string, values: readonly string[]) {
  for (const value of values) params.append(key, value);
}

/** True when nothing is chosen (the filter is off) or the value is one of the chosen ones. */
export function inList<T>(values: readonly T[], value: T): boolean {
  return values.length === 0 || values.includes(value);
}
