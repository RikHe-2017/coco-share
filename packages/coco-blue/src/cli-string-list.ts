export interface NormalizeCliStringListResult {
  readonly values: string[];
  /** 是否出现过仅空白的内容（通常意味着参数书写不合法）。 */
  readonly hadBlankToken: boolean;
}

export function normalizeCliStringList(
  raw: readonly string[],
): NormalizeCliStringListResult {
  const values: string[] = [];
  const seen = new Set<string>();
  let hadBlankToken = false;

  for (const item of raw) {
    const t = item.trim();
    if (t === "") {
      hadBlankToken = true;
      continue;
    }
    if (seen.has(t)) continue;
    seen.add(t);
    values.push(t);
  }

  return { values, hadBlankToken };
}
