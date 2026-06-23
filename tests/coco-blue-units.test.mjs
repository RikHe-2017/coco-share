import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { zipSync } from "fflate";
import { test } from "vitest";

import {
  AGENT_IDS,
  agentSkillRoot,
  globalAgentSkillRoot,
  isAgentId,
} from "../packages/coco-blue/src/agents.ts";
import { extractZipBufferToDir } from "../packages/coco-blue/src/extract-zip.ts";
import { normalizeBaseUrl } from "../packages/coco-blue/src/normalize-base-url.ts";

test("coco-blue normalizes server base URLs", () => {
  assert.equal(normalizeBaseUrl("127.0.0.1:3001"), "http://127.0.0.1:3001");
  assert.equal(
    normalizeBaseUrl(" https://example.com:443/ "),
    "https://example.com",
  );

  assert.throws(() => normalizeBaseUrl(""), /服务器地址为空/);
  assert.throws(() => normalizeBaseUrl("http://127.0.0.1:3001/path"), /不要包含 URL 路径/);
  assert.throws(() => normalizeBaseUrl("http://"), /无效的服务器地址/);
});

test("coco-blue resolves agent skill roots", () => {
  const base = path.join("tmp", "root");

  assert.deepEqual([...AGENT_IDS], ["cursor", "claudeCode", "codex"]);
  assert.equal(isAgentId("cursor"), true);
  assert.equal(isAgentId("claude-code"), false);
  assert.equal(agentSkillRoot("cursor", base), path.join(base, ".cursor", "skills"));
  assert.equal(agentSkillRoot("claudeCode", base), path.join(base, ".claude", "skills"));
  assert.equal(agentSkillRoot("codex", base), path.join(base, ".codex", "skills"));
  assert.match(globalAgentSkillRoot("codex"), /\.codex[/\\]skills$/);
});

test("coco-blue extracts nested zip entries and skips directory entries", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "coco-blue-units-"));
  const zip = zipSync({
    "skill-one/": new Uint8Array(),
    "skill-one/SKILL.md": Buffer.from("# Skill One\n"),
    "skill-one/assets/info.txt": Buffer.from("asset"),
  });

  try {
    await extractZipBufferToDir(Buffer.from(zip), dir);

    assert.equal(
      await readFile(path.join(dir, "skill-one", "SKILL.md"), "utf8"),
      "# Skill One\n",
    );
    assert.equal(
      await readFile(path.join(dir, "skill-one", "assets", "info.txt"), "utf8"),
      "asset",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
