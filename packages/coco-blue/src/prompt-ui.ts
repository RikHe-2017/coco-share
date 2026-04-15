import prompts from "prompts";

import { AGENT_IDS, isAgentId, type AgentId } from "./agents.js";
import { PROMPTS_MULTISELECT_INSTRUCTIONS } from "./prompt-locale.js";
import {
  CONFLICT_ACTION_PROMPT_CHOICES,
  INSTALL_SCOPE_PROMPT_CHOICES,
  type ConflictAction,
  type InstallScope,
} from "./prompt-kinds.js";

export type { ConflictAction } from "./prompt-kinds.js";

export interface RemoteSkill {
  name: string;
  description: string;
}

export async function promptServerHost(): Promise<string | undefined> {
  const res = await prompts({
    type: "text",
    name: "host",
    message: "coco-green 地址（例如 192.168.1.5:3001）",
  });
  const v = res.host as unknown as string | undefined;
  if (v === undefined) return undefined;
  return v;
}

export async function promptSkillNames(
  skills: RemoteSkill[],
): Promise<string[] | undefined> {
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
  const v = res.names as unknown as string[] | undefined;
  if (v === undefined) return undefined;
  return v;
}

export async function promptAgents(): Promise<AgentId[] | undefined> {
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
  const v = res.agents as unknown as string[] | undefined;
  if (v === undefined) return undefined;
  const out: AgentId[] = [];
  for (const raw of v) {
    if (!isAgentId(raw)) return undefined;
    out.push(raw);
  }
  return out;
}

export async function promptInstallScope(): Promise<InstallScope | undefined> {
  const res = await prompts({
    type: "select",
    name: "scope",
    message: "安装位置",
    choices: INSTALL_SCOPE_PROMPT_CHOICES,
    initial: 0,
  });
  const v = res.scope as unknown as InstallScope | undefined;
  if (v === undefined) return undefined;
  return v;
}

export async function promptCustomInstallRoot(
  initial: string,
): Promise<string | undefined> {
  const res = await prompts({
    type: "text",
    name: "root",
    message: "技能安装根目录（绝对路径；其下按各 Agent 与全局相同的相对路径写入）",
    initial,
  });
  const v = res.root as unknown as string | undefined;
  if (v === undefined) return undefined;
  return v;
}

export async function promptConflictAction(
  dest: string,
): Promise<ConflictAction | undefined> {
  const res = await prompts({
    type: "select",
    name: "action",
    message: `目标已存在（同名文件夹）。请选择处理方式，勿直接覆盖。\n${dest}`,
    choices: CONFLICT_ACTION_PROMPT_CHOICES,
    initial: 0,
  });
  const v = res.action as unknown as ConflictAction | undefined;
  if (v === undefined) return undefined;
  return v;
}

export async function promptRenameFolder(): Promise<string | undefined> {
  const res = await prompts({
    type: "text",
    name: "folderName",
    message: "新的文件夹名（与目标同级的目录名）",
    validate: (v: string) => (v.trim() === "" ? "必填" : true),
  });
  const v = res.folderName as unknown as string | undefined;
  if (v === undefined) return undefined;
  return v;
}
