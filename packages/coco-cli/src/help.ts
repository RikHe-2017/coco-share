import type { AnyOption } from "./option-def.js";

export interface ProgramMeta {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  /** One line, e.g. "coco-green [选项]" */
  readonly usage: string;
  /** Extra paragraphs after options (e.g. PowerShell hint). */
  readonly notes?: readonly string[];
}

function formatAliases(opt: AnyOption): string {
  const parts: string[] = [];
  if (opt.short !== undefined) {
    parts.push(`-${opt.short}`);
  }
  for (const a of opt.aliases) {
    parts.push(`--${a}`);
  }
  return parts.join(", ");
}

function formatMeta(opt: AnyOption): string {
  switch (opt.kind) {
    case "flag": {
      return "";
    }
    case "string":
    case "enum":
    case "stringList": {
      return ` <${opt.valueLabel}>`;
    }
    case "number": {
      return ` <${opt.valueLabel}>`;
    }
  }
}

function formatDefault(opt: AnyOption): string {
  if (opt.kind === "number") {
    return `（默认：${String(opt.default)}）`;
  }
  return "";
}

function formatEnumValues(opt: AnyOption): string {
  if (opt.kind !== "enum") {
    return "";
  }
  return `可选值：${opt.values.join(" | ")}`;
}

export function formatHelp(meta: ProgramMeta, options: readonly AnyOption[]): string {
  const lines: string[] = [];
  lines.push(`${meta.name} v${meta.version}`);
  lines.push(meta.description);
  lines.push("");
  lines.push("用法:");
  lines.push(`  ${meta.usage}`);
  lines.push("");
  lines.push("选项:");

  let width = 0;
  const rows: { left: string; right: string }[] = [];
  for (const opt of options) {
    const left = `  ${formatAliases(opt)}${formatMeta(opt)}`;
    width = Math.max(width, left.length);
    const rightParts: string[] = [opt.description];
    const ev = formatEnumValues(opt);
    if (ev !== "") rightParts.push(ev);
    const d = formatDefault(opt);
    if (d !== "") rightParts.push(d);
    rows.push({ left, right: rightParts.join(" ") });
  }

  const gap = 2;
  for (const row of rows) {
    const pad = Math.max(1, width + gap - row.left.length);
    lines.push(`${row.left}${" ".repeat(pad)}${row.right}`);
  }

  if (meta.notes !== undefined && meta.notes.length > 0) {
    lines.push("");
    for (const n of meta.notes) {
      lines.push(n);
    }
  }

  return lines.join("\n");
}
