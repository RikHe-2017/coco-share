#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import prompts from "prompts";

import {
  AGENT_IDS,
  agentSkillRoot,
  isAgentId,
  type AgentId,
  globalAgentSkillRoot,
} from "./agents.js";
import { extractZipBufferToDir } from "./extract-zip.js";
import { pathExists } from "./fs-utils.js";
import { blueCli } from "./cli-config.js";
import { normalizeCliStringList } from "./cli-string-list.js";
import { normalizeBaseUrl } from "./normalize-base-url.js";
import { readPackageVersion } from "./pkg-version.js";
import { PROMPTS_MULTISELECT_INSTRUCTIONS } from "./prompt-locale.js";
import {
  CONFLICT_ACTION_PROMPT_CHOICES,
  ConflictActionId,
  INSTALL_SCOPE_PROMPT_CHOICES,
  InstallScopeId,
  type ConflictAction,
  type InstallScope,
  isInstallScope,
} from "./prompt-kinds.js";

interface RemoteSkill {
  name: string;
  description: string;
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

function asAgentIdList(value: unknown): AgentId[] {
  if (!Array.isArray(value)) {
    throw new Error("提示返回值不符合预期。");
  }
  const out: AgentId[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") {
      throw new Error("提示返回值不符合预期。");
    }
    if (!isAgentId(raw)) {
      throw new Error("提示返回值不符合预期。");
    }
    out.push(raw);
  }
  return out;
}

function asInstallScope(value: unknown): InstallScope {
  if (typeof value === "string" && isInstallScope(value)) {
    return value;
  }
  throw new Error("提示返回值不符合预期。");
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

type PresetAgents =
  | { readonly kind: "interactive" }
  | { readonly kind: "preset"; readonly agents: AgentId[] }
  | { readonly kind: "error"; readonly message: string };

function resolvePresetAgents(raw: readonly string[]): PresetAgents {
  if (raw.length === 0) {
    return { kind: "interactive" };
  }

  const n = normalizeCliStringList(raw);
  if (n.hadBlankToken || n.values.length === 0) {
    return { kind: "error", message: "--agent 的值不能为空。" };
  }

  const agents: AgentId[] = [];
  for (const id of n.values) {
    if (!isAgentId(id)) {
      return {
        kind: "error",
        message: `未知的 Agent：${id}（可选：${AGENT_IDS.join(", ")}）`,
      };
    }
    agents.push(id);
  }

  return { kind: "preset", agents };
}

function printWelcome(): void {
  console.log(
    "coco-blue — 从 coco-green 服务器下载并在本地安装 Agent Skills。",
  );
  console.log("请填写 coco-green 启动后显示的 http://IP:PORT 地址。\n");
}

async function promptServerBase(cliIp?: string): Promise<string> {
  if (cliIp !== undefined && cliIp.trim() !== "") {
    return normalizeBaseUrl(cliIp);
  }

  const res = await prompts({
    type: "text",
    name: "host",
    message: "coco-green 地址（例如 192.168.1.5:3001）",
  });

  const host = res.host as unknown as string | undefined;
  if (host === undefined) {
    throw new Error("已取消。");
  }

  return normalizeBaseUrl(host);
}

async function fetchSkillList(base: string): Promise<RemoteSkill[]> {
  const res = await fetch(new URL("/getAllSkills", base));
  if (!res.ok) {
    throw new Error(`getAllSkills 请求失败：HTTP ${String(res.status)}`);
  }
  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null || !("skills" in data)) {
    throw new Error("getAllSkills 返回数据格式异常。");
  }
  const skillsUnknown = (data as { skills: unknown }).skills;
  if (!Array.isArray(skillsUnknown)) {
    throw new Error("getAllSkills 返回数据格式异常。");
  }

  const skills: RemoteSkill[] = [];
  for (const item of skillsUnknown) {
    if (typeof item !== "object" || item === null) {
      throw new Error("技能条目格式异常。");
    }
    if (!("name" in item) || !("description" in item)) {
      throw new Error("技能条目格式异常。");
    }
    const name = (item as { name: unknown }).name;
    const description = (item as { description: unknown }).description;
    if (typeof name !== "string" || typeof description !== "string") {
      throw new Error("技能条目格式异常。");
    }
    skills.push({ name, description });
  }

  return skills;
}

