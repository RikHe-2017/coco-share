/** Install location mode for coco-blue (mirrors select prompt values). */
export const InstallScopeId = {
  Global: "global",
  Custom: "custom",
} as const;

export type InstallScope = (typeof InstallScopeId)[keyof typeof InstallScopeId];

const INSTALL_SCOPE_ORDER = [
  InstallScopeId.Global,
  InstallScopeId.Custom,
] as const satisfies readonly InstallScope[];

const INSTALL_SCOPE_TITLE: Record<InstallScope, string> = {
  global: "全局（用户主目录下各 Agent 默认路径）",
  custom: "自定义根目录（各 Agent 子路径与全局一致，相对所选目录）",
};

export const INSTALL_SCOPE_PROMPT_CHOICES = INSTALL_SCOPE_ORDER.map((value) => ({
  title: INSTALL_SCOPE_TITLE[value],
  value,
}));

export function isInstallScope(value: string): value is InstallScope {
  for (const id of INSTALL_SCOPE_ORDER) {
    if (value === id) return true;
  }
  return false;
}

/** Conflict resolution when a destination path already exists (mirrors select prompt values). */
export const ConflictActionId = {
  Skip: "skip",
  Abort: "abort",
  Rename: "rename",
} as const;

export type ConflictAction = (typeof ConflictActionId)[keyof typeof ConflictActionId];

const CONFLICT_ACTION_ORDER = [
  ConflictActionId.Skip,
  ConflictActionId.Abort,
  ConflictActionId.Rename,
] as const satisfies readonly ConflictAction[];

const CONFLICT_ACTION_TITLE: Record<ConflictAction, string> = {
  skip: "跳过该目标",
  abort: "中止整个安装",
  rename: "改用其他文件夹名",
};

export const CONFLICT_ACTION_PROMPT_CHOICES = CONFLICT_ACTION_ORDER.map((value) => ({
  title: CONFLICT_ACTION_TITLE[value],
  value,
}));

export function isConflictAction(value: string): value is ConflictAction {
  for (const id of CONFLICT_ACTION_ORDER) {
    if (value === id) return true;
  }
  return false;
}
