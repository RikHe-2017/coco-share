#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import prompts from "prompts";

import { greenCli } from "./cli-config.js";
import { createApp } from "./create-server.js";
import { formatBlueInviteCliCommand } from "./format-invite-command.js";
import { getLocalIP } from "./local-ip.js";
import { readPackageVersion } from "./pkg-version.js";
import { PROMPTS_MULTISELECT_INSTRUCTIONS } from "./prompt-locale.js";
import type { SkillRecord } from "./scan-skills.js";
import { scanSkills } from "./scan-skills.js";

function printWelcome(): void {
  console.log("coco-green — 在局域网内通过 HTTP 共享本机的 Agent Skills。");
  console.log("对端可使用 coco-blue，并填写启动后显示的地址。\n");
}

async function promptShareMode(): Promise<"active" | "passive"> {
  const res = await prompts({
    type: "select",
    name: "mode",
    message: "选择分享模式（必填）",
    choices: [
      {
        title: "被动：对端自行浏览并选择技能",
        value: "passive",
      },
      {
        title:
          "主动：仅暴露你勾选的技能，并生成一条给对方在 PowerShell 等终端执行的安装命令",
        value: "active",
      },
    ],
    initial: 0,
  });

  const mode = res.mode as unknown as string | undefined;
  if (mode !== "active" && mode !== "passive") {
    throw new Error("已取消。");
  }
  return mode;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("提示返回值不符合预期。");
  }
  const out: string[] = [];
  for (const x of value) {
    if (typeof x !== "string") {
      throw new Error("提示返回值不符合预期。");
    }
    out.push(x);
  }
  return out;
}

function readCliStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return [];
    }
    out.push(item);
  }
  return out;
}

interface NormalizeCliStringListResult {
  readonly values: string[];
  readonly hadBlankToken: boolean;
}