async function downloadZip(base: string, nameList: string[]): Promise<Buffer> {
  const res = await fetch(new URL("/getSkillBySkillNames", base), {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ nameList }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `getSkillBySkillNames 请求失败：HTTP ${String(res.status)} ${text}`,
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

async function promptSkillSelection(skills: RemoteSkill[]): Promise<string[]> {
  const res = await prompts({
    type: "multiselect",
    name: "names",
    message: "选择要安装的技能",
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

async function promptAgentSelection(): Promise<AgentId[]> {
  const res = await prompts({
    type: "multiselect",
    name: "agents",
    message: "为哪些 Agent 安装？",
    choices: AGENT_IDS.map((id) => ({
      title: id,
      value: id,
    })),
    hint: "- 空格切换选中，回车确认。",
    instructions: PROMPTS_MULTISELECT_INSTRUCTIONS,
  });

  if (res.agents === undefined) {
    throw new Error("已取消。");
  }

  return asAgentIdList(res.agents as unknown);
}

async function promptInstallScope(): Promise<InstallScope> {
  const res = await prompts({
    type: "select",
    name: "scope",
    message: "安装位置",
    choices: INSTALL_SCOPE_PROMPT_CHOICES,
    initial: 0,
  });

  if (res.scope === undefined) {
    throw new Error("已取消。");
  }

  return asInstallScope(res.scope as unknown);
}

async function promptCustomRoot(cliPath?: string): Promise<string> {
  if (cliPath !== undefined && cliPath.trim() !== "") {
    return path.resolve(cliPath);
  }

  const initial = process.cwd();
  const res = await prompts({
    type: "text",
    name: "root",
    message: "技能安装根目录（绝对路径；其下按各 Agent 与全局相同的相对路径写入）",
    initial,
  });

  const rootAnswer = res.root as unknown as string | undefined;
  if (rootAnswer === undefined) {
    throw new Error("已取消。");
  }

  const input = rootAnswer.trim();
  const picked = input === "" ? initial : input;
  return path.isAbsolute(picked) ? picked : path.resolve(picked);
}

async function resolveConflict(
  dest: string,
): Promise<
  typeof ConflictActionId.Skip | typeof ConflictActionId.Abort | { kind: "copy"; dest: string }
> {
  const res = await prompts({
    type: "select",
    name: "action",
    message: `目标已存在（同名文件夹）。请选择处理方式，勿直接覆盖。\n${dest}`,
    choices: CONFLICT_ACTION_PROMPT_CHOICES,
    initial: 0,
  });

  const action = res.action as unknown as ConflictAction | undefined;
  if (action === undefined || action === ConflictActionId.Abort) {
    return ConflictActionId.Abort;
  }
  if (action === ConflictActionId.Skip) {
    return ConflictActionId.Skip;
  }

  const nameRes = await prompts({
    type: "text",
    name: "folderName",
    message: "新的文件夹名（与目标同级的目录名）",
    validate: (v: string) => (v.trim() === "" ? "必填" : true),
  });

  const folderAnswer = nameRes.folderName as unknown as string | undefined;
  if (folderAnswer === undefined) {
    return ConflictActionId.Abort;
  }

  const newName = folderAnswer.trim();
  const parent = path.dirname(dest);
  const newDest = path.join(parent, newName);

  if (newName === "." || newName === "..") {
    console.error("无效的文件夹名。");
    return ConflictActionId.Abort;
  }

  if (await pathExists(newDest)) {
    console.error(`该路径也已存在：${newDest}`);
    return ConflictActionId.Abort;
  }

  return { kind: "copy", dest: newDest };
}

async function copySkillTree(
  src: string,
  dest: string,
): Promise<"ok" | typeof ConflictActionId.Abort> {
  let target = dest;
  if (await pathExists(target)) {
    const decision = await resolveConflict(target);
    if (decision === ConflictActionId.Abort) {
      return ConflictActionId.Abort;
    }
    if (decision === ConflictActionId.Skip) {
      return "ok";
    }
    target = decision.dest;
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(src, target, { recursive: true });
  return "ok";
}

async function main(): Promise<void> {
  const pkgVersion = readPackageVersion(import.meta.url);
  const parsed = blueCli.parse(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  const cli = parsed.values;
  if (cli.help) {
    console.log(
      blueCli.formatHelp({
        name: "coco-blue",
        version: pkgVersion,
        description: "从 coco-green 服务器下载并在本地安装 Agent Skills。",
        usage: "coco-blue [选项]",
        notes: [
          "若你收到来自 coco-green 主动模式生成的命令，推荐在 PowerShell / Windows Terminal 中粘贴执行。",
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

  const presetSkills = resolvePresetSkills(cli.skill);
  if (presetSkills.kind === "error") {
    console.error(presetSkills.message);
    process.exitCode = 1;
    return;
  }

  const presetAgents = resolvePresetAgents(cli.agent);
  if (presetAgents.kind === "error") {
    console.error(presetAgents.message);
    process.exitCode = 1;
    return;
  }

  let base: string;
  try {
    base = await promptServerBase(cli.ip);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  let skills: RemoteSkill[];
  try {
    skills = await fetchSkillList(base);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (skills.length === 0) {
    console.log("服务器未返回任何技能。");
    return;
  }

  let selectedNames: string[];
  if (presetSkills.kind === "preset") {
    const remote = new Set(skills.map((s) => s.name));
    for (const name of presetSkills.names) {
      if (!remote.has(name)) {
        console.error(`服务器未提供技能：${name}`);
        process.exitCode = 1;
        return;
      }
    }
    selectedNames = presetSkills.names;
  } else {
    try {
      selectedNames = await promptSkillSelection(skills);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
      return;
    }

    if (selectedNames.length === 0) {
      console.log("未选择技能，已退出。");
      return;
    }
  }

  let agents: AgentId[];
  if (presetAgents.kind === "preset") {
    agents = presetAgents.agents;
  } else {
    try {
      agents = await promptAgentSelection();
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
      return;
    }

    if (agents.length === 0) {
      console.log("未选择 Agent，已退出。");
      return;
    }
  }

  let scope: InstallScope;
  try {
    scope = await promptInstallScope();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (scope === InstallScopeId.Custom && agents.length > 0) {
    console.log(
      "自定义根目录：将在所选目录下为每个已选 Agent 创建与全局一致的子路径（如 .cursor/skills-cursor等）。\n",
    );
  }

  let zip: Buffer;
  try {
    zip = await downloadZip(base, selectedNames);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "coco-blue-"));

  try {
    await extractZipBufferToDir(zip, tmpRoot);

    if (scope === InstallScopeId.Custom) {
      let customRoot: string;
      try {
        customRoot = await promptCustomRoot(cli.path);
      } catch (e) {
        console.error(e instanceof Error ? e.message : e);
        process.exitCode = 1;
        return;
      }

      const st = await fs.stat(customRoot).catch(() => undefined);
      if (!st?.isDirectory()) {
        console.error(`不是目录：${customRoot}`);
        process.exitCode = 1;
        return;
      }

      for (const agent of agents) {
        const rootDir = agentSkillRoot(agent, customRoot);
        await fs.mkdir(rootDir, { recursive: true });

        for (const name of selectedNames) {
          const src = path.join(tmpRoot, name);
          if (!(await pathExists(src))) {
            console.warn(`压缩包中缺失：${name}`);
            continue;
          }
          const dest = path.join(rootDir, name);
          const r = await copySkillTree(src, dest);
          if (r === ConflictActionId.Abort) {
            console.error("已中止。");
            process.exitCode = 1;
            return;
          }
        }

        console.log(`${agent}: ${rootDir}`);
      }

      console.log(`安装根目录：${customRoot}`);
      return;
    }

    for (const agent of agents) {
      const rootDir = globalAgentSkillRoot(agent);
      await fs.mkdir(rootDir, { recursive: true });

      for (const name of selectedNames) {
        const src = path.join(tmpRoot, name);
        if (!(await pathExists(src))) {
          console.warn(`压缩包中缺失：${name}`);
          continue;
        }
        const dest = path.join(rootDir, name);
        const r = await copySkillTree(src, dest);
        if (r === ConflictActionId.Abort) {
          console.error("已中止。");
          process.exitCode = 1;
          return;
        }
      }

      console.log(`${agent}: ${rootDir}`);
    }

    console.log("完成。");
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}

void main();
