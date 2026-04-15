import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function readPackageVersion(importMetaUrl: string): string {
  const dir = path.dirname(fileURLToPath(importMetaUrl));
  const pkgPath = path.join(dir, "..", "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const j = JSON.parse(raw) as { version?: unknown };
  return typeof j.version === "string" ? j.version : "0.0.0";
}
