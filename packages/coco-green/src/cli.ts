#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import prompts from "prompts";

import { createApp } from "./create-server.js";
import { getLocalIP } from "./local-ip.js";
import { parseGreenArgs } from "./parse-args.js";
import { scanSkills } from "./scan-skills.js";

function printWelcome(): void {
  console.log("coco-green — 在局域网内通过 HTTP 共享本机的 Agent Skills。");
  console.log("对端可使用 coco-blue，并填写启动后显示的地址。\n");
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
  printWelcome();

  let args;
  try {
    args = parseGreenArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  let root: string;
  try {
    root = await resolveSkillRoot(args.path);
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

  let skills;
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

  const app = createApp(skills);
  const host = "0.0.0.0";
  const server = app.listen(args.port, host, () => {
    const ip = getLocalIP();
    console.log(`coco-green 已启动，监听 http://${host}:${String(args.port)}`);
    console.log(`请让对方使用：http://${ip}:${String(args.port)}`);
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