function normalizeCliStringList(
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

type PresetSkills =
  | { readonly kind: "interactive" }
  | { readonly kind: "preset"; readonly names: string[] }
  | { readonly kind: "error"; readonly message: string };

function resolvePresetSkills(raw: readonly string[]): PresetSkills {
  if (raw.length === 0) {
    return { kind: "interactive" };
  }

  const n = normalizeCliStringList(raw);
  if (n.hadBlankToken || n.values.length === 0) {
    return { kind: "error", message: "--skill 的值不能为空。" };
  }

  return { kind: "preset", names: n.values };
}

async function promptActiveSkillNames(skills: SkillRecord[]): Promise<string[]> {
  const res = await prompts({
    type: "multiselect",
    name: "names",
    message: "主动模式：选择要暴露给对端的技能（仅这些会出现在列表与下载接口中）",
    choices: skills.map((s) => ({
      title: `${s.name} — ${s.description}`,
      value: s.name,
    })),
    hint: "- 空格切换选中，回车确认。",
    instructions: PROMPTS_MULTISELECT_INSTRUCTIONS,
  });

  if (res.names === undefined) {
    throw new Error("已取消。");
  }

  return asStringList(res.names as unknown);
}

async function resolveSkillRoot(cliPath?: string): Promise<string> {
  if (cliPath !== undefined && cliPath !== "") {
    return path.resolve(cliPath);
  }

  const defaultRoot = process.cwd();
  const res = await prompts({
    type: "text",
    name: "root",
    message: "Skills 根目录（绝对路径）",
    initial: defaultRoot,
  });

  const rootAnswer = res.root as unknown as string | undefined;
  if (rootAnswer === undefined) {
    throw new Error("已取消。");
  }

  const input = rootAnswer.trim();
  const picked = input === "" ? defaultRoot : input;
  return path.isAbsolute(picked) ? picked : path.resolve(picked);
}

async function main(): Promise<void> {
  const pkgVersion = readPackageVersion(import.meta.url);
  const parsed = greenCli.parse(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  const cli = parsed.values;
  if (cli.help) {
    console.log(
      greenCli.formatHelp({
        name: "coco-green",
        version: pkgVersion,
        description: "在局域网内通过 HTTP 共享本机的 Agent Skills（SKILL.md 技能包）。",
        usage: "coco-green [选项]",
        notes: [
          "主动模式启动后，会在控制台输出一条给接收方执行的 coco-blue 命令；推荐在 PowerShell / Windows Terminal 中复制执行（亦常见于 Git Bash 等环境）。",
          "提供 --skill 后将跳过主动模式下的技能选择；若未显式指定 --mode，则默认按主动模式分享这些技能。",
        ],
      }),
    );
    return;
  }

  if (cli.version) {
    console.log(pkgVersion);
    return;
  }

  printWelcome();

  const presetSkills = resolvePresetSkills(readCliStringList(cli.skill));
  if (presetSkills.kind === "error") {
    console.error(presetSkills.message);
    process.exitCode = 1;
    return;
  }

  let mode: "active" | "passive";
  if (cli.mode === undefined) {
    if (presetSkills.kind === "preset") {
      mode = "active";
    } else {
      try {
        mode = await promptShareMode();
      } catch (e) {
        console.error(e instanceof Error ? e.message : e);
        process.exitCode = 1;
        return;
      }
    }
  } else if (cli.mode === "active" || cli.mode === "passive") {
    mode = cli.mode;
  } else {
    console.error(`内部错误：非法 mode：${cli.mode}`);
    process.exitCode = 1;
    return;
  }

  if (mode === "passive" && presetSkills.kind === "preset") {
    console.error("--skill 仅可用于主动模式；请移除 --mode passive，或改用 --mode active。");
    process.exitCode = 1;
    return;
  }

  let root: string;
  try {
    root = await resolveSkillRoot(cli.path);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  const st = await fs.stat(root).catch(() => undefined);
  if (!st?.isDirectory()) {
    console.error(`不是目录：${root}`);
    process.exitCode = 1;
    return;
  }

  let skills: SkillRecord[];
  try {
    skills = await scanSkills(root);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (skills.length === 0) {
    console.warn("未找到技能（根目录下需存在含 SKILL.md 的子目录）。");
  }

  let served: SkillRecord[] = skills;
  if (mode === "active") {
    if (skills.length === 0) {
      console.error("主动模式需要至少 1 个技能，但当前目录下未扫描到技能。");
      process.exitCode = 1;
      return;
    }

    let pickedNames: string[];
    if (presetSkills.kind === "preset") {
      const scanned = new Set(skills.map((s) => s.name));
      for (const name of presetSkills.names) {
        if (!scanned.has(name)) {
          console.error(`未找到要分享的技能：${name}`);
          process.exitCode = 1;
          return;
        }
      }
      pickedNames = presetSkills.names;
    } else {
      try {
        pickedNames = await promptActiveSkillNames(skills);
      } catch (e) {
        console.error(e instanceof Error ? e.message : e);
        process.exitCode = 1;
        return;
      }
    }

    if (pickedNames.length === 0) {
      console.log("未选择技能，已退出。");
      return;
    }

    const order = new Set(pickedNames);
    served = skills.filter((s) => order.has(s.name));
  }

  const app = createApp(served);
  const host = "0.0.0.0";
  const server = app.listen(cli.port, host, () => {
    const ip = getLocalIP();
    console.log(`coco-green 已启动，监听 http://${host}:${String(cli.port)}`);

    const hostPort = `${ip}:${String(cli.port)}`;
    const cmd = formatBlueInviteCliCommand(
      mode === "active"
        ? { hostPort, skillNames: served.map((s) => s.name) }
        : { hostPort },
    );
    console.log("");
    console.log(
      "接收方可直接在 PowerShell / Terminal 中复制执行（推荐）；其他终端通常也兼容：",
    );
    console.log("");
    console.log(cmd);
    console.log("");
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
