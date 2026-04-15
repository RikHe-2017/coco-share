import fs from "node:fs/promises";
import path from "node:path";

import { describeFromSkillMdContent } from "./skill-description.js";

export interface SkillRecord {
  name: string;
  description: string;
  absPath: string;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function scanSkills(rootDir: string): Promise<SkillRecord[]> {
  const rootResolved = await fs.realpath(path.resolve(rootDir));
  const byName = new Map<string, string>();

  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;

      const full = path.join(dir, entry.name);
      let realFull: string;
      try {
        realFull = await fs.realpath(full);
      } catch {
        continue;
      }
      if (
        realFull !== rootResolved &&
        !realFull.startsWith(rootResolved + path.sep)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        const skillMd = path.join(full, "SKILL.md");
        if (await fileExists(skillMd)) {
          const name = entry.name;
          const prev = byName.get(name);
          if (prev !== undefined && prev !== realFull) {
            throw new Error(
              `技能根目录下存在重复的技能名称「${name}」：\n  ${prev}\n  ${realFull}`,
            );
          }
          byName.set(name, realFull);
        } else {
          await walk(full);
        }
      }
    }
  };

  await walk(rootResolved);

  const records: SkillRecord[] = [];
  for (const [name, absPath] of byName.entries()) {
    const skillMd = path.join(absPath, "SKILL.md");
    const raw = await fs.readFile(skillMd, "utf8");
    records.push({
      name,
      absPath,
      description: describeFromSkillMdContent(raw),
    });
  }

  records.sort((a, b) => a.name.localeCompare(b.name));
  return records;
}
