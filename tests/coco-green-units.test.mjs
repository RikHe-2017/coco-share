import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { test } from "vitest";

import { createApp } from "../packages/coco-green/src/create-server.ts";
import { formatBlueInviteCliCommand } from "../packages/coco-green/src/format-invite-command.ts";
import { scanSkills } from "../packages/coco-green/src/scan-skills.ts";
import { describeFromSkillMdContent } from "../packages/coco-green/src/skill-description.ts";

async function startApp(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  return {
    base: `http://127.0.0.1:${String(address.port)}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("coco-green extracts skill descriptions", () => {
  assert.equal(
    describeFromSkillMdContent("---\ndescription: \"From metadata\"\n---\n# Body\n"),
    "From metadata",
  );
  assert.equal(
    describeFromSkillMdContent("# Title\nfirst paragraph\n\nsecond paragraph"),
    "# Title first paragraph",
  );
  assert.equal(describeFromSkillMdContent(""), "（无描述）");
});

test("coco-green scans nested skills and ignores node_modules and outside symlinks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "coco-green-units-"));
  const outside = await mkdtemp(path.join(tmpdir(), "coco-green-outside-"));

  try {
    await mkdir(path.join(root, "nested", "alpha"), { recursive: true });
    await writeFile(
      path.join(root, "nested", "alpha", "SKILL.md"),
      "---\ndescription: Alpha skill\n---\n# Alpha\n",
    );
    await mkdir(path.join(root, "node_modules", "ignored"), { recursive: true });
    await writeFile(path.join(root, "node_modules", "ignored", "SKILL.md"), "# Ignored\n");
    await mkdir(path.join(outside, "external"), { recursive: true });
    await writeFile(path.join(outside, "external", "SKILL.md"), "# External\n");
    await symlink(path.join(outside, "external"), path.join(root, "external-link"));

    const skills = await scanSkills(root);

    assert.deepEqual(
      skills.map((skill) => [skill.name, skill.description]),
      [["alpha", "Alpha skill"]],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("coco-green rejects duplicate skill folder names", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "coco-green-dupes-"));

  try {
    await mkdir(path.join(root, "one", "dup"), { recursive: true });
    await mkdir(path.join(root, "two", "dup"), { recursive: true });
    await writeFile(path.join(root, "one", "dup", "SKILL.md"), "# One\n");
    await writeFile(path.join(root, "two", "dup", "SKILL.md"), "# Two\n");

    await assert.rejects(() => scanSkills(root), /重复的技能名称/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("coco-green formats invite commands with shell-safe arguments", () => {
  const cmd = formatBlueInviteCliCommand({
    hostPort: "127.0.0.1:3001",
    skillNames: ["my-skill", "space skill"],
    agents: ["codex"],
    installPath: "../$HOME path",
  });

  assert.equal(
    cmd,
    "npx @coco-share/coco-blue --ip=127.0.0.1:3001 --skill=my-skill --skill='space skill' --agent=codex -p='../$HOME path'",
  );

  const checked = spawnSync(
    "sh",
    [
      "-c",
      `node -e 'console.log(JSON.stringify(process.argv.slice(1)))' -- ${cmd.replace(
        "npx @coco-share/coco-blue ",
        "",
      )}`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(checked.status, 0, checked.stderr);
  const parsed = JSON.parse(checked.stdout);
  assert.ok(parsed.includes("-p=../$HOME path"));
});

test("coco-green app lists skills, validates requests, and returns selected zip", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "coco-green-app-"));
  const skillDir = path.join(root, "alpha");
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), "# Alpha\n");
  const app = createApp([
    {
      name: "alpha",
      description: "Alpha skill",
      absPath: skillDir,
    },
  ]);
  const server = await startApp(app);

  try {
    const all = await globalThis.fetch(`${server.base}/getAllSkills`);
    assert.equal(all.status, 200);
    assert.deepEqual(await all.json(), {
      skills: [{ name: "alpha", description: "Alpha skill" }],
    });

    const badBody = await globalThis.fetch(`${server.base}/getSkillBySkillNames`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nameList: [] }),
    });
    assert.equal(badBody.status, 400);

    const unsafe = await globalThis.fetch(`${server.base}/getSkillBySkillNames`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nameList: ["../alpha"] }),
    });
    assert.equal(unsafe.status, 400);

    const zipRes = await globalThis.fetch(`${server.base}/getSkillBySkillNames`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nameList: ["alpha"] }),
    });
    assert.equal(zipRes.status, 200);
    const files = unzipSync(new Uint8Array(await zipRes.arrayBuffer()));
    assert.equal(
      Buffer.from(files["alpha/SKILL.md"]).toString("utf8"),
      "# Alpha\n",
    );
    assert.equal(existsSync(path.join(skillDir, "SKILL.md")), true);
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
