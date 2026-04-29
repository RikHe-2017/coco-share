import os from "node:os";
import path from "node:path";

export type AgentId = "cursor" | "claudeCode" | "codex";

/** Canonical agent identifiers; keep in sync with {@link AgentId}. */
export const AGENT_IDS = ["cursor", "claudeCode", "codex"] as const satisfies readonly AgentId[];

export function isAgentId(value: string): value is AgentId {
  for (const id of AGENT_IDS) {
    if (value === id) return true;
  }
  return false;
}

/**
 * 某 Agent 的技能根目录，相对于 `baseDir`（全局安装时为用户主目录，自定义时为用户所选根目录）。
 */
export function agentSkillRoot(agent: AgentId, baseDir: string): string {
  switch (agent) {
    case "cursor": {
      return path.join(baseDir, ".cursor", "skills");
    }
    case "claudeCode": {
      return path.join(baseDir, ".claude", "skills");
    }
    case "codex": {
      return path.join(baseDir, ".codex", "skills");
    }
  }
}

export function globalAgentSkillRoot(agent: AgentId): string {
  return agentSkillRoot(agent, os.homedir());
}
