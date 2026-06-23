import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const blueCli = path.join(repoRoot, "packages/coco-blue/dist/cli.js");

function runBlue(args) {
  return spawnSync(process.execPath, [blueCli, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("coco-blue help exposes install path, skill, and agent options", () => {
  const result = runBlue(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /-p, --path, --install-dir, --dir <路径>/);
  assert.match(result.stdout, /可重复传入或逗号分隔/);
  assert.match(result.stdout, /cursor \| claudeCode \| codex/);
});

test("coco-blue rejects empty path and empty comma-separated agent before prompting", () => {
  const emptyPath = runBlue(["--path="]);
  assert.equal(emptyPath.status, 1);
  assert.match(emptyPath.stderr, /--path 的值不能为空/);
  assert.equal(emptyPath.stdout, "");

  const emptyAgent = runBlue(["--agent", "cursor,", "--path", "global"]);
  assert.equal(emptyAgent.status, 1);
  assert.match(emptyAgent.stderr, /--agent 的值不能为空/);
});

test("coco-blue rejects unknown agents before prompting for server input", () => {
  const result = runBlue(["--agent", "unknown", "--path", "global"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /未知的 Agent：unknown/);
});

test("coco-blue version reads package version from dist package metadata", async () => {
  const result = runBlue(["--version"]);
  const pkg = JSON.parse(
    await readFile(path.join(repoRoot, "packages/coco-blue/package.json"), "utf8"),
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), pkg.version);
});

test("coco-blue reports a file custom root as not a directory", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "coco-blue-test-"));
  const filePath = path.join(dir, "not-a-dir");
  await import("node:fs/promises").then((fs) => fs.writeFile(filePath, ""));

  try {
    const result = runBlue([
      "--ip",
      "127.0.0.1:1",
      "--skill",
      "missing",
      "--agent",
      "codex",
      "--path",
      filePath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /不是目录|fetch failed|ECONNREFUSED/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
