import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { setTimeout } from "node:timers/promises";
import { test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const greenCli = path.join(repoRoot, "packages/coco-green/dist/cli.js");
const blueCli = path.join(repoRoot, "packages/coco-blue/dist/cli.js");

function runGreen(args) {
  return spawnSync(process.execPath, [greenCli, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  return address.port;
}

async function waitForOutput(proc, matcher) {
  let output = "";
  proc.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  proc.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (matcher(output)) return output;
    await setTimeout(50);
  }
  throw new Error(`Timed out waiting for process output.\n${output}`);
}

async function makeSkillRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "coco-green-test-"));
  const skillDir = path.join(root, "my-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    "# My Skill\n\nThis skill is used by tests.\n",
  );
  return root;
}

test("coco-green help exposes active-mode target options", () => {
  const result = runGreen(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /--install-path <路径>/);
  assert.match(result.stdout, /-a, --agent <agent>/);
  assert.match(result.stdout, /--skill、--agent 或 --install-path/);
});

test("coco-green rejects active-only options in passive mode", async () => {
  const skillRoot = await makeSkillRoot();
  try {
    const agent = runGreen(["--mode", "passive", "--agent", "codex", "--path", skillRoot]);
    assert.equal(agent.status, 1);
    assert.match(agent.stderr, /--agent 仅可用于主动模式/);

    const installPath = runGreen([
      "--mode",
      "passive",
      "--install-path",
      "global",
      "--path",
      skillRoot,
    ]);
    assert.equal(installPath.status, 1);
    assert.match(installPath.stderr, /--install-path 仅可用于主动模式/);
  } finally {
    await rm(skillRoot, { recursive: true, force: true });
  }
});

test("coco-green validates preset skill and agent lists", async () => {
  const skillRoot = await makeSkillRoot();
  try {
    const unknownAgent = runGreen([
      "--mode",
      "active",
      "--skill",
      "my-skill",
      "--agent",
      "unknown",
      "--install-path",
      "global",
      "--path",
      skillRoot,
    ]);
    assert.equal(unknownAgent.status, 1);
    assert.match(unknownAgent.stderr, /未知的 Agent：unknown/);

    const emptyAgent = runGreen([
      "--mode",
      "active",
      "--skill",
      "my-skill",
      "--agent",
      "codex,",
      "--install-path",
      "global",
      "--path",
      skillRoot,
    ]);
    assert.equal(emptyAgent.status, 1);
    assert.match(emptyAgent.stderr, /--agent 的值不能为空/);
  } finally {
    await rm(skillRoot, { recursive: true, force: true });
  }
});

test("coco-green generated command preserves shell-special install paths", async () => {
  const skillRoot = await makeSkillRoot();
  const port = await freePort();
  const installRoot = path.join(skillRoot, "install root with $HOME literal");
  const proc = spawn(process.execPath, [
    greenCli,
    "--skill",
    "my-skill",
    "--agent",
    "codex,cursor",
    "--install-path",
    installRoot,
    "--path",
    skillRoot,
    "--port",
    String(port),
  ]);

  try {
    const output = await waitForOutput(proc, (text) =>
      text.includes("npx @coco-share/coco-blue"),
    );
    const command = output
      .split("\n")
      .find((line) => line.startsWith("npx @coco-share/coco-blue"));
    assert.ok(command);
    assert.match(command, /--agent=codex --agent=cursor/);
    assert.match(command, /-p='.*\$HOME literal'/);

    const argCheck = spawnSync(
      "sh",
      [
        "-c",
        `node -e 'console.log(JSON.stringify(process.argv.slice(1)))' -- ${command.replace(
          "npx @coco-share/coco-blue ",
          "",
        )}`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(argCheck.status, 0);
    const args = JSON.parse(argCheck.stdout);
    assert.ok(args.includes(`-p=${installRoot}`));
  } finally {
    proc.kill();
    await rm(skillRoot, { recursive: true, force: true });
  }
});

test("coco-green and coco-blue install a selected skill end-to-end", async () => {
  const skillRoot = await makeSkillRoot();
  const installRoot = path.join(skillRoot, "install-target");
  const port = await freePort();
  const proc = spawn(process.execPath, [
    greenCli,
    "--skill",
    "my-skill",
    "--agent",
    "codex,cursor",
    "--install-path",
    installRoot,
    "--path",
    skillRoot,
    "--port",
    String(port),
  ]);

  try {
    await waitForOutput(proc, (text) => text.includes("npx @coco-share/coco-blue"));

    const blue = spawnSync(
      process.execPath,
      [
        blueCli,
        "--ip",
        `127.0.0.1:${String(port)}`,
        "--skill",
        "my-skill",
        "--agent",
        "codex,cursor",
        "--path",
        installRoot,
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.equal(blue.status, 0, `${blue.stdout}\n${blue.stderr}`);
    assert.equal(
      existsSync(path.join(installRoot, ".codex/skills/my-skill/SKILL.md")),
      true,
    );
    assert.equal(
      existsSync(path.join(installRoot, ".cursor/skills/my-skill/SKILL.md")),
      true,
    );
    assert.match(
      await readFile(path.join(installRoot, ".codex/skills/my-skill/SKILL.md"), "utf8"),
      /This skill is used by tests/,
    );
  } finally {
    proc.kill();
    await rm(skillRoot, { recursive: true, force: true });
  }
});
