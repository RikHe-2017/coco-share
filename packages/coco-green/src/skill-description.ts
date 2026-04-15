function extractDescriptionFromFrontmatter(raw: string): string | undefined {
  if (!raw.startsWith("---")) return undefined;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return undefined;
  const block = raw.slice(3, end).trim();
  const descMatch = /^description:\s*(.+)$/m.exec(block);
  if (!descMatch?.[1]) return undefined;
  let value = descMatch[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  return raw.slice(end + "\n---".length).trimStart();
}

function extractFirstParagraph(raw: string): string {
  const body = stripFrontmatter(raw);
  const lines = body.split(/\r?\n/);
  const buf: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t === "" && buf.length > 0) break;
    if (t !== "") buf.push(t);
  }
  return buf.join(" ").trim() || "（无描述）";
}

export function describeFromSkillMdContent(raw: string): string {
  const fromFm = extractDescriptionFromFrontmatter(raw);
  if (fromFm !== undefined && fromFm !== "") return fromFm;
  return extractFirstParagraph(raw);
}
